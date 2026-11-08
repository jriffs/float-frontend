// src/lib/create-group/create-flow.svelte.ts
// State machine for S4: form → pending → invite (or error). UI-complete mock:
// no on-chain client; delays simulate wallet approve + create + invite setup.
import { PublicKey } from '@solana/web3.js';
import { createGroup } from '#lib/program/client.ts';
import { mapProgramError, FloatProgramError } from '#lib/program/errors.ts';
import type { BaseMessageSignerWalletAdapter } from '@solana/wallet-adapter-base';

export type CreateStep = 'form' | 'pending' | 'invite' | 'error';

export type PendingPhase =
	| 'details'
	| 'approve'
	| 'creating'
	| 'invite-setup';

export type CreateErrorReason =
	| 'name-taken'
	| 'no-sol'
	| 'declined'
	| 'network'
	| 'setup-incomplete';

export interface CreatedGroup {
	pubkey: string;       // group PDA base58
	name: string;
	creator: string;      // your wallet base58
	poolEnabled: boolean;
	signature?: string;
}

const NAME_MAX = 32;

/** Demo hooks: type these exact names to force an error path without chain. */
const DEMO_NAME_TAKEN = 'taken';
const DEMO_NO_SOL = 'nosol';
const DEMO_NETWORK = 'fail';

function mockPubkey(name: string): string {
	// Deterministic-ish fake pubkey so the invite link is stable for a given name in a session.
	const seed = Array.from(name).reduce((a, c) => a + c.charCodeAt(0), 0);
	const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
	let out = '';
	let n = seed * 2654435761;
	for (let i = 0; i < 44; i++) {
		n = (n * 1664525 + 1013904223) >>> 0;
		out += alphabet[n % alphabet.length]!;
	}
	return out;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		if (signal?.aborted) {
			reject(new DOMException('Aborted', 'AbortError'));
			return;
		}
		const t = setTimeout(resolve, ms);
		signal?.addEventListener(
			'abort',
			() => {
				clearTimeout(t);
				reject(new DOMException('Aborted', 'AbortError'));
			},
			{ once: true }
		);
	});
}

export class CreateFlow {
	step = $state<CreateStep>('form');
	name = $state('');
	poolEnabled = $state(false);
	poolHelpOpen = $state(false);

	pendingPhase = $state<PendingPhase>('details');
	errorReason = $state<CreateErrorReason | null>(null);
	created = $state<CreatedGroup | null>(null);

	adapter: BaseMessageSignerWalletAdapter | null = null;

	/** True while the mock create sequence is running. */
	busy = $state(false);

	#abort: AbortController | null = null;

	readonly nameMax = NAME_MAX;

	get trimmedName(): string {
		return this.name.trim();
	}

	get nameCount(): number {
		return this.name.length;
	}

	get nameOverLimit(): boolean {
		return this.name.length > NAME_MAX;
	}

	get nameError(): string | null {
		if (this.nameOverLimit) return 'Names can be 32 characters at most';
		if (this.errorReason === 'name-taken' && this.step === 'form') {
			return 'You already have a group with this name';
		}
		return null;
	}

	get canSubmit(): boolean {
		const t = this.trimmedName;
		return t.length >= 1 && t.length <= NAME_MAX && !this.busy;
	}

	setName(value: string): void {
		this.name = value;
		// Clear inline name-taken when the user edits.
		if (this.errorReason === 'name-taken') this.errorReason = null;
	}

	togglePool(): void {
		this.poolEnabled = !this.poolEnabled;
		if (this.poolEnabled) this.poolHelpOpen = true;
	}

	togglePoolHelp(): void {
		this.poolHelpOpen = !this.poolHelpOpen;
	}

	setAdapter(a: BaseMessageSignerWalletAdapter | null) {
		this.adapter = a;
	}

	/** Start create: validate, then run the mock pending sequence. */
	async submit() {
		if (!this.canSubmit) return;

		// keep your demo name shortcuts if you want, or delete them

		const ad = this.adapter;
		if (!ad?.publicKey) {
			this.errorReason = 'network'; // or a dedicated 'no-wallet'
			this.step = 'error';
			return;
		}

		this.#abort?.abort();
		this.#abort = new AbortController();
		// optional: still listen for cancel → declined

		this.busy = true;
		this.errorReason = null;
		this.created = null;
		this.pendingPhase = 'details';
		this.step = 'pending';

		try {
			this.pendingPhase = 'approve';

			const { signature, group } = await createGroup({
				adapter: ad,
				name: this.trimmedName
				// settlementMint omitted → Devnet USDC from constants
			});

			this.pendingPhase = 'creating'; // or jump straight after confirm
			// tx is already confirmed inside createGroup

			this.pendingPhase = 'invite-setup';

			this.created = {
				pubkey: group.toBase58(),
				name: this.trimmedName,
				creator: ad.publicKey.toBase58(),
				poolEnabled: false, // on-chain default until enable_pool
				signature
			};
			this.step = 'invite';
		} catch (e) {
			if (e instanceof DOMException && e.name === 'AbortError') {
				this.errorReason = 'declined';
			} else {
				const err = mapProgramError(e);
				if (err.message.includes('declined') || err.message.includes('Rejected')) {
					this.errorReason = 'declined';
				} else if (err.message.includes('SOL') || err.message.includes('Insufficient')) {
					this.errorReason = 'no-sol';
				} else if (err.code === 6000) {
					// name too long — should be blocked in UI already
					this.errorReason = 'network';
				} else {
					// name collision often surfaces as failed tx / account in use
					this.errorReason = 'network'; // or 'name-taken' if you detect it
				}
			}
			this.step = 'error';
		} finally {
			this.busy = false;
		}
	}

	/** Cancel while on the pending screen. */
	cancelPending(): void {
		this.#abort?.abort();
		this.#abort = null;
		this.busy = false;
		this.errorReason = 'declined';
		this.step = 'error';
	}

	/** From declined / network: try the same details again. */
	retry(): void {
		this.errorReason = null;
		void this.submit();
	}

	/** From declined / name-taken: return to form with fields intact. */
	backToForm(): void {
		this.#abort?.abort();
		this.#abort = null;
		this.busy = false;
		this.errorReason = this.errorReason === 'name-taken' ? 'name-taken' : null;
		this.pendingPhase = 'details';
		this.step = 'form';
	}

	/**
	 * Simulate "created on-chain but membership mirror failed".
	 * Exposed for completeness; not auto-triggered in the happy mock path.
	 */
	showSetupIncomplete(group: CreatedGroup): void {
		this.created = group;
		this.errorReason = 'setup-incomplete';
		this.step = 'error';
	}

	retrySetup(): void {
		// Mock: setup always "succeeds" on retry.
		if (this.created) {
			this.errorReason = null;
			this.step = 'invite';
		} else {
			this.backToForm();
		}
	}

	inviteUrl(origin: string): string {
		if (!this.created) return '';
		const q = new URLSearchParams({
			creator: this.created.creator,
			name: this.created.name
		});
		// optional: q.set('g', this.created.pubkey);
		return `${origin}/groups/join?${q.toString()}`;
	}
	
	shortInvitePath(): string {
		const pk = this.created?.pubkey;
		if (!pk) return '';
		const short = `${pk.slice(0, 4)}…${pk.slice(-2)}`;
		return `float.app/join/${short}`;
	}
}
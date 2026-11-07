// src/lib/create-group/create-flow.svelte.ts
// State machine for S4: form → pending → invite (or error). UI-complete mock:
// no on-chain client; delays simulate wallet approve + create + invite setup.

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
	/** Mock base58-looking PDA for invite links and navigation. */
	pubkey: string;
	name: string;
	poolEnabled: boolean;
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

	/** Start create: validate, then run the mock pending sequence. */
	async submit(): Promise<void> {
		if (!this.canSubmit) return;

		const trimmed = this.trimmedName;
		const key = trimmed.toLowerCase();

		// Demo error shortcuts (exact names, case-insensitive).
		if (key === DEMO_NAME_TAKEN) {
			this.errorReason = 'name-taken';
			this.step = 'form';
			return;
		}
		if (key === DEMO_NO_SOL) {
			this.errorReason = 'no-sol';
			this.step = 'error';
			return;
		}
		if (key === DEMO_NETWORK) {
			this.errorReason = 'network';
			this.step = 'error';
			return;
		}

		this.#abort?.abort();
		this.#abort = new AbortController();
		const { signal } = this.#abort;

		this.busy = true;
		this.errorReason = null;
		this.created = null;
		this.pendingPhase = 'details';
		this.step = 'pending';

		try {
			await sleep(450, signal);
			this.pendingPhase = 'approve';
			await sleep(1400, signal);
			this.pendingPhase = 'creating';
			await sleep(1100, signal);
			this.pendingPhase = 'invite-setup';
			await sleep(700, signal);

			this.created = {
				pubkey: mockPubkey(trimmed),
				name: trimmed,
				poolEnabled: this.poolEnabled
			};
			this.step = 'invite';
		} catch (e) {
			if (e instanceof DOMException && e.name === 'AbortError') {
				// User cancelled → declined (details kept on form).
				this.errorReason = 'declined';
				this.step = 'error';
			} else {
				this.errorReason = 'network';
				this.step = 'error';
			}
		} finally {
			this.busy = false;
			this.#abort = null;
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
		const pk = this.created?.pubkey;
		if (!pk) return '';
		// Path matches the existing /groups/join route stub.
		return `${origin}/groups/join?g=${pk}`;
	}

	shortInvitePath(): string {
		const pk = this.created?.pubkey;
		if (!pk) return '';
		const short = `${pk.slice(0, 4)}…${pk.slice(-2)}`;
		return `float.app/join/${short}`;
	}
}
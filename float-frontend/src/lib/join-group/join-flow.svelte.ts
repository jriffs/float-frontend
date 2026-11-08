// src/lib/join-group/join-flow.svelte.ts
// State machine for S5: gate → preview → pending → done (or error).
// UI-complete mock: no on-chain client; delays simulate wallet approve + join.

import type { BaseMessageSignerWalletAdapter } from "@solana/wallet-adapter-base";

export type JoinStep = 'boot' | 'gate' | 'preview' | 'pending' | 'done' | 'error';

export type PendingPhase =
	| 'details'
	| 'approve'
	| 'joining'
	| 'setup';

export type JoinErrorReason =
	| 'invalid-link'
	| 'closed'
	| 'already-member'
	| 'declined'
	| 'network'
	| 'no-sol';

export interface JoinMember {
	wallet: string;
	displayName: string;
	/** Creator of the group. */
	role?: 'creator' | 'member';
	/** True for the signed-in wallet in the member list. */
	isYou?: boolean;
}

export interface JoinPreview {
	pubkey: string;
	name: string;
	creator: string;
	creatorName: string;
	memberCount: number;
	poolEnabled: boolean;
	members: {
		wallet: string;
		displayName: string;
		role?: 'creator' | 'member';
		isYou?: boolean;
	}[];
}

/** Demo query values for ?g= to force error paths offline. */
const DEMO = {
	CLOSED: 'closed',
	MEMBER: 'member',
	NOSOL: 'nosol',
	FAIL: 'fail',
	INVALID: 'bad'
} as const;

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


function shortAddr(pk: string): string {
	return `${pk.slice(0, 4)}…${pk.slice(-4)}`;
}

export class JoinFlow {
	step = $state<JoinStep>('boot');
	pendingPhase = $state<PendingPhase>('details');
	errorReason = $state<JoinErrorReason | null>(null);
	preview = $state<JoinPreview | null>(null);
	busy = $state(false);

	creatorParam = $state<string | null>(null);
	nameParam = $state<string | null>(null);
	adapter: BaseMessageSignerWalletAdapter | null = null;

	/** Wallet address when connected; null on the gate. */
	walletAddress = $state<string | null>(null);

	#abort: AbortController | null = null;
	#rawParam: string | null = null;

	/**
	 * Call once on mount with the `g` query param and current wallet (if any).
	 * Resolves gate vs preview vs error without chain calls.
	 */
	async bootstrap(opts: {
		creator: string | null;
		name: string | null;
		groupPubkeyHint?: string | null;
		wallet: string | null;
	}): Promise<void> {
		this.walletAddress = opts.wallet;
		this.creatorParam = opts.creator?.trim() || null;
		this.nameParam = opts.name?.trim() || null;
		this.errorReason = null;
		this.preview = null;
		this.step = 'boot';

		if (!this.creatorParam || !this.nameParam) {
			this.errorReason = 'invalid-link';
			this.step = 'error';
			return;
		}

		let creatorPk: import('@solana/web3.js').PublicKey;
		try {
			const { PublicKey } = await import('@solana/web3.js');
			creatorPk = new PublicKey(this.creatorParam);
		} catch {
			this.errorReason = 'invalid-link';
			this.step = 'error';
			return;
		}

		try {
			const { groupPda, fetchGroup, fetchGroupMembers } = await import('#lib/program/client.ts');

			const groupPk = groupPda(creatorPk, this.nameParam);

			if (opts.groupPubkeyHint) {
				try {
					const { PublicKey } = await import('@solana/web3.js');
					const hint = new PublicKey(opts.groupPubkeyHint);
					if (hint.toBase58() !== groupPk.toBase58()) {
						this.errorReason = 'invalid-link';
						this.step = 'error';
						return;
					}
				} catch {
					this.errorReason = 'invalid-link';
					this.step = 'error';
					return;
				}
			}

			const g = await fetchGroup(groupPk);
			if (!g) {
				this.errorReason = 'invalid-link';
				this.step = 'error';
				return;
			}

			const balances = await fetchGroupMembers(groupPk);

			const preview = {
				pubkey: groupPk.toBase58(),
				name: g.name || this.nameParam,
				creator: g.creator.toBase58(),
				creatorName: shortAddr(g.creator.toBase58()),
				memberCount: g.memberCount,
				poolEnabled: g.poolEnabled,
				members: balances.map((m) => ({
					wallet: m.member.toBase58(),
					displayName: shortAddr(m.member.toBase58()),
					role: (m.member.equals(g.creator) ? 'creator' : 'member') as 'creator' | 'member'
				}))
			};

			// Closed / not active
			if (g.status !== 0) {
				this.preview = preview;
				this.errorReason = 'closed';
				this.step = 'error';
				return;
			}

			// Already a member
			if (opts.wallet) {
				const already = balances.some((m) => m.member.toBase58() === opts.wallet);
				if (already) {
					this.preview = preview;
					this.errorReason = 'already-member';
					this.step = 'error';
					return;
				}
			}

			this.preview = preview;
			this.step = opts.wallet ? 'preview' : 'gate';
		} catch (e) {
			console.error(e);
			this.errorReason = 'network';
			this.step = 'error';
		}
	}

	setAdapter(a: BaseMessageSignerWalletAdapter | null) {
		this.adapter = a;
	}

	/** After wallet connects on the gate, move to preview (or re-check demo errors). */
	onWalletConnected(address: string): void {
		this.walletAddress = address;
		if (this.step === 'gate' && this.preview) {
			this.step = 'preview';
		}
	}

	/** Start join: mock pending sequence. */
	async submit() {
		if (!this.preview || this.busy) return;
		if (!this.creatorParam || !this.nameParam) {
			this.errorReason = 'invalid-link';
			this.step = 'error';
			return;
		}

		const ad = this.adapter;
		if (!ad?.publicKey) {
			this.step = 'gate';
			return;
		}

		this.busy = true;
		this.errorReason = null;
		this.pendingPhase = 'details';
		this.step = 'pending';

		try {
			this.pendingPhase = 'approve';

			const { joinGroup } = await import('#lib/program/client.ts');
			const { PublicKey } = await import('@solana/web3.js');

			await joinGroup({
				adapter: ad,
				creator: new PublicKey(this.creatorParam),
				name: this.nameParam
			});

			this.pendingPhase = 'joining';
			this.pendingPhase = 'setup';
			this.step = 'done';
		} catch (e) {
			const { mapProgramError } = await import('#lib/program/errors.ts');
			const err = mapProgramError(e);
			const msg = err.message.toLowerCase();

			if (msg.includes('declined') || msg.includes('reject')) {
				this.errorReason = 'declined';
			} else if (err.code === 6010 || msg.includes('already')) {
				this.errorReason = 'already-member';
			} else if (err.code === 6001 || err.code === 6002) {
				this.errorReason = 'closed';
			} else if (msg.includes('sol') || msg.includes('insufficient funds')) {
				this.errorReason = 'no-sol';
			} else {
				this.errorReason = 'network';
			}
			this.step = 'error';
		} finally {
			this.busy = false;
		}
	}

	cancelPending(): void {
		this.#abort?.abort();
		this.#abort = null;
		this.busy = false;
		this.errorReason = 'declined';
		this.step = 'error';
	}

	retry(): void {
		this.errorReason = null;
		if (this.walletAddress) {
			void this.submit();
		} else {
			this.step = 'gate';
		}
	}

	backToPreview(): void {
		this.#abort?.abort();
		this.#abort = null;
		this.busy = false;
		this.errorReason = null;
		this.pendingPhase = 'details';
		this.step = this.walletAddress ? 'preview' : 'gate';
	}

	/** Members list with "You" appended when connected (preview/pending). */
	membersForUi(): JoinMember[] {
		const base = this.preview?.members ?? [];
		if (!this.walletAddress) return base;
		return [
			...base,
			{
				wallet: this.walletAddress,
				displayName: 'You',
				isYou: true
			}
		];
	}
}
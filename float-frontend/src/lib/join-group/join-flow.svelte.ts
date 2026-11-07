// src/lib/join-group/join-flow.svelte.ts
// State machine for S5: gate → preview → pending → done (or error).
// UI-complete mock: no on-chain client; delays simulate wallet approve + join.

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
	creatorName: string;
	memberCount: number;
	poolEnabled: boolean;
	members: JoinMember[];
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

function mockPreview(pubkey: string): JoinPreview {
	// Stable mock for any real-looking pubkey.
	return {
		pubkey,
		name: 'Cape Town 2026',
		creatorName: 'Kofi',
		memberCount: 4,
		poolEnabled: true,
		members: [
			{ wallet: 'Kofi111', displayName: 'Kofi', role: 'creator' },
			{ wallet: 'Lena222', displayName: 'Lena' },
			{ wallet: 'Dev333', displayName: 'Dev' },
			{ wallet: 'Tunde44', displayName: 'Tunde' }
		]
	};
}

export class JoinFlow {
	step = $state<JoinStep>('boot');
	pendingPhase = $state<PendingPhase>('details');
	errorReason = $state<JoinErrorReason | null>(null);
	preview = $state<JoinPreview | null>(null);
	busy = $state(false);

	/** Wallet address when connected; null on the gate. */
	walletAddress = $state<string | null>(null);

	#abort: AbortController | null = null;
	#rawParam: string | null = null;

	/**
	 * Call once on mount with the `g` query param and current wallet (if any).
	 * Resolves gate vs preview vs error without chain calls.
	 */
	bootstrap(groupParam: string | null, wallet: string | null): void {
		this.#rawParam = groupParam?.trim() || null;
		this.walletAddress = wallet;

		if (!this.#rawParam) {
			this.errorReason = 'invalid-link';
			this.step = 'error';
			return;
		}

		const key = this.#rawParam.toLowerCase();

		if (key === DEMO.INVALID || key === 'bad' || key.length < 3) {
			this.errorReason = 'invalid-link';
			this.step = 'error';
			return;
		}
		if (key === DEMO.CLOSED) {
			this.preview = mockPreview(this.#rawParam);
			this.errorReason = 'closed';
			this.step = 'error';
			return;
		}
		if (key === DEMO.MEMBER) {
			this.preview = mockPreview(this.#rawParam);
			this.errorReason = 'already-member';
			this.step = 'error';
			return;
		}

		this.preview = mockPreview(this.#rawParam);
		this.errorReason = null;
		this.step = wallet ? 'preview' : 'gate';
	}

	/** After wallet connects on the gate, move to preview (or re-check demo errors). */
	onWalletConnected(address: string): void {
		this.walletAddress = address;
		if (this.step === 'gate' && this.preview) {
			this.step = 'preview';
		}
	}

	/** Start join: mock pending sequence. */
	async submit(): Promise<void> {
		if (!this.preview || this.busy) return;

		const key = (this.#rawParam ?? '').toLowerCase();
		if (key === DEMO.NOSOL) {
			this.errorReason = 'no-sol';
			this.step = 'error';
			return;
		}
		if (key === DEMO.FAIL) {
			this.errorReason = 'network';
			this.step = 'error';
			return;
		}

		this.#abort?.abort();
		this.#abort = new AbortController();
		const { signal } = this.#abort;

		this.busy = true;
		this.errorReason = null;
		this.pendingPhase = 'details';
		this.step = 'pending';

		try {
			await sleep(400, signal);
			this.pendingPhase = 'approve';
			await sleep(1300, signal);
			this.pendingPhase = 'joining';
			await sleep(1000, signal);
			this.pendingPhase = 'setup';
			await sleep(600, signal);
			this.step = 'done';
		} catch (e) {
			if (e instanceof DOMException && e.name === 'AbortError') {
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
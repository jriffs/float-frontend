// src/lib/settle/settle-flow.svelte.ts
// Screen 8: list → confirm (full | partial) → pending → done | error
// UI-complete mock: timed wallet approve; no on-chain transfer yet.

export type SettleStep =
	| 'list'
	| 'confirm'
	| 'pending'
	| 'done'
	| 'error';

export type PendingPhase =
	| 'details'
	| 'approve'
	| 'sending'
	| 'updating';

export type SettleErrorReason =
	| 'declined'
	| 'network'
	| 'no-sol'
	| 'no-usdc'
	| 'amount-changed'
	| 'needs-ata';

export interface SettlePeer {
	wallet: string;
	displayName: string;
	/**
	 * Net vs you in USDC minor units (6 decimals).
	 * Positive = they owe you (nudge).
	 * Negative = you owe them (pay).
	 */
	netVsYou: number;
}

export interface SettleGroup {
	pubkey: string;
	name: string;
	memberCount: number;
	myBalance: number;
	owedToYou: number;
	youOwe: number;
	peers: SettlePeer[];
}

const USDC_SCALE = 1_000_000;

export function majorToMinor(major: number): number {
	return Math.round(major * USDC_SCALE);
}

export function minorToMajor(minor: number): number {
	return minor / USDC_SCALE;
}

export function formatMajor(minor: number): string {
	return minorToMajor(Math.abs(minor)).toLocaleString('en-US', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});
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

/** Demo group matching S6 / S8 mocks. */
export function mockSettleGroup(pubkey: string): SettleGroup {
	return {
		pubkey,
		name: 'Cape Town 2026',
		memberCount: 5,
		myBalance: 42_500_000,
		owedToYou: 49_000_000,
		youOwe: 6_500_000,
		peers: [
			{ wallet: 'Dev44444', displayName: 'Dev', netVsYou: -6_500_000 },
			{ wallet: 'Kofi2222', displayName: 'Kofi', netVsYou: 18_000_000 },
			{ wallet: 'Lena3333', displayName: 'Lena', netVsYou: 31_000_000 }
		]
	};
}

export class SettleFlow {
	step = $state<SettleStep>('list');
	pendingPhase = $state<PendingPhase>('details');
	errorReason = $state<SettleErrorReason | null>(null);
	busy = $state(false);

	group = $state<SettleGroup | null>(null);

	/** Peer you are paying (you owe them). */
	peer = $state<SettlePeer | null>(null);

	/** Full debt owed to this peer (positive minor units). */
	debtMinor = $state(0);

	/** Amount the user chose to pay (positive minor units). */
	payMinor = $state(0);

	/** Raw input for partial amount (major units string). */
	partialInput = $state('');

	/** Mock wallet USDC balance for "not enough USDC" demos. */
	walletUsdcMinor = $state(38_200_000);

	/** After a successful (possibly partial) payment. */
	paidMinor = $state(0);
	remainingMinor = $state(0);

	/** Show one-time ATA setup fee note on confirm. */
	needsAtaSetup = $state(false);

	partialMode = $state(false);

	#abort: AbortController | null = null;

	init(pubkey: string): void {
		this.group = mockSettleGroup(pubkey);
		this.step = 'list';
		this.errorReason = null;
		this.peer = null;
		this.partialMode = false;
	}

	get youOwePeers(): SettlePeer[] {
		return (this.group?.peers ?? []).filter((p) => p.netVsYou < 0);
	}

	get owedToYouPeers(): SettlePeer[] {
		return (this.group?.peers ?? []).filter((p) => p.netVsYou > 0);
	}

	/** Open full-amount confirm for a peer you owe. */
	openPay(peer: SettlePeer): void {
		const debt = Math.abs(peer.netVsYou);
		this.peer = peer;
		this.debtMinor = debt;
		this.payMinor = debt;
		this.partialInput = '';
		this.partialMode = false;
		this.needsAtaSetup = peer.displayName.toLowerCase() === 'ata'; // demo: name "ata"
		this.errorReason = null;
		this.step = 'confirm';
	}

	openPartial(): void {
		this.partialMode = true;
		const half = Math.floor(this.debtMinor / 2);
		this.payMinor = half;
		this.partialInput = minorToMajor(half).toFixed(2);
	}

	setPartialFromInput(raw: string): void {
		this.partialInput = raw;
		const n = Number.parseFloat(raw.replace(/,/g, ''));
		if (!Number.isFinite(n) || n <= 0) {
			this.payMinor = 0;
			return;
		}
		const minor = majorToMinor(n);
		this.payMinor = Math.min(minor, this.debtMinor);
	}

	setHalf(): void {
		const half = Math.floor(this.debtMinor / 2);
		this.payMinor = half;
		this.partialInput = minorToMajor(half).toFixed(2);
	}

	setFull(): void {
		this.payMinor = this.debtMinor;
		this.partialInput = minorToMajor(this.debtMinor).toFixed(2);
		this.partialMode = false;
	}

	get stillOwedAfter(): number {
		return Math.max(0, this.debtMinor - this.payMinor);
	}

	get walletAfter(): number {
		return this.walletUsdcMinor - this.payMinor;
	}

	get canPay(): boolean {
		return (
			!!this.peer &&
			this.payMinor > 0 &&
			this.payMinor <= this.debtMinor &&
			this.payMinor <= this.walletUsdcMinor &&
			!this.busy
		);
	}

	backToList(): void {
		this.#abort?.abort();
		this.#abort = null;
		this.busy = false;
		this.peer = null;
		this.partialMode = false;
		this.errorReason = null;
		this.step = 'list';
	}

	backToConfirm(): void {
		this.#abort?.abort();
		this.#abort = null;
		this.busy = false;
		this.errorReason = null;
		this.step = 'confirm';
	}

	acknowledgeAta(): void {
		this.needsAtaSetup = false;
	}

	async submit(): Promise<void> {
		if (!this.canPay || !this.peer) return;

		// Demo hooks via peer display name
		const key = this.peer.displayName.toLowerCase();
		if (key === 'nosol') {
			this.errorReason = 'no-sol';
			this.step = 'error';
			return;
		}
		if (key === 'broke' || this.payMinor > this.walletUsdcMinor) {
			this.errorReason = 'no-usdc';
			this.step = 'error';
			return;
		}
		if (key === 'changed') {
			this.errorReason = 'amount-changed';
			// Simulate debt update
			this.debtMinor = majorToMinor(8.25);
			this.payMinor = this.debtMinor;
			this.step = 'error';
			return;
		}
		if (key === 'fail') {
			this.errorReason = 'network';
			this.step = 'error';
			return;
		}
		if (this.needsAtaSetup) {
			this.errorReason = 'needs-ata';
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
			await sleep(1200, signal);
			this.pendingPhase = 'sending';
			await sleep(1000, signal);
			this.pendingPhase = 'updating';
			await sleep(500, signal);

			this.paidMinor = this.payMinor;
			this.remainingMinor = this.stillOwedAfter;
			this.walletUsdcMinor -= this.payMinor;

			// Update local peer balance for list refresh
			if (this.group && this.peer) {
				const next = this.peer.netVsYou + this.payMinor; // was negative
				this.group = {
					...this.group,
					peers: this.group.peers.map((p) =>
						p.wallet === this.peer!.wallet ? { ...p, netVsYou: next } : p
					),
					youOwe: Math.max(0, this.group.youOwe - this.payMinor),
					myBalance: this.group.myBalance + this.payMinor
				};
			}

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
		void this.submit();
	}

	/** After amount-changed: jump back to confirm with new debt. */
	seeNewAmount(): void {
		this.errorReason = null;
		this.payMinor = this.debtMinor;
		this.partialInput = '';
		this.partialMode = false;
		this.step = 'confirm';
	}

	payTheRest(): void {
		if (!this.peer || this.remainingMinor <= 0) {
			this.backToList();
			return;
		}
		this.debtMinor = this.remainingMinor;
		this.payMinor = this.remainingMinor;
		this.partialMode = false;
		this.partialInput = '';
		this.step = 'confirm';
	}
}
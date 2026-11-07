// src/lib/expense/expense-flow.svelte.ts
// Screen 7 state machine: amount → split → review → pending → done | error
// UI-complete mock: timed wallet approve; no on-chain client yet.

import type { ExpenseCategory } from '#lib/supabase/core.ts';
import { EXPENSE_CATEGORIES } from '#lib/supabase/core.ts';

export type ExpenseStep =
	| 'amount'
	| 'split'
	| 'review'
	| 'pending'
	| 'done'
	| 'error';

export type SplitMode = 'equal' | 'custom';

export type PendingPhase =
	| 'details'
	| 'approve'
	| 'recording'
	| 'meta';

export type ExpenseErrorReason =
	| 'declined'
	| 'network'
	| 'no-sol'
	| 'meta-pending';

export interface ExpenseParticipant {
	wallet: string;
	displayName: string;
	/** True for the signed-in payer in this mock. */
	isYou?: boolean;
	/** Custom share in USDC minor units (6 decimals). */
	shareMinor: number;
}

export interface ExpenseDraft {
	groupPubkey: string;
	groupName: string;
	/** Total in minor units. */
	amountMinor: number;
	description: string;
	category: ExpenseCategory | null;
	splitMode: SplitMode;
	participants: ExpenseParticipant[];
	note: string;
	receiptFile: File | null;
}

const USDC_SCALE = 1_000_000;
const NOTE_MAX = 280;
const MAX_PARTICIPANTS = 10;

export function majorToMinor(major: number): number {
	return Math.round(major * USDC_SCALE);
}

export function minorToMajor(minor: number): number {
	return minor / USDC_SCALE;
}

export function formatMajor(minor: number): string {
	return minorToMajor(minor).toLocaleString('en-US', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});
}

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
	food: 'Food',
	drinks: 'Drinks',
	groceries: 'Groceries',
	transport: 'Transport',
	lodging: 'Lodging',
	activities: 'Activities',
	shopping: 'Shopping',
	other: 'Other'
};

export { EXPENSE_CATEGORIES, NOTE_MAX, MAX_PARTICIPANTS };

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

/** Demo members for Cape Town–style groups. */
function defaultParticipants(myWallet: string): ExpenseParticipant[] {
	return [
		{ wallet: myWallet, displayName: 'You', isYou: true, shareMinor: 0 },
		{ wallet: 'Kofi2222', displayName: 'Kofi', shareMinor: 0 },
		{ wallet: 'Lena3333', displayName: 'Lena', shareMinor: 0 },
		{ wallet: 'Dev44444', displayName: 'Dev', shareMinor: 0 },
		{ wallet: 'Tunde555', displayName: 'Tunde', shareMinor: 0 }
	];
}

export class ExpenseFlow {
	step = $state<ExpenseStep>('amount');
	pendingPhase = $state<PendingPhase>('details');
	errorReason = $state<ExpenseErrorReason | null>(null);
	busy = $state(false);

	groupPubkey = $state('');
	groupName = $state('Cape Town 2026');

	/** Raw major-unit string from the amount input, e.g. "84" or "84.00". */
	amountInput = $state('');
	description = $state('');
	category = $state<ExpenseCategory | null>(null);

	splitMode = $state<SplitMode>('equal');
	participants = $state<ExpenseParticipant[]>([]);

	note = $state('');
	receiptFile = $state<File | null>(null);
	receiptName = $state<string | null>(null);

	/** Set after successful mock record. */
	resultOwedToYou = $state(0);

	#abort: AbortController | null = null;
	#myWallet = '';

	init(opts: { groupPubkey: string; groupName?: string; myWallet: string }): void {
		this.groupPubkey = opts.groupPubkey;
		this.groupName = opts.groupName ?? 'Cape Town 2026';
		this.#myWallet = opts.myWallet;
		this.participants = defaultParticipants(opts.myWallet);
		this.applyEqualShares();
	}

	get amountMinor(): number {
		const n = Number.parseFloat(this.amountInput.replace(/,/g, ''));
		if (!Number.isFinite(n) || n <= 0) return 0;
		return majorToMinor(n);
	}

	get amountValid(): boolean {
		return this.amountMinor > 0 && this.description.trim().length > 0;
	}

	get noteCount(): number {
		return this.note.length;
	}

	get noteOver(): boolean {
		return this.note.length > NOTE_MAX;
	}

	/** Sum of custom shares. */
	get assignedMinor(): number {
		return this.participants.reduce((s, p) => s + p.shareMinor, 0);
	}

	get leftToAssign(): number {
		return this.amountMinor - this.assignedMinor;
	}

	get customBalanced(): boolean {
		return this.amountMinor > 0 && this.leftToAssign === 0;
	}

	get canGoSplit(): boolean {
		return this.amountValid && !!this.category;
	}

	get canGoReview(): boolean {
		if (this.splitMode === 'equal') return this.amountMinor > 0 && this.participants.length >= 2;
		return this.customBalanced && this.participants.some((p) => p.shareMinor > 0);
	}

	get canSubmit(): boolean {
		return this.canGoReview && !this.noteOver && !this.busy;
	}

	/** Equal share per person; remainder cents go to payer (you). */
	applyEqualShares(): void {
		const n = this.participants.length;
		if (n === 0 || this.amountMinor <= 0) {
			for (const p of this.participants) p.shareMinor = 0;
			return;
		}
		const base = Math.floor(this.amountMinor / n);
		let remainder = this.amountMinor - base * n;
		this.participants = this.participants.map((p) => {
			let share = base;
			if (p.isYou && remainder > 0) {
				share += remainder;
				remainder = 0;
			}
			return { ...p, shareMinor: share };
		});
		// If payer wasn't found, dump remainder on first
		if (remainder > 0 && this.participants[0]) {
			this.participants[0] = {
				...this.participants[0],
				shareMinor: this.participants[0].shareMinor + remainder
			};
		}
	}

	setSplitMode(mode: SplitMode): void {
		this.splitMode = mode;
		if (mode === 'equal') this.applyEqualShares();
	}

	setCustomShare(wallet: string, majorStr: string): void {
		const n = Number.parseFloat(majorStr.replace(/,/g, ''));
		const minor = Number.isFinite(n) && n >= 0 ? majorToMinor(n) : 0;
		this.participants = this.participants.map((p) =>
			p.wallet === wallet ? { ...p, shareMinor: minor } : p
		);
	}

	/** Net effect for payer: total − your share (what others owe you). */
	get youAreOwed(): number {
		const you = this.participants.find((p) => p.isYou);
		const yourShare = you?.shareMinor ?? 0;
		return this.amountMinor - yourShare;
	}

	goSplit(): void {
		if (!this.canGoSplit) return;
		this.applyEqualShares();
		this.step = 'split';
	}

	goReview(): void {
		if (!this.canGoReview) return;
		if (this.splitMode === 'equal') this.applyEqualShares();
		this.step = 'review';
	}

	backToAmount(): void {
		this.step = 'amount';
	}

	backToSplit(): void {
		this.step = 'split';
	}

	setReceipt(file: File | null): void {
		this.receiptFile = file;
		this.receiptName = file?.name ?? null;
	}

	async submit(): Promise<void> {
		if (!this.canSubmit) return;

		const desc = this.description.trim().toLowerCase();
		// Demo error hooks via description keywords
		if (desc === 'nosol') {
			this.errorReason = 'no-sol';
			this.step = 'error';
			return;
		}
		if (desc === 'fail') {
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
			await sleep(1200, signal);
			this.pendingPhase = 'recording';
			await sleep(900, signal);
			this.pendingPhase = 'meta';
			await sleep(500, signal);

			if (desc === 'meta') {
				this.resultOwedToYou = this.youAreOwed;
				this.errorReason = 'meta-pending';
				this.step = 'error';
				return;
			}

			this.resultOwedToYou = this.youAreOwed;
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

	backToReview(): void {
		this.#abort?.abort();
		this.#abort = null;
		this.busy = false;
		this.errorReason = null;
		this.step = 'review';
	}

	/** After meta-pending, treat as done. */
	finishDespiteMeta(): void {
		this.errorReason = null;
		this.step = 'done';
	}

	resetForAnother(): void {
		this.amountInput = '';
		this.description = '';
		this.category = null;
		this.splitMode = 'equal';
		this.note = '';
		this.receiptFile = null;
		this.receiptName = null;
		this.resultOwedToYou = 0;
		this.errorReason = null;
		this.participants = defaultParticipants(this.#myWallet);
		this.step = 'amount';
	}
}
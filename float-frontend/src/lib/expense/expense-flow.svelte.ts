// src/lib/expense/expense-flow.svelte.ts
// amount → split → review → pending → done | error

import { PublicKey } from '@solana/web3.js';
import type { BaseMessageSignerWalletAdapter } from '@solana/wallet-adapter-base';
import type { ExpenseCategory } from '#lib/supabase/core.ts';
import { EXPENSE_CATEGORIES } from '#lib/supabase/core.ts';
import { logExpense } from '#lib/program/client.ts';
import { mapProgramError } from '#lib/program/errors.ts';
import { createExpenseMeta } from '#lib/supabase/expenseMeta.ts';
import { shortAddress } from '#lib/supabase/profiles.ts';

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
	isYou?: boolean;
	/** Custom share in USDC minor units (6 decimals). */
	shareMinor: number;
}

const USDC_SCALE = 1_000_000;
const NOTE_MAX = 280;
const MAX_PARTICIPANTS = 10;
/** On-chain description is a fixed 64-byte field. */
const DESC_MAX = 64;

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

export { EXPENSE_CATEGORIES, NOTE_MAX, MAX_PARTICIPANTS, DESC_MAX };

export class ExpenseFlow {
	step = $state<ExpenseStep>('amount');
	pendingPhase = $state<PendingPhase>('details');
	errorReason = $state<ExpenseErrorReason | null>(null);
	busy = $state(false);

	groupPubkey = $state('');
	groupName = $state('');
	/** Group creator base58 — required by log_expense. */
	creator = $state('');

	amountInput = $state('');
	description = $state('');
	category = $state<ExpenseCategory | null>(null);

	splitMode = $state<SplitMode>('equal');
	participants = $state<ExpenseParticipant[]>([]);

	note = $state('');
	receiptFile = $state<File | null>(null);
	receiptName = $state<string | null>(null);

	resultOwedToYou = $state(0);
	/** On-chain expense index after success (for meta). */
	expenseIndex = $state<number | null>(null);

	adapter: BaseMessageSignerWalletAdapter | null = null;

	#myWallet = '';

	init(opts: {
		groupPubkey: string;
		groupName: string;
		creator: string;
		myWallet: string;
		/** Real group members (include you). */
		members: { wallet: string; displayName: string }[];
	}): void {
		this.groupPubkey = opts.groupPubkey;
		this.groupName = opts.groupName;
		this.creator = opts.creator;
		this.#myWallet = opts.myWallet;

		const list = opts.members.length
			? opts.members
			: [{ wallet: opts.myWallet, displayName: 'You' }];

		this.participants = list.map((m) => ({
			wallet: m.wallet,
			displayName: m.wallet === opts.myWallet ? 'You' : m.displayName || shortAddress(m.wallet),
			isYou: m.wallet === opts.myWallet,
			shareMinor: 0
		}));

		// Ensure payer is first-ish for remainder on equal split
		this.participants.sort((a, b) => Number(!!b.isYou) - Number(!!a.isYou));
		this.applyEqualShares();
	}

	setAdapter(a: BaseMessageSignerWalletAdapter | null) {
		this.adapter = a;
	}

	get amountMinor(): number {
		const n = Number.parseFloat(this.amountInput.replace(/,/g, ''));
		if (!Number.isFinite(n) || n <= 0) return 0;
		return majorToMinor(n);
	}

	get amountValid(): boolean {
		const d = this.description.trim();
		return this.amountMinor > 0 && d.length > 0 && d.length <= DESC_MAX;
	}

	get noteCount(): number {
		return this.note.length;
	}

	get noteOver(): boolean {
		return this.note.length > NOTE_MAX;
	}

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
		if (this.splitMode === 'equal') return this.amountMinor > 0 && this.participants.length >= 1;
		return this.customBalanced && this.participants.some((p) => p.shareMinor > 0);
	}

	get canSubmit(): boolean {
		return this.canGoReview && !this.noteOver && !this.busy;
	}

	applyEqualShares(): void {
		const n = this.participants.length;
		if (n === 0 || this.amountMinor <= 0) {
			this.participants = this.participants.map((p) => ({ ...p, shareMinor: 0 }));
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

		const ad = this.adapter;
		if (!ad?.publicKey) {
			this.errorReason = 'network';
			this.step = 'error';
			return;
		}

		if (this.splitMode === 'equal') this.applyEqualShares();

		const participants = this.participants
			.filter((p) => p.shareMinor > 0)
			.map((p) => ({
				wallet: new PublicKey(p.wallet),
				share: p.shareMinor
			}));

		if (participants.length === 0) {
			this.errorReason = 'network';
			this.step = 'error';
			return;
		}

		this.busy = true;
		this.errorReason = null;
		this.pendingPhase = 'details';
		this.step = 'pending';
		this.expenseIndex = null;

		try {
			this.pendingPhase = 'approve';

			const memberWallets = this.participants.map((p) => ({
				wallet: new PublicKey(p.wallet),
				// ignored when equalSplit: true
				share: this.splitMode === 'equal' ? 0 : p.shareMinor
			}));

			const { expenseIndex } = await logExpense({
				adapter: ad,
				creator: new PublicKey(this.creator),
				groupName: this.groupName,
				amount: this.amountMinor,
				description: this.description.trim().slice(0, DESC_MAX),
				participants: memberWallets,
				equalSplit: this.splitMode === 'equal'
			});

			this.expenseIndex = expenseIndex;
			this.pendingPhase = 'recording';
			this.resultOwedToYou = this.youAreOwed;

			// Off-chain meta is best-effort
			this.pendingPhase = 'meta';
			if (this.category) {
				try {
					await createExpenseMeta(this.groupPubkey, expenseIndex, {
						category: this.category,
						note: this.note.trim() || null,
						receipt: this.receiptFile
					});
				} catch {
					this.errorReason = 'meta-pending';
					this.step = 'error';
					return;
				}
			}

			this.step = 'done';
		} catch (e) {
			const err = mapProgramError(e);
			const msg = err.message.toLowerCase();
			if (msg.includes('declined') || msg.includes('reject')) {
				this.errorReason = 'declined';
			} else if (msg.includes('sol') || msg.includes('insufficient')) {
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
		// Wallet prompt can't be cancelled from our side mid-sign; after decline mapProgramError handles it.
		this.busy = false;
		this.errorReason = 'declined';
		this.step = 'error';
	}

	retry(): void {
		this.errorReason = null;
		void this.submit();
	}

	backToReview(): void {
		this.busy = false;
		this.errorReason = null;
		this.step = 'review';
	}

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
		this.expenseIndex = null;
		this.errorReason = null;
		this.participants = this.participants.map((p) => ({ ...p, shareMinor: 0 }));
		this.applyEqualShares();
		this.step = 'amount';
	}
}
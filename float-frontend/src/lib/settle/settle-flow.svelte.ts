// src/lib/settle/settle-flow.svelte.ts
// list → confirm → pending → done | error

import { PublicKey } from '@solana/web3.js';
import type { BaseMessageSignerWalletAdapter } from '@solana/wallet-adapter-base';
import { settle } from '#lib/program/client.ts';
import { mapProgramError } from '#lib/program/errors.ts';
import { loadGroupDetail } from '#lib/group-detail/load.ts';

export type SettleStep = 'list' | 'confirm' | 'pending' | 'done' | 'error';

export type PendingPhase = 'details' | 'approve' | 'sending' | 'updating';

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
	/** Positive = they owe you; negative = you owe them. */
	netVsYou: number;
}

export interface SettleGroup {
	pubkey: string;
	creator: string;
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

export class SettleFlow {
	step = $state<SettleStep>('list');
	pendingPhase = $state<PendingPhase>('details');
	errorReason = $state<SettleErrorReason | null>(null);
	busy = $state(false);
	loading = $state(true);
	loadError = $state<string | null>(null);

	group = $state<SettleGroup | null>(null);
	peer = $state<SettlePeer | null>(null);

	debtMinor = $state(0);
	payMinor = $state(0);
	partialInput = $state('');
	partialMode = $state(false);

	paidMinor = $state(0);
	remainingMinor = $state(0);
	needsAtaSetup = $state(false);

	adapter: BaseMessageSignerWalletAdapter | null = null;
	#myWallet = '';

	setAdapter(a: BaseMessageSignerWalletAdapter | null) {
		this.adapter = a;
	}

	async init(pubkey: string, myWallet: string): Promise<void> {
		this.#myWallet = myWallet;
		this.loading = true;
		this.loadError = null;
		this.errorReason = null;
		this.peer = null;
		this.partialMode = false;
		this.step = 'list';

		try {
			const state = await loadGroupDetail(pubkey, myWallet);
			if (state.status === 'error') {
				this.loadError = state.message;
				this.group = null;
				return;
			}
			if (state.status !== 'ready' && state.status !== 'meta-degraded') {
				this.loadError = 'Could not load balances.';
				return;
			}
			const d = state.detail;
			this.group = {
				pubkey: d.pubkey,
				creator: d.creator,
				name: d.name,
				memberCount: d.memberCount,
				myBalance: d.myBalance,
				owedToYou: d.owedToYou,
				youOwe: d.youOwe,
				peers: d.members.map((m) => ({
					wallet: m.wallet,
					displayName: m.displayName,
					netVsYou: m.netVsYou
				}))
			};
		} catch (e) {
			this.loadError = e instanceof Error ? e.message : 'Could not load balances.';
			this.group = null;
		} finally {
			this.loading = false;
		}
	}

	get youOwePeers(): SettlePeer[] {
		return (this.group?.peers ?? []).filter((p) => p.netVsYou < 0);
	}

	get owedToYouPeers(): SettlePeer[] {
		return (this.group?.peers ?? []).filter((p) => p.netVsYou > 0);
	}

	openPay(peer: SettlePeer): void {
		const debt = Math.abs(peer.netVsYou);
		if (debt <= 0) return;
		this.peer = peer;
		this.debtMinor = debt;
		this.payMinor = debt;
		this.partialInput = '';
		this.partialMode = false;
		this.needsAtaSetup = false;
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
		this.payMinor = Math.min(majorToMinor(n), this.debtMinor);
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

	get canPay(): boolean {
		return !!this.peer && this.payMinor > 0 && this.payMinor <= this.debtMinor && !this.busy;
	}

	backToList(): void {
		this.busy = false;
		this.peer = null;
		this.partialMode = false;
		this.errorReason = null;
		this.step = 'list';
	}

	backToConfirm(): void {
		this.busy = false;
		this.errorReason = null;
		this.step = 'confirm';
	}

	acknowledgeAta(): void {
		this.needsAtaSetup = false;
	}

	async submit(): Promise<void> {
		if (!this.canPay || !this.peer || !this.group) return;

		const ad = this.adapter;
		if (!ad?.publicKey) {
			this.errorReason = 'network';
			this.step = 'error';
			return;
		}

		this.busy = true;
		this.errorReason = null;
		this.pendingPhase = 'details';
		this.step = 'pending';

		try {
			this.pendingPhase = 'approve';

			await settle({
				adapter: ad,
				creator: new PublicKey(this.group.creator),
				groupName: this.group.name,
				toMember: new PublicKey(this.peer.wallet),
				amount: this.payMinor
			});

			this.pendingPhase = 'sending';
			this.pendingPhase = 'updating';

			this.paidMinor = this.payMinor;
			this.remainingMinor = this.stillOwedAfter;

			// Refresh local peer row
			const nextNet = this.peer.netVsYou + this.payMinor; // was negative
			this.group = {
				...this.group,
				peers: this.group.peers.map((p) =>
					p.wallet === this.peer!.wallet ? { ...p, netVsYou: nextNet } : p
				),
				youOwe: Math.max(0, this.group.youOwe - this.payMinor),
				myBalance: this.group.myBalance + this.payMinor
			};

			this.step = 'done';
		} catch (e) {
			const err = mapProgramError(e);
			const msg = err.message.toLowerCase();
			if (msg.includes('declined') || msg.includes('reject')) {
				this.errorReason = 'declined';
			} else if (msg.includes('sol') && msg.includes('fee')) {
				this.errorReason = 'no-sol';
			} else if (msg.includes('insufficient') || msg.includes('token')) {
				this.errorReason = 'no-usdc';
			} else {
				this.errorReason = 'network';
			}
			this.step = 'error';
		} finally {
			this.busy = false;
		}
	}

	cancelPending(): void {
		this.busy = false;
		this.errorReason = 'declined';
		this.step = 'error';
	}

	retry(): void {
		this.errorReason = null;
		void this.submit();
	}

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
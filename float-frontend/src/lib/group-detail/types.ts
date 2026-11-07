/** Group detail (Screen 6) — balances-focused types. */

export type GroupStatus = 'active' | 'closed';

export type DetailTab = 'balances' | 'pool' | 'history';

export interface DetailMember {
	wallet: string;
	displayName: string;
	/** Net balance of this member vs you, USDC minor units.
	 *  Positive = they owe you; negative = you owe them; 0 = settled with you. */
	netVsYou: number;
}

export interface GroupDetail {
	pubkey: string;
	name: string;
	memberCount: number;
	status: GroupStatus;
	/** Your net across the group, USDC minor units. */
	myBalance: number;
	/** Sum of positive peer balances (owed to you). */
	owedToYou: number;
	/** Sum of absolute negative peer balances (you owe). */
	youOwe: number;
	poolEnabled: boolean;
	poolEarning: boolean;
	/** Estimated yield in minor units when pool is earning. */
	estYield: number;
	/** True when pool has a withdrawable share (closed groups). */
	poolShareReady: boolean;
	members: DetailMember[];
	/** Peers with netVsYou === 0 (hidden until "Show settled"). */
	settledCount: number;
}

export type DetailLoadState =
	| { status: 'loading' }
	| { status: 'ready'; detail: GroupDetail }
	| { status: 'error'; message: string }
	| { status: 'meta-degraded'; detail: GroupDetail; message: string };
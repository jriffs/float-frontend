/** Group detail (Screen 6) — balances-focused types. */

export type GroupStatus = 'active' | 'closed';

export type DetailTab = 'balances' | 'pool' | 'history';

export interface DetailMember {
	wallet: string;
	displayName: string;
	/** Net vs you, USDC minor units.
	 *  Positive = they owe you; negative = you owe them; 0 = no direct edge. */
	netVsYou: number;
}

export interface GroupDetail {
	pubkey: string;
	/** Group creator (base58) — required for settle / log_expense. */
	creator: string;
	name: string;
	memberCount: number;
	status: GroupStatus;
	/** Your net across the group, USDC minor units. */
	myBalance: number;
	/** Sum of positive peer netVsYou. */
	owedToYou: number;
	/** Sum of absolute negative peer netVsYou. */
	youOwe: number;
	poolEnabled: boolean;
	poolEarning: boolean;
	estYield: number;
	poolShareReady: boolean;
	members: DetailMember[];
	settledCount: number;
}

export type DetailLoadState =
	| { status: 'loading' }
	| { status: 'ready'; detail: GroupDetail }
	| { status: 'error'; message: string }
	| { status: 'meta-degraded'; detail: GroupDetail; message: string };
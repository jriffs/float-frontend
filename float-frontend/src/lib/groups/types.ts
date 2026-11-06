/** UI-facing group row for the home list. Chain mapping lives in the data loader. */
export interface GroupMemberPreview {
	wallet: string;
	displayName?: string | null;
	avatarUrl?: string | null;
}

export interface GroupListItem {
	/** Base58 group PDA. */
	pubkey: string;
	name: string;
	memberCount: number;
	/** Up to ~4 members for the avatar stack. */
	members: GroupMemberPreview[];
	/**
	 * Net position for the signed-in wallet in USDC minor units (6 decimals).
	 * Positive = owed to you, negative = you owe.
	 */
	myBalance: number;
	poolEnabled: boolean;
	/** True when pool is deployed / actively earning. */
	poolEarning: boolean;
	/**
	 * Optional icon key for the tile. Falls back to a letter from the name.
	 * Known: trip | home | hike | default
	 */
	icon?: 'trip' | 'home' | 'hike' | 'default';
}

export interface GroupsSummary {
	/** Sum of positive balances across groups (owed to you). */
	owedToYou: number;
	/** Sum of absolute negative balances (you owe). */
	youOwe: number;
	/** owedToYou - youOwe */
	net: number;
	/** Estimated yield across earning pools, in USDC minor units. */
	estYield: number;
	anyPoolEarning: boolean;
}

export type GroupsLoadState =
	| { status: 'loading' }
	| { status: 'empty' }
	| { status: 'ready'; groups: GroupListItem[]; summary: GroupsSummary }
	| { status: 'error'; message: string }
	| { status: 'offline'; groups: GroupListItem[]; summary: GroupsSummary };
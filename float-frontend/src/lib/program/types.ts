import type { PublicKey } from '@solana/web3.js';

export interface GroupAccount {
	pubkey: PublicKey;
	creator: PublicKey;
	name: string;
	settlementMint: PublicKey;
	memberCount: number;
	unsettledMemberCount: number;
	expenseCount: number;
	poolEnabled: boolean;
	status: number;
	bump: number;
}

export interface MemberBalanceAccount {
	pubkey: PublicKey;
	group: PublicKey;
	member: PublicKey;
	/** i64 net position in settlement-mint minor units. */
	balance: number;
	depositedPrincipal: number;
	poolShares: number;
	bump: number;
}

export interface ExpenseAccount {
	pubkey: PublicKey;
	group: PublicKey;
	payer: PublicKey;
	amount: number;
	description: string;
	timestamp: number;
	expenseIndex: number;
	participantCount: number;
	paidFromPool: boolean;
	bump: number;
}
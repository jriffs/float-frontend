import { PublicKey } from '@solana/web3.js';
import { PUBLIC_FLOAT_PROGRAM_ID, PUBLIC_USDC_MINT, PUBLIC_SOLANA_RPC_URL } from '$app/env/public';

export const FLOAT_PROGRAM_ID = new PublicKey(
	PUBLIC_FLOAT_PROGRAM_ID || 'GUFWB2jfAK5e8QSra1d2XrqrwBCBr7k3f2FwDWr8CE8m'
);

/** Devnet Circle USDC (matches kamino.ts). */
export const USDC_MINT = new PublicKey(
	PUBLIC_USDC_MINT || '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
);

export const RPC_URL = PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

export const USDC_DECIMALS = 6;
export const USDC_SCALE = 1_000_000;

/** Group.status */
export const GROUP_STATUS = {
	Active: 0,
	Settling: 1,
	Closed: 2
} as const;

export const SEEDS = {
	group: Buffer.from('group'),
	memberBalance: Buffer.from('member_balance'),
	expense: Buffer.from('expense'),
	pool: Buffer.from('pool')
} as const;
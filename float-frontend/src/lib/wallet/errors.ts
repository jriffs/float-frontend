// src/lib/wallet/errors.ts

import { WalletWindowClosedError } from '@solana/wallet-adapter-base';

export type ConnectErrorReason = 'no-wallet' | 'cancelled' | 'wrong-network' | 'expired' | 'failed';

export class WalletFlowError extends Error {
	constructor(
		readonly reason: ConnectErrorReason,
		message?: string
	) {
		super(message ?? reason);
		this.name = 'WalletFlowError';
	}
}

const REJECTION = /reject|denied|declin|cancel|user closed|window closed/i;

/** Wallets word "the user said no" differently; normalise it. */
export function isUserRejection(e: unknown): boolean {
	if (e instanceof WalletWindowClosedError) return true;
	const inner = (e as { error?: { code?: number } } | null)?.error;
	if (inner?.code === 4001) return true; // EIP-1193 style rejection used by Phantom
	return REJECTION.test(e instanceof Error ? e.message : String(e));
}

export function reasonFor(e: unknown): ConnectErrorReason {
	if (e instanceof WalletFlowError) return e.reason;
	return isUserRejection(e) ? 'cancelled' : 'failed';
}

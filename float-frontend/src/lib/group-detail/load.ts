/**
 * Group detail loader. Mock-only until chain + expense meta are wired.
 * Demo variants via pubkey substring (case-insensitive):
 *   empty | settled | closed | fail | meta
 */

import type { DetailLoadState, GroupDetail } from './types';

function sleep(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms));
}

function capeTown(pubkey: string): GroupDetail {
	return {
		pubkey,
		name: 'Cape Town 2026',
		memberCount: 5,
		status: 'active',
		myBalance: 42_500_000,
		owedToYou: 49_000_000,
		youOwe: 6_500_000,
		poolEnabled: true,
		poolEarning: true,
		estYield: 3_217,
		poolShareReady: false,
		members: [
			{ wallet: 'Kofi2222', displayName: 'Kofi', netVsYou: 18_000_000 },
			{ wallet: 'Lena3333', displayName: 'Lena', netVsYou: 31_000_000 },
			{ wallet: 'Dev44444', displayName: 'Dev', netVsYou: -6_500_000 },
			{ wallet: 'Amara111', displayName: 'Amara', netVsYou: 0 }
		],
		settledCount: 1
	};
}

function emptyGroup(pubkey: string): GroupDetail {
	return {
		pubkey,
		name: 'Cape Town 2026',
		memberCount: 1,
		status: 'active',
		myBalance: 0,
		owedToYou: 0,
		youOwe: 0,
		poolEnabled: false,
		poolEarning: false,
		estYield: 0,
		poolShareReady: false,
		members: [],
		settledCount: 0
	};
}

function settledGroup(pubkey: string): GroupDetail {
	return {
		pubkey,
		name: 'Weekend Hike',
		memberCount: 4,
		status: 'active',
		myBalance: 0,
		owedToYou: 0,
		youOwe: 0,
		poolEnabled: false,
		poolEarning: false,
		estYield: 0,
		poolShareReady: false,
		members: [
			{ wallet: 'Dee77777', displayName: 'Dee', netVsYou: 0 },
			{ wallet: 'Efe88888', displayName: 'Efe', netVsYou: 0 },
			{ wallet: 'Fola9999', displayName: 'Fola', netVsYou: 0 }
		],
		settledCount: 3
	};
}

function closedGroup(pubkey: string): GroupDetail {
	return {
		pubkey,
		name: 'Cape Town 2026',
		memberCount: 5,
		status: 'closed',
		myBalance: 11_500_000,
		owedToYou: 18_000_000,
		youOwe: 6_500_000,
		poolEnabled: true,
		poolEarning: false,
		estYield: 0,
		poolShareReady: true,
		members: [
			{ wallet: 'Kofi2222', displayName: 'Kofi', netVsYou: 18_000_000 },
			{ wallet: 'Dev44444', displayName: 'Dev', netVsYou: -6_500_000 }
		],
		settledCount: 0
	};
}

function pickMock(pubkey: string): GroupDetail {
	const key = pubkey.toLowerCase();
	if (key.includes('empty')) return emptyGroup(pubkey);
	if (key.includes('settled') || key.includes('weekend')) return settledGroup(pubkey);
	if (key.includes('closed')) return closedGroup(pubkey);
	return capeTown(pubkey);
}

export async function loadGroupDetail(pubkey: string): Promise<DetailLoadState> {
	await sleep(500);

	const key = pubkey.toLowerCase();
	if (key.includes('fail')) {
		return {
			status: 'error',
			message: 'We could not reach the network. Your balances are safe on-chain.'
		};
	}

	const detail = pickMock(pubkey);

	if (key.includes('meta')) {
		return {
			status: 'meta-degraded',
			detail,
			message:
				'Balances come straight from the chain, so they are right. Notes, categories and receipts will appear when we reconnect.'
		};
	}

	return { status: 'ready', detail };
}
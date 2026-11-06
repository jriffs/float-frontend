/**
 * Groups list data loader.
 *
 * On-chain program reads are not wired in the frontend yet. This module
 * exposes a stable API (`loadGroups`) and a mock implementation so Screen 3
 * can be built and demoed. Swap the body of `fetchGroupsFromChain` when the
 * Anchor client lands — UI components stay untouched.
 */

import type { GroupListItem, GroupsLoadState, GroupsSummary } from './types';

const CACHE_KEY = 'float:groups-cache-v1';

interface CachePayload {
	groups: GroupListItem[];
	summary: GroupsSummary;
	savedAt: number;
}

function computeSummary(groups: GroupListItem[]): GroupsSummary {
	let owedToYou = 0;
	let youOwe = 0;
	let estYield = 0;
	let anyPoolEarning = false;

	for (const g of groups) {
		if (g.myBalance > 0) owedToYou += g.myBalance;
		else if (g.myBalance < 0) youOwe += -g.myBalance;
		if (g.poolEarning) {
			anyPoolEarning = true;
			// Placeholder until harvest_yield is wired: tiny decorative estimate.
			estYield += 7_134; // $0.007134 in minor units for demo
		}
	}

	return {
		owedToYou,
		youOwe,
		net: owedToYou - youOwe,
		estYield,
		anyPoolEarning
	};
}

function readCache(): CachePayload | null {
	try {
		const raw = localStorage.getItem(CACHE_KEY);
		if (!raw) return null;
		return JSON.parse(raw) as CachePayload;
	} catch {
		return null;
	}
}

function writeCache(groups: GroupListItem[], summary: GroupsSummary): void {
	try {
		const payload: CachePayload = { groups, summary, savedAt: Date.now() };
		localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
	} catch {
		/* private mode */
	}
}

/** Demo data matching S3List design. Remove once chain is live. */
function mockGroups(): GroupListItem[] {
	return [
		{
			pubkey: 'CapeTown2026MockPubkey1111111111111111111',
			name: 'Cape Town 2026',
			memberCount: 5,
			members: [
				{ wallet: 'Amara111' },
				{ wallet: 'Kofi2222' },
				{ wallet: 'Zara3333' },
				{ wallet: 'Tunde444' }
			],
			myBalance: 42_500_000, // +$42.50
			poolEnabled: true,
			poolEarning: true,
			icon: 'trip'
		},
		{
			pubkey: 'LagosFlatMockPubkey22222222222222222222',
			name: 'Lagos Flat',
			memberCount: 3,
			members: [{ wallet: 'Amara111' }, { wallet: 'Bola5555' }, { wallet: 'Chi66666' }],
			myBalance: -18_800_000, // −$18.80
			poolEnabled: false,
			poolEarning: false,
			icon: 'home'
		},
		{
			pubkey: 'WeekendHikeMockPubkey333333333333333333',
			name: 'Weekend Hike',
			memberCount: 4,
			members: [
				{ wallet: 'Amara111' },
				{ wallet: 'Dee77777' },
				{ wallet: 'Efe88888' },
				{ wallet: 'Fola9999' }
			],
			myBalance: 0,
			poolEnabled: false,
			poolEarning: false,
			icon: 'hike'
		}
	];
}

/**
 * Replace this with real PDA scans + MemberBalance reads.
 * Signature stays the same so the page does not change.
 */
async function fetchGroupsFromChain(_wallet: string): Promise<GroupListItem[]> {
	// TODO(chain): fetch Group + MemberBalance PDAs for this wallet.
	// For now return design-faithful mock data so the UI is demoable.
	await new Promise((r) => setTimeout(r, 450));
	return mockGroups();
}

export async function loadGroups(wallet: string): Promise<GroupsLoadState> {
	const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
	const cached = readCache();

	if (offline) {
		if (cached) {
			return { status: 'offline', groups: cached.groups, summary: cached.summary };
		}
		return {
			status: 'error',
			message: 'You are offline and no saved groups are available yet.'
		};
	}

	try {
		const groups = await fetchGroupsFromChain(wallet);
		const summary = computeSummary(groups);
		writeCache(groups, summary);

		if (groups.length === 0) return { status: 'empty' };
		return { status: 'ready', groups, summary };
	} catch (e) {
		if (cached) {
			return { status: 'offline', groups: cached.groups, summary: cached.summary };
		}
		return {
			status: 'error',
			message:
				e instanceof Error
					? e.message
					: 'We could not reach the network. Your groups are safe on-chain.'
		};
	}
}

/** Dev helper: force empty state without touching chain. */
export function clearGroupsCache(): void {
	try {
		localStorage.removeItem(CACHE_KEY);
	} catch {
		/* ignore */
	}
}
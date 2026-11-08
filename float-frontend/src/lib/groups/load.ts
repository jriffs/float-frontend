/**
 * Groups list data loader.
 * Reads MemberBalance PDAs for the wallet, then each Group account.
 */

import { PublicKey } from '@solana/web3.js';
import {
	fetchWalletMemberBalances,
	fetchGroup,
	fetchGroupMembers
} from '#lib/program/client.ts';
import { GROUP_STATUS } from '#lib/program/constants.ts';
import { getProfiles, avatarUrl } from '#lib/supabase/profiles.ts';
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
			// Decorative until harvest_yield is wired
			estYield += 0;
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

function iconForName(name: string): GroupListItem['icon'] {
	const n = name.toLowerCase();
	if (/\b(hike|trail|trek|camp)\b/.test(n)) return 'hike';
	if (/\b(flat|apt|house|home|rent)\b/.test(n)) return 'home';
	if (/\b(trip|travel|vacation|tour|cape|lagos)\b/.test(n)) return 'trip';
	return 'default';
}

/**
 * On-chain: MemberBalance(s) for wallet → Group + members for each.
 */
async function fetchGroupsFromChain(wallet: string): Promise<GroupListItem[]> {
	const member = new PublicKey(wallet);
	const myBalances = await fetchWalletMemberBalances(member);
	if (myBalances.length === 0) return [];

	const items: GroupListItem[] = [];

	// Parallel group + member list fetches
	const rows = await Promise.all(
		myBalances.map(async (mb) => {
			const [group, members] = await Promise.all([
				fetchGroup(mb.group),
				fetchGroupMembers(mb.group)
			]);
			return { mb, group, members };
		})
	);

	// Optional: enrich display names / avatars from Supabase
	const allWallets = new Set<string>();
	for (const row of rows) {
		if (!row.group) continue;
		for (const m of row.members) allWallets.add(m.member.toBase58());
	}
	let profileMap = new Map<string, Awaited<ReturnType<typeof getProfiles>> extends Map<infer K, infer V> ? V : never>();
	try {
		profileMap = await getProfiles([...allWallets]);
	} catch {
		/* profiles are decorative; chain data still shows */
	}

	for (const { mb, group, members } of rows) {
		if (!group) continue;
		// Skip closed groups on the home list
		if (group.status === GROUP_STATUS.Closed) continue;

		const preview = members
			.filter((m) => m.member.toBase58() !== wallet)
			.slice(0, 4)
			.map((m) => {
				const w = m.member.toBase58();
				const p = profileMap.get(w);
				return {
					wallet: w,
					displayName: p?.display_name ?? null,
					avatarUrl: avatarUrl(p)
				};
			});

		items.push({
			pubkey: group.pubkey.toBase58(),
			name: group.name,
			memberCount: group.memberCount,
			members: preview,
			myBalance: mb.balance,
			poolEnabled: group.poolEnabled,
			// Until pool account is decoded: treat enabled as "earning" signal
			poolEarning: group.poolEnabled,
			icon: iconForName(group.name)
		});
	}

	// Stable order: most recently relevant first (highest |balance|, then name)
	items.sort((a, b) => {
		const byBal = Math.abs(b.myBalance) - Math.abs(a.myBalance);
		if (byBal !== 0) return byBal;
		return a.name.localeCompare(b.name);
	});

	return items;
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
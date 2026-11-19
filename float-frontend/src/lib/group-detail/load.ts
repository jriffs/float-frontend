/**
 * Group detail loader — chain balances (no pool / history yet).
 */

import { PublicKey } from '@solana/web3.js';
import { fetchGroup, fetchGroupMembers } from '#lib/program/client.ts';
import { GROUP_STATUS } from '#lib/program/constants.ts';
import { getProfiles, shortAddress } from '#lib/supabase/profiles.ts';
import type { DetailLoadState, DetailMember, GroupDetail } from './types';

/** Bilateral settle suggestion from two group-net balances. */
function netVsYou(myBal: number, peerBal: number): number {
	if (myBal > 0 && peerBal < 0) return Math.min(myBal, -peerBal);
	if (myBal < 0 && peerBal > 0) return -Math.min(-myBal, peerBal);
	return 0;
}

export async function loadGroupDetail(
	pubkey: string,
	myWallet: string
): Promise<DetailLoadState> {
	if (!pubkey || !myWallet) {
		return { status: 'error', message: 'Missing group or wallet.' };
	}

	let groupPk: PublicKey;
	try {
		groupPk = new PublicKey(pubkey);
	} catch {
		return { status: 'error', message: 'Invalid group address.' };
	}

	try {
		const [group, members] = await Promise.all([
			fetchGroup(groupPk),
			fetchGroupMembers(groupPk)
		]);

		if (!group) {
			return {
				status: 'error',
				message: 'Group not found on-chain. It may have been closed or the address is wrong.'
			};
		}

		const me = members.find((m) => m.member.toBase58() === myWallet);
		if (!me) {
			return {
				status: 'error',
				message: 'You are not a member of this group.'
			};
		}

		const wallets = members.map((m) => m.member.toBase58());
		let profileMap = new Map<string, { display_name: string }>();
		try {
			profileMap = await getProfiles(wallets);
		} catch {
			/* profiles optional */
		}

		const myBal = me.balance;
		const peers: DetailMember[] = [];

		for (const m of members) {
			const w = m.member.toBase58();
			if (w === myWallet) continue;

			const vs = netVsYou(myBal, m.balance);
			const profile = profileMap.get(w);
			peers.push({
				wallet: w,
				displayName: profile?.display_name ?? shortAddress(w),
				netVsYou: vs
			});
		}

		// Open balances first (largest |net|), then settled
		peers.sort((a, b) => {
			const open = Number(b.netVsYou !== 0) - Number(a.netVsYou !== 0);
			if (open !== 0) return open;
			return Math.abs(b.netVsYou) - Math.abs(a.netVsYou);
		});

		let owedToYou = 0;
		let youOwe = 0;
		let settledCount = 0;
		for (const p of peers) {
			if (p.netVsYou > 0) owedToYou += p.netVsYou;
			else if (p.netVsYou < 0) youOwe += -p.netVsYou;
			else settledCount += 1;
		}

		const detail: GroupDetail = {
			pubkey: group.pubkey.toBase58(),
			creator: group.creator.toBase58(),
			name: group.name,
			memberCount: group.memberCount,
			status: group.status === GROUP_STATUS.Closed ? 'closed' : 'active',
			myBalance: myBal,
			owedToYou,
			youOwe,
			poolEnabled: group.poolEnabled,
			poolEarning: group.poolEnabled, // until Pool PDA is read
			estYield: 0,
			poolShareReady: false,
			members: peers,
			settledCount
		};

		return { status: 'ready', detail };
	} catch (e) {
		return {
			status: 'error',
			message:
				e instanceof Error
					? e.message
					: 'We could not reach the network. Your balances are safe on-chain.'
		};
	}
}
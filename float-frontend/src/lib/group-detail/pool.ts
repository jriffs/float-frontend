import { PublicKey } from '@solana/web3.js';
import {
	fetchGroup,
	fetchPool,
	fetchMemberBalance
} from '#lib/program/client.ts';
import { GROUP_STATUS } from '#lib/program/constants.ts';

export type PoolUiPhase =
	| 'off' // pool_enabled false
	| 'idle' // enabled, not deployed, has or no value
	| 'deployed'
	| 'closed'; // group closed — withdraw path

export interface PoolView {
	groupPubkey: string;
	creator: string;
	groupName: string;
	phase: PoolUiPhase;
	isCreator: boolean;
	poolEnabled: boolean;
	isDeployed: boolean;
	/** Pool total value (minor units) */
	totalValue: number;
	totalShares: number;
	totalPrincipal: number;
	/** Your share of pool value from member.poolShares */
	myShares: number;
	myPrincipal: number;
	/** Approximate claim: totalValue * myShares / totalShares */
	myValue: number;
	lastHarvestTs: number;
}

export type PoolLoadState =
	| { status: 'loading' }
	| { status: 'ready'; view: PoolView }
	| { status: 'error'; message: string };

export async function loadPoolView(
	groupPubkey: string,
	myWallet: string
): Promise<PoolLoadState> {
	try {
		const groupPk = new PublicKey(groupPubkey);
		const group = await fetchGroup(groupPk);
		if (!group) return { status: 'error', message: 'Group not found.' };

		const me = await fetchMemberBalance(groupPk, new PublicKey(myWallet));
		if (!me) return { status: 'error', message: 'You are not a member of this group.' };

		const isCreator = group.creator.toBase58() === myWallet;
		const poolEnabled = group.poolEnabled;
		const closed = group.status === GROUP_STATUS.Closed;

		let totalValue = 0;
		let totalShares = 0;
		let totalPrincipal = 0;
		let isDeployed = false;
		let lastHarvestTs = 0;

		if (poolEnabled) {
			const pool = await fetchPool(groupPk);
			if (pool) {
				totalValue = pool.totalValue;
				totalShares = pool.totalShares;
				totalPrincipal = pool.totalPrincipal;
				isDeployed = pool.isDeployed;
				lastHarvestTs = pool.lastHarvestTs;
			}
		}

		const myShares = me.poolShares;
		const myPrincipal = me.depositedPrincipal;
		const myValue =
			totalShares > 0 ? Math.floor((totalValue * myShares) / totalShares) : 0;

		let phase: PoolUiPhase = 'off';
		if (closed) phase = 'closed';
		else if (!poolEnabled) phase = 'off';
		else if (isDeployed) phase = 'deployed';
		else phase = 'idle';

		return {
			status: 'ready',
			view: {
				groupPubkey,
				creator: group.creator.toBase58(),
				groupName: group.name,
				phase,
				isCreator,
				poolEnabled,
				isDeployed,
				totalValue,
				totalShares,
				totalPrincipal,
				myShares,
				myPrincipal,
				myValue,
				lastHarvestTs
			}
		};
	} catch (e) {
		return {
			status: 'error',
			message: e instanceof Error ? e.message : 'Could not load pool.'
		};
	}
}
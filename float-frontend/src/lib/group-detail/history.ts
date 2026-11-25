import { PublicKey } from '@solana/web3.js';
import { fetchGroup, fetchGroupExpenses } from '#lib/program/client.ts';
import { listExpenseMeta, ensureMembership } from '#lib/supabase/expenseMeta.ts';
import { getProfiles, shortAddress } from '#lib/supabase/profiles.ts';
import type { HistoryItem, HistoryLoadState } from './types.ts';

export async function loadGroupHistory(
	groupPubkey: string,
	myWallet: string
): Promise<HistoryLoadState> {
	if (!groupPubkey || !myWallet) {
		return { status: 'error', message: 'Missing group or wallet.' };
	}

	let groupPk: PublicKey;
	try {
		groupPk = new PublicKey(groupPubkey);
	} catch {
		return { status: 'error', message: 'Invalid group address.' };
	}

	try {
		// Helps RLS for meta; ignore failure
		try {
			await ensureMembership(groupPubkey);
		} catch {
			/* optional */
		}

		const group = await fetchGroup(groupPk);
		if (!group) {
			return { status: 'error', message: 'Group not found on-chain.' };
		}

		const expenses = await fetchGroupExpenses(groupPk, group.expenseCount);

		let metaMap = new Map<number, Awaited<ReturnType<typeof listExpenseMeta>> extends Map<number, infer V> ? V : never>();
		let metaDegraded = false;
		try {
			metaMap = await listExpenseMeta(groupPubkey);
		} catch (e) {
			console.warn('[float] listExpenseMeta', e);
			metaDegraded = true;
		}

		const payers = [...new Set(expenses.map((e) => e.payer.toBase58()))];
		let profiles = new Map<string, { display_name: string }>();
		try {
			profiles = await getProfiles(payers);
		} catch {
			/* optional */
		}

		const items: HistoryItem[] = expenses.map((e) => {
			const payer = e.payer.toBase58();
			const meta = metaMap.get(e.expenseIndex);
			return {
				expenseIndex: e.expenseIndex,
				pubkey: e.pubkey.toBase58(),
				payer,
				payerName:
					payer === myWallet
						? 'You'
						: (profiles.get(payer)?.display_name ?? shortAddress(payer)),
				amount: e.amount,
				description: e.description || 'Expense',
				timestamp: e.timestamp,
				participantCount: e.participantCount,
				paidFromPool: e.paidFromPool,
				category: meta?.category ?? null,
				note: meta?.note ?? null,
				receiptPath: meta?.receipt_path ?? null,
				isYou: payer === myWallet
			};
		});

		return { status: 'ready', items, metaDegraded };
	} catch (e) {
		return {
			status: 'error',
			message:
				e instanceof Error
					? e.message
					: 'Could not load history. Expenses are still on-chain.'
		};
	}
}
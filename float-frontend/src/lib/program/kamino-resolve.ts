import { PublicKey, type AccountMeta } from '@solana/web3.js';
import { PUBLIC_KAMINO_RESOLVER_URL, PUBLIC_KAMINO_RESOLVER_API_KEY } from '$app/env/public';

export interface ResolvedKaminoTxAccounts {
	pool: string;
	vault: string;
	sharesMint: string;
	deploy: {
		accounts: Record<string, string>;
		remainingAccounts: { pubkey: string; isWritable: boolean; isSigner: boolean }[];
	};
	recall: {
		accounts: Record<string, string>;
		remainingAccounts: { pubkey: string; isWritable: boolean; isSigner: boolean }[];
	};
}

function toMeta(
	list: { pubkey: string; isWritable: boolean; isSigner: boolean }[]
): AccountMeta[] {
	return list.map((m) => ({
		pubkey: new PublicKey(m.pubkey),
		isWritable: m.isWritable,
		isSigner: m.isSigner
	}));
}

function toPubkeyMap(rec: Record<string, string>): Record<string, PublicKey> {
	const out: Record<string, PublicKey> = {};
	for (const [k, v] of Object.entries(rec)) out[k] = new PublicKey(v);
	return out;
}

export async function fetchKaminoResolve(params: {
	group: string;
	creator: string;
	settlementMint: string;
	vault?: string;
	groupName?: string;
}): Promise<{
	raw: ResolvedKaminoTxAccounts;
	deployAccounts: Record<string, PublicKey>;
	deployRemaining: AccountMeta[];
	recallAccounts: Record<string, PublicKey>;
	recallRemaining: AccountMeta[];
	sharesMint: PublicKey;
}> {
	const base = PUBLIC_KAMINO_RESOLVER_URL?.replace(/\/$/, '');
	if (!base) throw new Error('PUBLIC_KAMINO_RESOLVER_URL is not set');

	const res = await fetch(`${base}/resolve-kamino`, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			...(PUBLIC_KAMINO_RESOLVER_API_KEY
				? { 'x-api-key': PUBLIC_KAMINO_RESOLVER_API_KEY }
				: {})
		},
		body: JSON.stringify(params)
	});

	const body = await res.json();
	if (!res.ok || !body?.ok) {
		throw new Error(body?.error ?? `Resolver HTTP ${res.status}`);
	}

	const raw = body as ResolvedKaminoTxAccounts;
	return {
		raw,
		deployAccounts: toPubkeyMap(raw.deploy.accounts),
		deployRemaining: toMeta(raw.deploy.remainingAccounts),
		recallAccounts: toPubkeyMap(raw.recall.accounts),
		recallRemaining: toMeta(raw.recall.remainingAccounts),
		sharesMint: new PublicKey(raw.sharesMint)
	};
}
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import bs58 from 'https://esm.sh/bs58@5.0.0';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
	// Must stay at the top — no heavy work / imports before this
	if (req.method === 'OPTIONS') {
		return new Response('ok', { headers: corsHeaders });
	}

	try {
		if (req.method !== 'POST') {
			return json({ error: 'Method not allowed' }, 405);
		}

		const authHeader = req.headers.get('Authorization');
		if (!authHeader) {
			return json({ error: 'Missing Authorization' }, 401);
		}

		const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
		const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')!;
		const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
		const programIdStr = Deno.env.get('FLOAT_PROGRAM_ID');
		const rpcUrl = Deno.env.get('SOLANA_RPC_URL') ?? 'https://api.devnet.solana.com';

		if (!programIdStr) {
			return json({ error: 'FLOAT_PROGRAM_ID secret not set' }, 500);
		}

		const userClient = createClient(supabaseUrl, supabaseAnon, {
			global: { headers: { Authorization: authHeader } }
		});

		const { data: wallet, error: walletErr } = await userClient.rpc('current_wallet');
		if (walletErr || typeof wallet !== 'string' || !wallet) {
			return json(
				{ error: 'Not signed in', detail: walletErr?.message ?? 'no wallet' },
				401
			);
		}

		const body = await req.json().catch(() => ({}));
		const groupStr = body?.group as string | undefined;
		/** Optional: client-derived MemberBalance PDA (base58). Recommended. */
		const memberBalanceStr = body?.memberBalance as string | undefined;

		if (!groupStr) {
			return json({ error: 'Missing body.group (group PDA base58)' }, 400);
		}
		if (!memberBalanceStr) {
			return json(
				{
					error:
						'Missing body.memberBalance (MemberBalance PDA base58). Pass it from the client.'
				},
				400
			);
		}

		let groupBytes: Uint8Array;
		let memberBytes: Uint8Array;
		try {
			groupBytes = bs58.decode(groupStr);
			memberBytes = bs58.decode(wallet);
			bs58.decode(memberBalanceStr);
			bs58.decode(programIdStr);
		} catch {
			return json({ error: 'Invalid base58 pubkey' }, 400);
		}

		if (groupBytes.length !== 32 || memberBytes.length !== 32) {
			return json({ error: 'Invalid pubkey length' }, 400);
		}

		// JSON-RPC only — no web3.js
		const account = await getAccountInfo(rpcUrl, memberBalanceStr);
		if (!account) {
			return json(
				{
					error: 'Not a member on-chain',
					memberBalance: memberBalanceStr,
					wallet,
					group: groupStr
				},
				403
			);
		}

		if (account.owner !== programIdStr) {
			return json(
				{ error: 'Account not owned by Float program', owner: account.owner },
				403
			);
		}

		const data = Uint8Array.from(atob(account.data[0]), (c) => c.charCodeAt(0));
		// MemberBalance: disc(8) + group(32) + member(32) + ...
		if (data.length < 72) {
			return json({ error: 'Account data too short' }, 403);
		}

		const groupInAccount = data.subarray(8, 40);
		const memberInAccount = data.subarray(40, 72);
		if (!bytesEq(groupInAccount, groupBytes) || !bytesEq(memberInAccount, memberBytes)) {
			return json({ error: 'PDA data mismatch' }, 403);
		}

		const admin = createClient(supabaseUrl, serviceKey);
		const { error: upsertErr } = await admin.from('group_members').upsert(
			{
				group_pubkey: groupStr,
				wallet
			},
			{ onConflict: 'group_pubkey,wallet' }
		);

		if (upsertErr) {
			console.error('upsert group_members', upsertErr);
			return json({ error: upsertErr.message }, 500);
		}

		return json({
			ok: true,
			group: groupStr,
			wallet,
			memberBalance: memberBalanceStr
		});
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		console.error('sync-membership', message);
		return json({ error: message }, 500);
	}
});

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { ...corsHeaders, 'Content-Type': 'application/json' }
	});
}

function bytesEq(a: Uint8Array, b: Uint8Array): boolean {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
	return true;
}

async function getAccountInfo(
	rpcUrl: string,
	pubkey: string
): Promise<{ owner: string; data: [string, string] } | null> {
	const res = await fetch(rpcUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			jsonrpc: '2.0',
			id: 1,
			method: 'getAccountInfo',
			params: [pubkey, { encoding: 'base64', commitment: 'confirmed' }]
		})
	});
	if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
	const body = await res.json();
	if (body.error) throw new Error(body.error.message ?? 'RPC error');
	return body.result?.value ?? null;
}
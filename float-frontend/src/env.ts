import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	PUBLIC_SUPABASE_URL: { public: true, static: true },
	PUBLIC_SUPABASE_ANON_KEY: { public: true, static: true },
	PUBLIC_SOLANA_RPC_URL: { public: true, static: true },
	PUBLIC_FLOAT_PROGRAM_ID: { public: true, static: true },
	PUBLIC_USDC_MINT: { public: true, static: true }
});

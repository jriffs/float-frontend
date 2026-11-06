// src/lib/supabase/core.ts
// Types, client, wallet auth and image helpers. Strict-TS, SvelteKit.

import { createClient } from '@supabase/supabase-js';

import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$app/env/public';

import type { Adapter } from '@solana/wallet-adapter-base';

// ---------- Types ------------------------------------------------------------
export const EXPENSE_CATEGORIES = [
  'food', 'drinks', 'groceries', 'transport', 'lodging', 'activities', 'shopping', 'other',
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface Profile {
  wallet: string;
  user_id: string;
  display_name: string;
  avatar_path: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseMeta {
  group_pubkey: string;
  expense_index: number;
  category: ExpenseCategory;
  note: string | null;
  receipt_path: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ---------- Client -----------------------------------------------------------

export const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

// ---------- Wallet auth (Sign in with Solana) --------------------------------

const SIGN_IN_STATEMENT =
  'Sign in to Float. This only proves wallet ownership; it does not move funds or grant permissions.';

type SolanaSignIn = Extract<Parameters<typeof supabase.auth.signInWithWeb3>[0], { chain: 'solana' }>;

/**
 * Prompts the wallet for a SIWS signature and creates a Supabase session.
 * Pass the wallet adapter's wallet object if you have one; otherwise the
 * supabase-js default (window.solana) is used.
 */
/* export async function signInWithWallet(wallet?: Adapter): Promise<string> {
  const { error } = await supabase.auth.signInWithWeb3({
    chain: 'solana',
    statement: SIGN_IN_STATEMENT,
    ...wallet ? { wallet: wallet as any } : {}
  });
  if (error) throw new Error(`Wallet sign-in failed: ${error.message}`);
  return getSessionWallet();
} */

/* export async function signInWithWallet(wallet?: any): Promise<string> {
  // Pass the wallet adapter context cleanly into the SDK parameters
  const { data, error } = await supabase.auth.signInWithWeb3({
    chain: 'solana',
    statement: SIGN_IN_STATEMENT,
    ...(wallet ? { wallet } : {})
  });

  if (error) {
    throw new Error(`Wallet sign-in failed: ${error.message}`);
  }

  // Return the active session token to satisfy your authentication flow pipeline
  return data?.session?.access_token || '';
} */

/**
 * Manually logs a user into Supabase using a Solana signature.
 * Bypasses Supabase's automatic SIWS formatting bugs.
 */
/* export async function signInWithWalletManual(
  address: string, 
  signMessageFn: (msg: Uint8Array) => Promise<Uint8Array>
): Promise<string> {
  
  const statement = 'Link your Solana wallet to your account';
  
  // 1. Build a clean message string that Phantom can parse without formatting errors
  const messageText = `${statement}\nWallet Address: ${address}\nTimestamp: ${Date.now()}`;
  const messageBytes = new TextEncoder().encode(messageText);

  // 2. Collect the raw binary signature bytes from Phantom
  const signatureBytes = await signMessageFn(messageBytes);
  
  // 3. Pass the raw text and the Uint8Array signature directly to Supabase
  const { data, error } = await supabase.auth.signInWithWeb3({
    chain: 'solana',
    statement,
    message: messageText,
    signature: signatureBytes // Pass the binary Uint8Array directly here
  } as any);

  if (error) {
    throw new Error(`Manual wallet auth failed: ${error.message}`);
  }

  return data?.session?.access_token || '';
} */


/**
 * Prompts the wallet for a SIWS signature and creates a Supabase session.
 * Pass the wallet adapter signer from WalletStore.signer().
 */
export async function signInWithWallet(wallet?: {
  publicKey: { toBase58(): string; toBytes(): Uint8Array };
  signMessage(message: Uint8Array): Promise<Uint8Array>;
}): Promise<string> {
  if (!wallet) throw new Error('No wallet provided');

  const url = new URL(window.location.href);
  const address = wallet.publicKey.toBase58();
  const statement =
    'Sign in to Float. This only proves wallet ownership; it does not move funds or grant permissions.';

  // Order and shape that Phantom’s SIWS validator accepts
  const message = [
    `${url.host} wants you to sign in with your Solana account:`,
    address,
    '',
    statement,
    '',
    `URI: ${url.origin}/`,          // origin (no path) is safest
    'Version: 1',
    `Issued At: ${new Date().toISOString()}`,
  ].join('\n');

  const messageBytes = new TextEncoder().encode(message);
  const signature = await wallet.signMessage(messageBytes);

  const { data, error } = await supabase.auth.signInWithWeb3({
    chain: 'solana',
    message,
    signature, // Uint8Array is fine; SDK base64url-encodes it
  } as any);

  if (error) throw new Error(`Wallet sign-in failed: ${error.message}`);
  if (!data.session) throw new Error('No session returned from wallet sign-in.');

  return getSessionWallet();
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

/** Wallet bound to the current session, resolved by the database (not the client). */
export async function getSessionWallet(): Promise<string> {
  const { data, error } = await supabase.rpc('current_wallet');
  if (error) throw new Error(error.message);
  if (typeof data !== 'string' || !data) throw new Error('No wallet bound to this session');
  return data;
}

/**
 * Call when the connected wallet changes. Returns true if the Supabase session
 * matches `connectedWallet`; otherwise signs out so the UI can prompt re-auth.
 */
export async function sessionMatchesWallet(connectedWallet: string): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return false;
  try {
    if (await getSessionWallet() === connectedWallet) return true;
  } catch {
    /* fall through */
  }

  await supabase.auth.signOut();
  return false;
}

// ---------- Images -----------------------------------------------------------

const MIME_EXT: Record<string, string> = {
  'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg', 'application/pdf': 'pdf',
};
export const extFor = (mime: string): string => MIME_EXT[mime] ?? 'bin';

/**
 * Resizes and re-encodes in the browser (WebP; Safari may fall back to PNG, so
 * always use blob.type). Throws on formats the browser cannot decode (e.g. HEIC on Chrome).
 */
export async function compressImage(file: File, maxDim: number, quality = 0.82): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('This image format is not supported. Please use JPG, PNG or WebP.');
  }
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image processing is unavailable in this browser.');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise<Blob>((resolve, reject) => canvas.toBlob(
    (blob) => blob
      ? resolve(blob)
      : reject(new Error('Could not encode image.')),
    'image/webp',
      quality,
    ),
  );
}


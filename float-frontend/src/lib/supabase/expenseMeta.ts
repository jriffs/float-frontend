// src/lib/supabase/expenseMeta.ts

import {
  supabase, compressImage, extFor, getSessionWallet,
  type ExpenseCategory, type ExpenseMeta,
} from './core';

const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;
const SIGNED_URL_TTL_SECONDS = 60 * 60;

// ---------- Membership mirror ------------------------------------------------

/**
 * Asks the Edge Function to verify on-chain membership and mirror it.
 * Call after `join_group` / `create_group` confirms, and as a self-heal when
 * opening a group the mirror does not know about yet.
 */
export async function syncMembership(group: string): Promise<void> {
  const { error } = await supabase.functions.invoke('sync-membership', { body: { group } });
  if (error) throw new Error(`Could not verify group membership: ${error.message}`);
}

export async function isMirroredMember(group: string): Promise<boolean> {
  const wallet = await getSessionWallet();
  const { data, error } = await supabase
    .from('group_members').select('wallet').eq('group_pubkey', group).eq('wallet', wallet).maybeSingle();
  if (error) throw new Error(error.message);
  return data !== null;
}

export async function ensureMembership(group: string): Promise<void> {
  if (!(await isMirroredMember(group))) await syncMembership(group);
}

// ---------- Metadata ---------------------------------------------------------

export async function listExpenseMeta(group: string): Promise<Map<number, ExpenseMeta>> {
  const { data, error } = await supabase
    .from('expense_meta').select('*').eq('group_pubkey', group);
  if (error) throw new Error(error.message);
  return new Map((data as ExpenseMeta[]).map((m) => [m.expense_index, m]));
}

export interface ExpenseMetaInput {
  category: ExpenseCategory;
  note?: string | null;
  receipt?: File | null;
}

/**
 * Creates metadata for an expense that already exists on-chain.
 * Uploads the receipt first, then the row; cleans up the file if the row fails.
 */
export async function createExpenseMeta(
  group: string,
  expenseIndex: number,
  input: ExpenseMetaInput,
): Promise<ExpenseMeta> {
  if (input.note && input.note.length > 280) throw new Error('Note must be 280 characters or fewer.');
  const wallet = await getSessionWallet();

  const receiptPath = input.receipt ? await uploadReceipt(group, expenseIndex, input.receipt) : null;

  const { data, error } = await supabase
    .from('expense_meta')
    .insert({
      group_pubkey: group,
      expense_index: expenseIndex,
      category: input.category,
      note: input.note?.trim() || null,
      receipt_path: receiptPath,
      created_by: wallet,
    })
    .select('*')
    .single();

  if (error) {
    if (receiptPath) await supabase.storage.from('receipts').remove([receiptPath]);
    throw new Error(error.message);
  }
  return data as ExpenseMeta;
}

export async function updateExpenseMeta(
  group: string,
  expenseIndex: number,
  patch: { category?: ExpenseCategory; note?: string | null },
): Promise<ExpenseMeta> {
  if (patch.note && patch.note.length > 280) throw new Error('Note must be 280 characters or fewer.');
  const update: Record<string, string | null> = {};
  if (patch.category !== undefined) update.category = patch.category;
  if (patch.note !== undefined) update.note = patch.note?.trim() || null;

  const { data, error } = await supabase
    .from('expense_meta').update(update)
    .eq('group_pubkey', group).eq('expense_index', expenseIndex)
    .select('*').single();
  if (error) throw new Error(error.message);
  return data as ExpenseMeta;
}

// ---------- Receipts ---------------------------------------------------------

/** Images are compressed to <=1600px WebP; PDFs pass through. Max 5 MB after processing. */
export async function uploadReceipt(group: string, expenseIndex: number, file: File): Promise<string> {
  const isPdf = file.type === 'application/pdf';
  const body: Blob = isPdf ? file : await compressImage(file, 1600, 0.8);
  if (body.size > RECEIPT_MAX_BYTES) throw new Error('Receipt is too large (max 5 MB).');

  const path = `${group}/${expenseIndex}/${crypto.randomUUID()}.${extFor(body.type)}`;
  const { error } = await supabase.storage
    .from('receipts').upload(path, body, { contentType: body.type, upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

/** Attach (or replace) a receipt on existing metadata. */
export async function setReceipt(group: string, expenseIndex: number, file: File): Promise<ExpenseMeta> {
  const { data: existing, error: readError } = await supabase
    .from('expense_meta').select('receipt_path')
    .eq('group_pubkey', group).eq('expense_index', expenseIndex).single();
  if (readError) throw new Error(readError.message);

  const newPath = await uploadReceipt(group, expenseIndex, file);
  const { data, error } = await supabase
    .from('expense_meta').update({ receipt_path: newPath })
    .eq('group_pubkey', group).eq('expense_index', expenseIndex)
    .select('*').single();
  if (error) {
    await supabase.storage.from('receipts').remove([newPath]);
    throw new Error(error.message);
  }
  if (existing?.receipt_path) {
    await supabase.storage.from('receipts').remove([existing.receipt_path]); // best-effort
  }
  return data as ExpenseMeta;
}

/** Private bucket: always use short-lived signed URLs, never store them. */
export async function getReceiptUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('receipts').createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data) throw new Error(error?.message ?? 'Could not load receipt.');
  return data.signedUrl;
}

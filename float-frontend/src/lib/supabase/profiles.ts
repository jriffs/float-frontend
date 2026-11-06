// src/lib/supabase/profiles.ts

import { supabase, compressImage, extFor, getSessionWallet, type Profile } from './core';

export async function getProfile(wallet: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles').select('*').eq('wallet', wallet).maybeSingle();
  if (error) throw new Error(error.message);
  return data as Profile | null;
}

/** Batch lookup for group member lists. Missing wallets simply have no entry. */
export async function getProfiles(wallets: string[]): Promise<Map<string, Profile>> {
  const unique = [...new Set(wallets)];
  if (unique.length === 0) return new Map();
  const { data, error } = await supabase.from('profiles').select('*').in('wallet', unique);
  if (error) throw new Error(error.message);
  return new Map((data as Profile[]).map((p) => [p.wallet, p]));
}

export interface ProfileInput {
  display_name: string;
  bio?: string | null;
}

function validate(input: Partial<ProfileInput>): void {
  if (input.display_name !== undefined) {
    const len = input.display_name.trim().length;
    if (len < 1 || len > 32) throw new Error('Display name must be 1 to 32 characters.');
  }
  if (input.bio && input.bio.length > 160) throw new Error('Bio must be 160 characters or fewer.');
}

/** First-time profile creation (onboarding). Use updateProfile afterwards. */
export async function createProfile(input: ProfileInput): Promise<Profile> {
  validate(input);
  const wallet = await getSessionWallet();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Not signed in.');

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      wallet,
      user_id: userData.user.id,
      display_name: input.display_name.trim(),
      bio: input.bio?.trim() || null,
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as Profile;
}

export async function updateProfile(patch: Partial<ProfileInput>): Promise<Profile> {
  validate(patch);
  const wallet = await getSessionWallet();
  const update: Record<string, string | null> = {};
  if (patch.display_name !== undefined) update.display_name = patch.display_name.trim();
  if (patch.bio !== undefined) update.bio = patch.bio?.trim() || null;

  const { data, error } = await supabase
    .from('profiles').update(update).eq('wallet', wallet).select('*').single();
  if (error) throw new Error(error.message);
  return data as Profile;
}

/** Compresses to <=512px, uploads under {wallet}/, updates the row, removes the old file. */
export async function uploadAvatar(file: File): Promise<Profile> {
  const wallet = await getSessionWallet();
  const current = await getProfile(wallet);
  if (!current) throw new Error('Create a profile first.');

  const blob = await compressImage(file, 512, 0.85);
  const path = `${wallet}/avatar-${Date.now()}.${extFor(blob.type)}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars').upload(path, blob, { contentType: blob.type, upsert: false });
  if (uploadError) throw new Error(uploadError.message);

  const { data, error } = await supabase
    .from('profiles').update({ avatar_path: path }).eq('wallet', wallet).select('*').single();
  if (error) {
    await supabase.storage.from('avatars').remove([path]); // avoid orphan
    throw new Error(error.message);
  }

  if (current.avatar_path) {
    await supabase.storage.from('avatars').remove([current.avatar_path]); // best-effort
  }
  return data as Profile;
}

export function avatarUrl(profile: Pick<Profile, 'avatar_path'> | null | undefined): string | null {
  if (!profile?.avatar_path) return null;
  return supabase.storage.from('avatars').getPublicUrl(profile.avatar_path).data.publicUrl;
}

/** Deterministic gradient from a wallet address; used when no avatar is set. */
export function fallbackAvatarGradient(wallet: string): string {
  let hash = 0;
  for (let i = 0; i < wallet.length; i++) hash = (hash * 31 + wallet.charCodeAt(i)) >>> 0;
  const hueA = hash % 360;
  const hueB = (hueA + 40 + ((hash >>> 8) % 80)) % 360;
  return `linear-gradient(135deg, hsl(${hueA} 70% 55%), hsl(${hueB} 70% 45%))`;
}

export const shortAddress = (wallet: string): string => `${wallet.slice(0, 4)}…${wallet.slice(-4)}`;

/** Display name with truncated-address fallback. */
export const displayName = (wallet: string, profile?: Profile | null): string =>
  profile?.display_name ?? shortAddress(wallet);

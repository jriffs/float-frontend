// src/lib/auth/session.ts
// Lets the root layout tell "the user signed out" apart from "the session died".

import { signOut } from '#lib/supabase/core.ts';

let userInitiated = false;

/** Use this (not core.signOut) for every sign-out button. */
export async function signOutUser(): Promise<void> {
	userInitiated = true;
	try {
		await signOut();
	} catch (e) {
		userInitiated = false;
		throw e;
	}
}

/** Returns true once if the last SIGNED_OUT was started by the user. */
export function consumeUserSignOut(): boolean {
	const value = userInitiated;
	userInitiated = false;
	return value;
}

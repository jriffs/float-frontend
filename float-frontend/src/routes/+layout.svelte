<script lang="ts">
    import '#lib/polyfills.ts';
	import "./layout.css";
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import { resolve } from "$app/paths";
	import { supabase } from "#lib/supabase/core.ts";
	import { consumeUserSignOut } from "#lib/auth/session.ts";
	import {
		WalletStore,
		setWalletContext,
	} from "#lib/wallet/wallet.svelte.ts";
	import { browser } from "$app/environment";
	import { Buffer } from "buffer";

	// Explicitly assign Buffer to the global window context when rendering in the browser
	if (browser) {
		window.Buffer = Buffer;
	}

	let { children } = $props();

	const wallet = new WalletStore();
	setWalletContext(wallet);

	onMount(() => {
		// A SIGNED_OUT we did not start (token refresh failed, wallet switched) means the session expired.
		const { data } = supabase.auth.onAuthStateChange((event) => {
			if (event !== "SIGNED_OUT") return;
			if (consumeUserSignOut()) return;
			if (page.url.pathname === resolve("/")) return; // the connect screen handles its own state
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			void goto(`${resolve("/")}?expired=1`, { replaceState: true });
		});

		return () => {
			data.subscription.unsubscribe();
			wallet.destroy();
		};
	});
</script>

<svelte:head>
	<title>Float</title>
	<meta name="theme-color" content="#0B1220" />
</svelte:head>

<div class="mx-auto min-h-dvh w-full max-w-[430px]">
	{@render children()}
</div>

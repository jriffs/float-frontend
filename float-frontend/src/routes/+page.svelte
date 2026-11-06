<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { getProfile } from '#lib/supabase/profiles.ts';
	import { getWalletContext } from '#lib/wallet/wallet.svelte.ts';
	import { ConnectFlow } from '#lib/connect/connect-flow.svelte.ts';
	import { safeRedirect } from '#lib/connect/redirect.ts';
	import Welcome from '#lib/connect/Welcome.svelte';
	import SignStep from '#lib/connect/SignStep.svelte';
	import WalletSheet from '#lib/connect/WalletSheet.svelte';

	const wallet = getWalletContext();

	// ?redirectTo=/some/path lets deep links (e.g. invites) resume after sign-in.
	const redirectTo = safeRedirect(page.url.searchParams.get('redirectTo'));

	const flow = new ConnectFlow(wallet, {
		async onAuthenticated(address) {
			const profile = await getProfile(address);
			if (!profile) {
				const query = redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : '';
				// eslint-disable-next-line svelte/no-navigation-without-resolve
				await goto(`${resolve('onboarding')}${query}`, { replaceState: true });
				return;
			}
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			await goto(redirectTo ?? resolve('groups'), { replaceState: true });
		}
	});

	onMount(() => {
		if (page.url.searchParams.has('expired')) flow.showExpired();
		void flow.bootstrap();
	});

	// If the wallet disconnects from its own UI while signing, fall back to the welcome screen.
	$effect(() => {
		if (flow.step === 'sign' && wallet.status === 'disconnected') flow.backToWelcome();
	});
</script>

{#if flow.step === 'sign'}
	<SignStep flow={flow} wallet={wallet} />
{:else}
	<Welcome loading={flow.booting} onconnect={() => flow.openPicker()} />
{/if}

<WalletSheet flow={flow} wallet={wallet} />

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
	import OnboardingCarousel from '#lib/components/OnboardingCarousel.svelte';

	const STORAGE_KEY = 'float_carousel_done';
	const wallet = getWalletContext();

	// ?redirectTo=/some/path lets deep links (e.g. invites) resume after sign-in.
	const redirectTo = safeRedirect(page.url.searchParams.get('redirectTo'));

	let showCarousel = $state(false);
	let ready = $state(false);

	const flow = new ConnectFlow(wallet, {
			async onAuthenticated(address) {
				const profile = await getProfile(address);
				if (!profile) {
					const query = redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : '';
					await goto(`${resolve('onboarding')}${query}`, { replaceState: true });
					return;
				}
				await goto(redirectTo ?? resolve('groups'), { replaceState: true });
			}
		});

		onMount(() => {
			// only show the marketing carousel once
			const seen = localStorage.getItem(STORAGE_KEY) === '1';
			showCarousel = !seen;
			ready = true;

			if (page.url.searchParams.has('expired')) flow.showExpired();
			if (!showCarousel) void flow.bootstrap();
		});

		function finishCarousel() {
			localStorage.setItem(STORAGE_KEY, '1');
			showCarousel = false;
			void flow.bootstrap();
		}

		$effect(() => {
			if (flow.step === 'sign' && wallet.status === 'disconnected') flow.backToWelcome();
		});
</script>

{#if !ready}
	<!-- tiny flash prevention while we read localStorage -->
	<main class="flex min-h-dvh items-center justify-center">
		<span class="text-sm font-bold text-mute">Loading…</span>
	</main>
{:else if showCarousel}
	<OnboardingCarousel onfinish={finishCarousel} />
{:else if flow.step === 'sign'}
	<SignStep {flow} {wallet} />
{:else}
	<Welcome loading={flow.booting} onconnect={() => flow.openPicker()} />
{/if}

{#if !showCarousel}
	<WalletSheet {flow} {wallet} />
{/if}

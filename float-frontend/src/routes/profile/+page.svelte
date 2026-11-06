<!-- Minimal Profile tab target so bottom nav is not a dead end. Full Profile screen is later. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { getWalletContext } from '#lib/wallet/wallet.svelte.ts';
	import { signOutUser } from '#lib/auth/session.ts';
	import {
		getProfile,
		avatarUrl,
		fallbackAvatarGradient,
		displayName,
		shortAddress
	} from '#lib/supabase/profiles.ts';
	import type { Profile } from '#lib/supabase/core.ts';
	import Button from '#lib/components/ui/Button.svelte';
	import BottomNav from '#lib/components/nav/BottomNav.svelte';

	const wallet = getWalletContext();
	let profile = $state<Profile | null>(null);

	onMount(async () => {
		if (!wallet.address) {
			await goto(resolve('/'), { replaceState: true });
			return;
		}
		try {
			profile = await getProfile(wallet.address);
		} catch {
			profile = null;
		}
	});

	async function leave() {
		await signOutUser();
		await wallet.disconnect();
		await goto(resolve('/'));
	}
</script>

<main class="flex min-h-dvh flex-col">
	<header class="px-5 pt-[max(22px,env(safe-area-inset-top))]">
		<h1 class="font-display text-[32px] font-semibold">Profile</h1>
	</header>

	<div class="flex flex-1 flex-col items-center px-6 pt-10 text-center">
		{#if wallet.address}
			{#if avatarUrl(profile)}
				<img src={avatarUrl(profile)} alt="" class="size-24 rounded-full object-cover" />
			{:else}
				<div
					class="grid size-24 place-items-center rounded-full font-display text-4xl font-semibold text-white"
					style:background={fallbackAvatarGradient(wallet.address)}
				>
					{(profile?.display_name ?? '?')[0]?.toUpperCase()}
				</div>
			{/if}
			<p class="mt-4 font-display text-2xl font-semibold">
				{displayName(wallet.address, profile)}
			</p>
			<p class="mt-1 text-sm font-bold text-mute">{shortAddress(wallet.address)}</p>
		{/if}

		<div class="mt-10 w-full max-w-xs">
			<Button variant="secondary" onclick={leave}>Sign out</Button>
		</div>
	</div>

	<BottomNav active="profile" />
</main>
<!-- PLACEHOLDER so the S1 flow can land somewhere. Replaced by S3 (Groups list). -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { signOutUser } from '#lib/auth/session.ts';
	import { getWalletContext } from '#lib/wallet/wallet.svelte.ts';
	import Button from '#lib/components/ui/Button.svelte';

	const wallet = getWalletContext();

	async function leave() {
		await signOutUser();
		await wallet.disconnect();
		await goto(resolve('/'));
	}
</script>

<main class="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
	<h1 class="font-display text-3xl font-semibold">Groups</h1>
	<p class="text-sm break-all text-mute">Signed in as {wallet.address ?? 'unknown'}. S3 replaces this page.</p>
	<Button variant="secondary" onclick={leave}>Sign out</Button>
</main>

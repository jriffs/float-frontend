<!-- Placeholder until Group Detail (Balances | Pool | History) is built. -->
<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Button from '#lib/components/ui/Button.svelte';

	const pubkey = $derived(page.params.pubkey ?? '');
</script>

<main class="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
	<h1 class="font-display text-3xl font-semibold">Group detail</h1>
	<p class="max-w-xs break-all text-sm font-semibold text-mute">
		Balances · Pool · History screens land here.<br />
		<span class="text-xs">{pubkey}</span>
	</p>
	<Button variant="secondary" onclick={() => goto(resolve('/groups'))}>Back to groups</Button>
</main>
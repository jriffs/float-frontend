<!-- Placeholder until Create Group screen is designed/built. -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Button from '#lib/components/ui/Button.svelte';
</script>

<main class="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
	<h1 class="font-display text-3xl font-semibold">Create a group</h1>
	<p class="max-w-xs text-sm font-semibold text-mute">
		Screen coming next. This route is reserved so Groups CTAs have a real destination.
	</p>
	<Button variant="secondary" onclick={() => goto(resolve('/groups'))}>Back to groups</Button>
</main>
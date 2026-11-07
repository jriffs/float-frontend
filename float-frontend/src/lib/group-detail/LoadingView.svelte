<script lang="ts">
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import IconButton from '#lib/components/ui/IconButton.svelte';
	import BottomNav from '#lib/components/nav/BottomNav.svelte';
</script>

<main class="flex min-h-dvh flex-col">
	<header
		class="flex items-center gap-3 px-5 pt-[max(20px,env(safe-area-inset-top))]"
	>
		<div class="size-11 rounded-[18px] bg-raised"></div>
		<div class="min-w-0 flex-1 space-y-2">
			<div class="h-5 w-40 animate-pulse rounded-full bg-raised"></div>
			<div class="h-3 w-20 animate-pulse rounded-full bg-raised"></div>
		</div>
		<div class="size-11 rounded-[18px] bg-raised"></div>
	</header>

	<div class="mx-5 mt-5 rounded-[28px] bg-surface p-5">
		<div class="h-3 w-24 animate-pulse rounded-full bg-raised"></div>
		<div class="mt-3 h-9 w-32 animate-pulse rounded-full bg-raised"></div>
		<div class="mt-3 flex gap-2">
			<div class="h-3 w-28 animate-pulse rounded-full bg-raised"></div>
			<div class="h-3 w-24 animate-pulse rounded-full bg-raised"></div>
		</div>
	</div>

	<div class="mx-5 mt-4 flex gap-2">
		{#each ['Balances', 'Pool', 'History'] as label}
			<div class="h-10 flex-1 animate-pulse rounded-full bg-raised"></div>
		{/each}
	</div>

	<div class="mx-5 mt-5 space-y-3">
		<div class="h-4 w-28 animate-pulse rounded-full bg-raised"></div>
		{#each [1, 2, 3] as _}
			<div class="h-[72px] animate-pulse rounded-[22px] bg-surface"></div>
		{/each}
	</div>

	<div class="flex-1"></div>

	<div class="mx-5 mb-3 flex gap-2.5">
		<div class="h-13 flex-1 animate-pulse rounded-[18px] bg-raised"></div>
		<div class="h-13 flex-1 animate-pulse rounded-[18px] bg-raised"></div>
	</div>
	<BottomNav active="groups" />
</main>
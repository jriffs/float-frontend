<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import Button from '#lib/components/ui/Button.svelte';
	import type { JoinFlow } from './join-flow.svelte.ts';

	interface Props {
		flow: JoinFlow;
		ongroup: (pubkey: string) => void;
	}

	let { flow, ongroup }: Props = $props();

	const group = $derived(flow.preview);
</script>

<main class="flex min-h-dvh flex-col pb-[max(1.25rem,env(safe-area-inset-bottom))]">
	<div class="flex flex-1 flex-col items-center justify-center px-6 text-center">
		<div class="grid size-20 place-items-center rounded-[28px] bg-mint/16 text-mint">
			<Check size={40} strokeWidth={2.6} aria-hidden="true" />
		</div>

		<p class="mt-6 text-xs font-extrabold tracking-[0.08em] text-mint">JOINED</p>
		<h1 class="mt-2 font-display text-[32px] leading-tight font-semibold tracking-tight">
			You are in!
		</h1>
		<p class="mt-2 max-w-xs text-base font-semibold text-mute">
			Welcome to {group?.name ?? 'the group'}. Add your first expense or take a look around.
		</p>

		{#if group?.poolEnabled}
			<p class="mt-4 text-[13px] font-semibold text-mute">
				<span class="font-extrabold text-amber">Pool is on.</span>
				Deposit from the Pool tab.
			</p>
		{/if}
	</div>

	<div class="px-5 pt-2">
		<Button onclick={() => group && ongroup(group.pubkey)}>Go to group</Button>
	</div>
</main>
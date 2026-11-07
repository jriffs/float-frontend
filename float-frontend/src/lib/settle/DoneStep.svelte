<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import Button from '#lib/components/ui/Button.svelte';
	import { SettleFlow, formatMajor } from './settle-flow.svelte.ts';

	interface Props {
		flow: SettleFlow;
		ondone: () => void;
	}

	let { flow, ondone }: Props = $props();

	const full = $derived(flow.remainingMinor === 0);
</script>

<main class="flex min-h-dvh flex-col pb-[max(1.25rem,env(safe-area-inset-bottom))]">
	<div class="flex flex-1 flex-col items-center justify-center px-6 text-center">
		<div
			class={[
				'grid size-20 place-items-center rounded-[28px]',
				full ? 'bg-mint/16 text-mint' : 'bg-raised-2 text-ink'
			]}
		>
			<Check size={40} strokeWidth={2.6} aria-hidden="true" />
		</div>

		{#if full}
			<h1 class="mt-6 font-display text-[28px] font-semibold tracking-tight">
				You and {flow.peer?.displayName ?? ''} are even
			</h1>
			<p class="mt-2 max-w-xs text-[15px] font-semibold text-mute">
				You paid ${formatMajor(flow.paidMinor)}. Nothing left to settle.
			</p>
		{:else}
			<h1 class="mt-6 font-display text-[28px] font-semibold tracking-tight">
				Paid ${formatMajor(flow.paidMinor)}, ${formatMajor(flow.remainingMinor)} left
			</h1>
			<p class="mt-2 max-w-xs text-[15px] font-semibold text-mute">
				A partial payment went through. You can settle the rest when ready.
			</p>
		{/if}

		<div class="mt-8 w-full max-w-sm overflow-hidden rounded-[24px] bg-surface">
			<div class="flex items-center justify-between px-4 py-3.5">
				<span class="text-[14px] font-bold text-mute">
					You owed {flow.peer?.displayName ?? ''}
				</span>
				<span class="font-display text-[15px] font-semibold tabular-nums">
					${formatMajor(flow.paidMinor + flow.remainingMinor)}
				</span>
			</div>
			<div class="h-px bg-raised-2"></div>
			<div class="flex items-center justify-between px-4 py-3.5">
				<span class="text-[14px] font-bold text-mute">Now</span>
				<span
					class={[
						'font-display text-[15px] font-semibold tabular-nums',
						full ? 'text-mint' : 'text-coral'
					]}
				>
					${formatMajor(flow.remainingMinor)}
				</span>
			</div>
		</div>
	</div>

	<div class="flex flex-col gap-2.5 px-5 pt-2">
		{#if full}
			<Button onclick={ondone}>Done</Button>
			<Button variant="secondary" onclick={() => console.info('[float] view tx')}>
				View transaction
			</Button>
		{:else}
			<Button onclick={ondone}>Done</Button>
			<Button variant="secondary" onclick={() => flow.payTheRest()}>Pay the rest</Button>
		{/if}
	</div>
</main>
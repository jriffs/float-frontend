<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import Button from '#lib/components/ui/Button.svelte';
	import { formatUsdc } from '#lib/groups/format.ts';
	import { ExpenseFlow, formatMajor } from './expense-flow.svelte.ts';

	interface Props {
		flow: ExpenseFlow;
		ondone: () => void;
	}

	let { flow, ondone }: Props = $props();

	const others = $derived(flow.participants.filter((p) => !p.isYou && p.shareMinor > 0));
	const eachShare = $derived(
		others.length > 0 && flow.splitMode === 'equal'
			? others[0]!.shareMinor
			: null
	);
</script>

<main class="flex min-h-dvh flex-col pb-[max(1.25rem,env(safe-area-inset-bottom))]">
	<div class="flex flex-1 flex-col items-center justify-center px-6 text-center">
		<div class="grid size-20 place-items-center rounded-[28px] bg-mint/16 text-mint">
			<Check size={40} strokeWidth={2.6} aria-hidden="true" />
		</div>

		<h1 class="mt-6 font-display text-[28px] font-semibold tracking-tight">
			{flow.description || 'Expense'} added
		</h1>
		<p class="mt-2 max-w-xs text-[15px] font-semibold text-mute">
			${formatMajor(flow.amountMinor)} split {flow.participants.length} ways. You are owed
			<span class="text-mint">{formatUsdc(flow.resultOwedToYou)}</span>
		</p>

		{#if others.length > 0}
			<div class="mt-8 w-full max-w-sm rounded-[24px] bg-surface p-4 text-left">
				<p class="mb-3 text-[11px] font-extrabold tracking-[0.08em] text-mute">
					NOW OWES YOU
				</p>
				<ul class="flex flex-col gap-2.5">
					{#each others as p (p.wallet)}
						<li class="flex items-center gap-3">
							<span
								class="grid size-9 place-items-center rounded-full grad-brand text-xs font-semibold text-white"
							>
								{p.displayName[0]}
							</span>
							<span class="flex-1 text-[14px] font-extrabold">{p.displayName}</span>
							<span class="font-display text-[15px] font-semibold tabular-nums text-mint">
								{formatUsdc(p.shareMinor)}
							</span>
						</li>
					{/each}
				</ul>
				{#if eachShare !== null}
					<p class="mt-3 text-center text-[12px] font-bold text-mute">
						{formatUsdc(eachShare, { signed: false })} each
					</p>
				{/if}
			</div>
		{/if}
	</div>

	<div class="flex flex-col gap-2.5 px-5 pt-2">
		<Button onclick={ondone}>Done</Button>
		<Button variant="secondary" onclick={() => flow.resetForAnother()}>Add another</Button>
	</div>
</main>
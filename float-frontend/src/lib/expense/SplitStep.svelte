<script lang="ts">
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import Button from '#lib/components/ui/Button.svelte';
	import IconButton from '#lib/components/ui/IconButton.svelte';
	import NetworkBadge from '#lib/components/ui/NetworkBadge.svelte';
	import { formatUsdc } from '#lib/groups/format.ts';
	import { ExpenseFlow, formatMajor, minorToMajor } from './expense-flow.svelte.ts';

	interface Props {
		flow: ExpenseFlow;
	}

	let { flow }: Props = $props();

	const equal = $derived(flow.splitMode === 'equal');
</script>

<main class="flex min-h-dvh flex-col pb-[max(1.25rem,env(safe-area-inset-bottom))]">
	<header
		class="flex items-center gap-3 px-5 pt-[max(20px,env(safe-area-inset-top))]"
	>
		<IconButton label="Back" onclick={() => flow.backToAmount()}>
			<ChevronLeft size={20} aria-hidden="true" />
		</IconButton>
		<div class="min-w-0 flex-1">
			<h1 class="font-display text-[22px] font-semibold">Split</h1>
			<p class="truncate text-[12px] font-bold text-mute">
				{flow.description || 'Expense'} · ${formatMajor(flow.amountMinor)}
			</p>
		</div>
		<NetworkBadge />
	</header>

	<!-- Equal / Custom toggle -->
	<div class="mx-5 mt-4 flex gap-1 rounded-full bg-raised p-1" role="tablist">
		<button
			type="button"
			role="tab"
			aria-selected={equal}
			class={[
				'flex-1 rounded-full py-2.5 text-[13px] font-extrabold',
				equal ? 'bg-surface text-ink shadow-sm' : 'text-mute'
			]}
			onclick={() => flow.setSplitMode('equal')}
		>
			Equal
		</button>
		<button
			type="button"
			role="tab"
			aria-selected={!equal}
			class={[
				'flex-1 rounded-full py-2.5 text-[13px] font-extrabold',
				!equal ? 'bg-surface text-ink shadow-sm' : 'text-mute'
			]}
			onclick={() => flow.setSplitMode('custom')}
		>
			Custom
		</button>
	</div>

	<ul class="mx-5 mt-5 flex flex-col gap-2.5">
		{#each flow.participants as p (p.wallet)}
			<li class="flex items-center gap-3 rounded-[22px] bg-surface px-3.5 py-3">
				<span
					class={[
						'grid size-11 shrink-0 place-items-center rounded-full font-display text-sm font-semibold text-white',
						p.isYou ? 'grad-violet' : 'grad-brand'
					]}
				>
					{p.displayName[0]?.toUpperCase() ?? '?'}
				</span>
				<span class="min-w-0 flex-1">
					<span class="block truncate text-[15px] font-extrabold">{p.displayName}</span>
					<span class="text-[12px] font-bold text-mute">
						{#if p.isYou}
							You paid
							{#if equal}
								· Your share
							{/if}
						{:else if equal}
							owes you
						{/if}
					</span>
				</span>
				{#if equal}
					<span class="font-display text-[16px] font-semibold tabular-nums text-ink">
						${formatMajor(p.shareMinor)}
					</span>
				{:else}
					<div class="flex items-center gap-1">
						<span class="text-sm font-bold text-mute">$</span>
						<input
							type="text"
							inputmode="decimal"
							class="w-16 rounded-[12px] bg-raised px-2 py-1.5 text-right font-display text-[15px] font-semibold tabular-nums outline-none"
							value={p.shareMinor ? minorToMajor(p.shareMinor).toFixed(2) : ''}
							oninput={(e) =>
								flow.setCustomShare(
									p.wallet,
									(e.currentTarget as HTMLInputElement).value
								)}
						/>
					</div>
				{/if}
			</li>
		{/each}
	</ul>

	{#if equal}
		<p class="mx-5 mt-4 text-center text-[12px] leading-snug font-semibold text-mute">
			Any rounding leftover goes to you, the payer. Up to 10 people per expense.
		</p>
		<p class="mx-5 mt-3 text-center text-[14px] font-extrabold text-mint">
			You will be owed {formatUsdc(flow.youAreOwed)}
		</p>
	{:else}
		<p
			class={[
				'mx-5 mt-4 text-center text-[14px] font-extrabold',
				flow.leftToAssign === 0
					? 'text-mint'
					: flow.leftToAssign > 0
						? 'text-amber'
						: 'text-coral'
			]}
		>
			{#if flow.leftToAssign === 0}
				Amounts add up
			{:else if flow.leftToAssign > 0}
				Left to assign · ${formatMajor(flow.leftToAssign)}
			{:else}
				Over by ${formatMajor(-flow.leftToAssign)}
			{/if}
		</p>
		{#if flow.leftToAssign !== 0}
			<p class="mx-5 mt-1 text-center text-[12px] font-semibold text-mute">
				Amounts must add up to ${formatMajor(flow.amountMinor)}
			</p>
		{/if}
	{/if}

	<div class="flex-1"></div>

	<div class="px-5 pt-4">
		<Button disabled={!flow.canGoReview} onclick={() => flow.goReview()}>
			Next: review
		</Button>
	</div>
</main>
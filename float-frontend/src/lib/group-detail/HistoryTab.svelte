<script lang="ts">
	import type { HistoryItem } from './types.ts';
	import { CATEGORY_LABELS } from '#lib/expense/expense-flow.svelte.ts';

	interface Props {
		items: HistoryItem[];
		metaDegraded?: boolean;
		loading?: boolean;
		onretry?: () => void;
	}

	let { items, metaDegraded = false, loading = false, onretry }: Props = $props();

	function formatUsdc(minor: number): string {
		return (minor / 1_000_000).toLocaleString('en-US', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		});
	}

	function formatWhen(ts: number): string {
		if (!ts) return '';
		const d = new Date(ts * 1000);
		return d.toLocaleString(undefined, {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<div class="flex flex-1 flex-col px-5 pb-28 pt-4">
	{#if metaDegraded}
		<p class="mb-3 rounded-[16px] bg-amber/13 px-3.5 py-2.5 text-[12px] font-semibold text-amber">
			Notes and categories unavailable
			{#if onretry}
				<button type="button" class="ml-1 font-extrabold underline" onclick={onretry}>
					Retry
				</button>
			{/if}
		</p>
	{/if}

	{#if loading}
		<p class="py-12 text-center text-sm font-bold text-mute">Loading history…</p>
	{:else if items.length === 0}
		<div class="flex flex-1 flex-col items-center justify-center px-6 text-center">
			<p class="font-display text-[22px] font-semibold">No expenses yet</p>
			<p class="mt-2 text-[14px] font-semibold text-mute">
				When someone logs an expense, it shows up here.
			</p>
		</div>
	{:else}
		<ul class="flex flex-col gap-2">
			{#each items as item (item.expenseIndex)}
				<li class="rounded-[20px] bg-surface px-4 py-3.5">
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0 flex-1">
							<p class="truncate text-[15px] font-extrabold">
								{item.description}
							</p>
							<p class="mt-0.5 text-[12px] font-bold text-mute">
								{item.payerName}
								<span class="text-mute/60"> · </span>
								{formatWhen(item.timestamp)}
								{#if item.participantCount > 1}
									<span class="text-mute/60"> · </span>
									{item.participantCount} people
								{/if}
							</p>
							{#if item.category || item.note}
								<p class="mt-1.5 text-[12px] font-semibold text-mute">
									{#if item.category}
										<span class="text-ink/80"
											>{CATEGORY_LABELS[item.category] ?? item.category}</span
										>
									{/if}
									{#if item.category && item.note}
										<span class="text-mute/60"> · </span>
									{/if}
									{#if item.note}
										{item.note}
									{/if}
								</p>
							{/if}
							{#if item.paidFromPool}
								<p class="mt-1 text-[11px] font-extrabold text-primary">Paid from pool</p>
							{/if}
						</div>
						<p class="shrink-0 text-[15px] font-extrabold tabular-nums">
							${formatUsdc(item.amount)}
						</p>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>
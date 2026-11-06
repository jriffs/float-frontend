<script lang="ts">
	import { formatUsdc, formatYield } from './format';
	import type { GroupsSummary } from './types';

	interface Props {
		summary: GroupsSummary;
	}

	let { summary }: Props = $props();

	const netClass = $derived(
		summary.net > 0 ? 'text-mint' : summary.net < 0 ? 'text-coral' : 'text-ink'
	);
</script>

<section class="rounded-[28px] bg-raised p-[18px]" aria-label="Cross-group balances">
	<p class="text-[13px] font-bold text-mute">Across all groups</p>
	<p class={['mt-1 font-display text-[44px] leading-none font-semibold tabular-nums', netClass]}>
		{formatUsdc(summary.net)}
	</p>

	<div class="mt-3 flex gap-2.5">
		<div class="flex-1 rounded-[18px] bg-mint/10 px-3 py-2">
			<p class="text-[11px] font-bold text-mute">Owed to you</p>
			<p class="font-display text-lg font-semibold text-mint tabular-nums">
				{formatUsdc(summary.owedToYou)}
			</p>
		</div>
		<div class="flex-1 rounded-[18px] bg-coral/10 px-3 py-2">
			<p class="text-[11px] font-bold text-mute">You owe</p>
			<p class="font-display text-lg font-semibold text-coral tabular-nums">
				{formatUsdc(-summary.youOwe)}
			</p>
		</div>
	</div>

	{#if summary.anyPoolEarning}
		<div
			class="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber/13 px-3 py-1.5 text-[11px] font-extrabold text-amber"
		>
			<span class="size-2 animate-pulse-ring rounded-full bg-amber"></span>
			Pools earning · est. {formatYield(summary.estYield)}
		</div>
	{/if}
</section>
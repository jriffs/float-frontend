<script lang="ts">
	import Waves from '@lucide/svelte/icons/waves';
	import House from '@lucide/svelte/icons/house';
	import Mountain from '@lucide/svelte/icons/mountain';
	import Users from '@lucide/svelte/icons/users';
	import { fallbackAvatarGradient } from '#lib/supabase/profiles.ts';
	import { balanceLabel, balanceTone, formatUsdc } from './format';
	import type { GroupListItem } from './types';

	interface Props {
		group: GroupListItem;
		onclick: () => void;
	}

	let { group, onclick }: Props = $props();

	const tone = $derived(balanceTone(group.myBalance));
	const amountClass = $derived(
		tone === 'mint' ? 'text-mint' : tone === 'coral' ? 'text-coral' : 'text-mute'
	);

	const tile = $derived.by(() => {
		switch (group.icon) {
			case 'trip':
				return { grad: 'grad-brand', Icon: Waves };
			case 'home':
				return { grad: 'grad-violet', Icon: House };
			case 'hike':
				return { grad: 'grad-pink', Icon: Mountain };
			default:
				return { grad: 'grad-brand', Icon: Users };
		}
	});

	const stack = $derived(group.members.slice(0, 3));
</script>

<button
	type="button"
	class={[
		'flex w-full items-center gap-3.5 rounded-[28px] bg-raised p-3.5 text-left',
		'shadow-[0_3px_0_var(--color-sink)] transition-[transform,box-shadow] duration-100',
		'active:translate-y-[3px] active:shadow-[0_1px_0_var(--color-sink)]'
	]}
	{onclick}
>
	<div
		class={['grid size-[52px] shrink-0 place-items-center rounded-[18px] text-white', tile.grad]}
		aria-hidden="true"
	>
		<tile.Icon size={26} strokeWidth={2.2} />
	</div>

	<div class="min-w-0 flex-1">
		<p class="truncate font-display text-lg font-semibold">{group.name}</p>
		<div class="mt-1 flex items-center gap-2">
			<div class="flex">
				{#each stack as m, i}
					<div
						class="size-6 rounded-full border-2 border-raised"
						style:margin-left={i === 0 ? '0' : '-6px'}
						style:background={fallbackAvatarGradient(m.wallet)}
						style:z-index={stack.length - i}
						title={m.displayName ?? undefined}
					></div>
				{/each}
			</div>
			<span class="text-xs font-bold text-mute">
				{group.memberCount} friend{group.memberCount === 1 ? '' : 's'}
			</span>
			{#if group.poolEarning}
				<span
					class="inline-flex items-center gap-1 rounded-full bg-amber/13 px-2 py-0.5 text-[11px] font-extrabold text-amber"
				>
					<span class="size-1.5 animate-pulse-ring rounded-full bg-amber"></span>
					Pool earning
				</span>
			{/if}
		</div>
	</div>

	<div class="shrink-0 text-right">
		<p class={['font-display text-lg font-semibold tabular-nums', amountClass]}>
			{formatUsdc(group.myBalance)}
		</p>
		<p class="text-[11px] font-bold text-mute">{balanceLabel(group.myBalance)}</p>
	</div>
</button>
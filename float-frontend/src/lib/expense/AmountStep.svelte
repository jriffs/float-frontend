<script lang="ts">
	import X from '@lucide/svelte/icons/x';
	import Button from '#lib/components/ui/Button.svelte';
	import IconButton from '#lib/components/ui/IconButton.svelte';
	import NetworkBadge from '#lib/components/ui/NetworkBadge.svelte';
	import {
		ExpenseFlow,
		CATEGORY_LABELS,
		EXPENSE_CATEGORIES
	} from './expense-flow.svelte.ts';
    import type { ExpenseCategory } from '#lib/supabase/core.ts';

	interface Props {
		flow: ExpenseFlow;
		onclose: () => void;
	}

	let { flow, onclose }: Props = $props();
</script>

<main class="flex min-h-dvh flex-col pb-[max(1.25rem,env(safe-area-inset-bottom))]">
	<header
		class="flex items-center gap-3 px-5 pt-[max(20px,env(safe-area-inset-top))]"
	>
		<IconButton label="Close" onclick={onclose}>
			<X size={20} aria-hidden="true" />
		</IconButton>
		<div class="min-w-0 flex-1">
			<h1 class="font-display text-[22px] font-semibold">Add expense</h1>
			<p class="truncate text-[12px] font-bold text-mute">{flow.groupName}</p>
		</div>
		<NetworkBadge />
	</header>

	<div class="mt-6 px-5">
		<p class="text-center text-[13px] font-bold text-mute">Paid by you</p>
		<div class="mt-2 flex items-baseline justify-center gap-2">
			<input
				type="text"
				inputmode="decimal"
				placeholder="0.00"
				value={flow.amountInput}
				aria-label="Amount in USDC"
				class="w-full max-w-[220px] bg-transparent text-center font-display text-[48px] font-semibold tabular-nums text-ink outline-none placeholder:text-mute/40"
				oninput={(e) => (flow.amountInput = (e.currentTarget as HTMLInputElement).value)}
			/>
			<span class="text-[15px] font-extrabold text-mute">USDC</span>
		</div>
	</div>

	<div class="mt-6 px-5">
		<label for="exp-desc" class="text-sm font-extrabold">Description</label>
		<input
			id="exp-desc"
			type="text"
			placeholder="Dinner at the harbour"
			maxlength={80}
			value={flow.description}
			class="mt-2 h-13 w-full rounded-[18px] bg-surface px-[18px] text-[16px] font-bold text-ink outline-none placeholder:text-mute/50 focus-visible:shadow-[0_0_0_3px_rgb(34_211_197_/_0.35)]"
			oninput={(e) => (flow.description = (e.currentTarget as HTMLInputElement).value)}
		/>
	</div>

	<div class="mt-5 px-5">
		<p class="mb-2.5 text-sm font-extrabold">Category</p>
		<div class="flex flex-wrap gap-2">
			{#each EXPENSE_CATEGORIES as cat}
				<button
					type="button"
					class={[
						'rounded-full px-3.5 py-2 text-[13px] font-extrabold transition-colors',
						flow.category === cat
							? 'bg-primary text-on-primary'
							: 'bg-raised text-ink'
					]}
					onclick={() => (flow.category = cat as ExpenseCategory)}
				>
					{CATEGORY_LABELS[cat]}
				</button>
			{/each}
		</div>
	</div>

	<div class="flex-1"></div>

	<div class="px-5 pt-4">
		<Button disabled={!flow.canGoSplit} onclick={() => flow.goSplit()}>
			Next: split
		</Button>
	</div>
</main>
<script lang="ts">
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import Button from '#lib/components/ui/Button.svelte';
	import IconButton from '#lib/components/ui/IconButton.svelte';
	import { formatUsdc } from '#lib/groups/format.ts';
	import { SettleFlow, formatMajor, minorToMajor } from './settle-flow.svelte.ts';

	interface Props {
		flow: SettleFlow;
	}

	let { flow }: Props = $props();

	const peer = $derived(flow.peer);
	const partial = $derived(flow.partialMode);
</script>

<main class="flex min-h-dvh flex-col pb-[max(1.25rem,env(safe-area-inset-bottom))]">
	<header
		class="flex items-center gap-3 px-5 pt-[max(20px,env(safe-area-inset-top))]"
	>
		<IconButton label="Back" onclick={() => flow.backToList()}>
			<ChevronLeft size={20} aria-hidden="true" />
		</IconButton>
		<h1 class="flex-1 font-display text-[22px] font-semibold">
			Pay {peer?.displayName ?? ''}
		</h1>
	</header>

	<div class="mt-8 px-5 text-center">
		{#if !partial}
			<p class="font-display text-[48px] font-semibold tabular-nums leading-none">
				${formatMajor(flow.payMinor)}
			</p>
			<p class="mt-1 text-[15px] font-extrabold text-mute">USDC</p>
			<p class="mt-3 text-[14px] font-semibold text-mute">
				You owe {peer?.displayName ?? ''} now ${formatMajor(flow.debtMinor)}
			</p>
		{:else}
			<p class="text-[14px] font-semibold text-mute">
				You owe ${formatMajor(flow.debtMinor)} now
			</p>
			<p class="mt-4 text-sm font-extrabold">Amount to pay</p>
			<div class="mt-2 flex items-baseline justify-center gap-1">
				<span class="text-2xl font-bold text-mute">$</span>
				<input
					type="text"
					inputmode="decimal"
					class="w-36 bg-transparent text-center font-display text-[40px] font-semibold tabular-nums outline-none"
					value={flow.partialInput}
					oninput={(e) =>
						flow.setPartialFromInput((e.currentTarget as HTMLInputElement).value)}
				/>
			</div>
			<div class="mt-3 flex justify-center gap-2">
				<button
					type="button"
					class="rounded-full bg-raised px-4 py-2 text-[13px] font-extrabold"
					onclick={() => flow.setHalf()}
				>
					Half
				</button>
				<button
					type="button"
					class="rounded-full bg-raised px-4 py-2 text-[13px] font-extrabold"
					onclick={() => flow.setFull()}
				>
					Full ${formatMajor(flow.debtMinor)}
				</button>
			</div>
		{/if}
	</div>

	<section class="mx-5 mt-8 flex flex-col gap-0 overflow-hidden rounded-[24px] bg-surface">
		<div class="flex items-center justify-between px-4 py-3.5">
			<span class="text-[14px] font-bold text-mute">After this payment</span>
			<span class="text-[14px] font-extrabold">
				{#if flow.stillOwedAfter === 0}
					All settled
				{:else}
					Still owed ${formatMajor(flow.stillOwedAfter)}
				{/if}
			</span>
		</div>
		<div class="h-px bg-raised-2"></div>
		<div class="flex items-center justify-between px-4 py-3.5">
			<span class="text-[14px] font-bold text-mute">Your USDC</span>
			<span class="text-[14px] font-extrabold tabular-nums">
				${formatMajor(flow.walletUsdcMinor)} to ${formatMajor(flow.walletAfter)}
			</span>
		</div>
		<div class="h-px bg-raised-2"></div>
		<div class="flex items-center justify-between px-4 py-3.5">
			<span class="text-[14px] font-bold text-mute">Network fee</span>
			<span class="text-[14px] font-extrabold text-mute">Small amount of Devnet SOL</span>
		</div>
	</section>

	{#if !partial}
		<button
			type="button"
			class="mx-5 mt-4 text-center text-[14px] font-extrabold text-primary"
			onclick={() => flow.openPartial()}
		>
			Pay a different amount
		</button>
	{/if}

	<div class="flex-1"></div>

	<div class="px-5 pt-4">
		<Button
			disabled={!flow.canPay}
			loading={flow.busy}
			onclick={() => void flow.submit()}
		>
			Pay ${formatMajor(flow.payMinor)}
		</Button>
		<p class="mt-3 text-center text-xs font-semibold text-mute">
			Your wallet will ask you to approve. This sends USDC straight to
			{peer?.displayName ?? 'them'} and cannot be undone.
		</p>
	</div>
</main>
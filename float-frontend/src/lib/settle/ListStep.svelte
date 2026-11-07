<script lang="ts">
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import Button from '#lib/components/ui/Button.svelte';
	import IconButton from '#lib/components/ui/IconButton.svelte';
	import NetworkBadge from '#lib/components/ui/NetworkBadge.svelte';
	import { formatUsdc } from '#lib/groups/format.ts';
	import type { SettleFlow, SettlePeer } from './settle-flow.svelte.ts';

	interface Props {
		flow: SettleFlow;
		onback: () => void;
		onnudge: (peer: SettlePeer) => void;
	}

	let { flow, onback, onnudge }: Props = $props();

	const group = $derived(flow.group);
	const youOwe = $derived(flow.youOwePeers);
	const owedToYou = $derived(flow.owedToYouPeers);
</script>

<main class="flex min-h-dvh flex-col pb-[max(1.25rem,env(safe-area-inset-bottom))]">
	<header
		class="flex items-center gap-3 px-5 pt-[max(20px,env(safe-area-inset-top))]"
	>
		<IconButton label="Back" onclick={onback}>
			<ChevronLeft size={20} aria-hidden="true" />
		</IconButton>
		<div class="min-w-0 flex-1">
			<h1 class="font-display text-[22px] font-semibold">Settle up</h1>
			<p class="truncate text-[12px] font-bold text-mute">{group?.name ?? ''}</p>
		</div>
		<NetworkBadge />
	</header>

	{#if youOwe.length > 0}
		<section class="mx-5 mt-6">
			<p class="mb-3 text-[13px] font-extrabold text-mute">You owe</p>
			<ul class="flex flex-col gap-2.5">
				{#each youOwe as p (p.wallet)}
					<li class="flex items-center gap-3 rounded-[22px] bg-surface px-3.5 py-3">
						<span
							class="grid size-11 shrink-0 place-items-center rounded-full grad-brand font-display text-sm font-semibold text-white"
						>
							{p.displayName[0]}
						</span>
						<span class="min-w-0 flex-1">
							<span class="block truncate text-[15px] font-extrabold">{p.displayName}</span>
							<span class="text-[12px] font-bold text-mute">Pay in one tap</span>
						</span>
						<span class="shrink-0 text-right">
							<p class="font-display text-[16px] font-semibold tabular-nums text-coral">
								{formatUsdc(p.netVsYou)}
							</p>
							<button
								type="button"
								class="mt-0.5 text-[12px] font-extrabold text-primary"
								onclick={() => flow.openPay(p)}
							>
								Settle
							</button>
						</span>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if owedToYou.length > 0}
		<section class="mx-5 mt-6">
			<p class="mb-3 text-[13px] font-extrabold text-mute">Owed to you</p>
			<ul class="flex flex-col gap-2.5">
				{#each owedToYou as p (p.wallet)}
					<li class="flex items-center gap-3 rounded-[22px] bg-surface px-3.5 py-3">
						<span
							class="grid size-11 shrink-0 place-items-center rounded-full grad-brand font-display text-sm font-semibold text-white"
						>
							{p.displayName[0]}
						</span>
						<span class="min-w-0 flex-1">
							<span class="block truncate text-[15px] font-extrabold">{p.displayName}</span>
							<span class="text-[12px] font-bold text-mute">Send a reminder</span>
						</span>
						<span class="shrink-0 text-right">
							<p class="font-display text-[16px] font-semibold tabular-nums text-mint">
								{formatUsdc(p.netVsYou)}
							</p>
							<button
								type="button"
								class="mt-0.5 text-[12px] font-extrabold text-primary"
								onclick={() => onnudge(p)}
							>
								Nudge
							</button>
						</span>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if youOwe.length === 0 && owedToYou.length === 0}
		<div class="mx-5 mt-16 text-center">
			<p class="font-display text-[22px] font-semibold">All settled</p>
			<p class="mt-2 text-[14px] font-semibold text-mute">Nothing left to pay or collect.</p>
			<div class="mt-6">
				<Button variant="secondary" onclick={onback}>Back to group</Button>
			</div>
		</div>
	{:else}
		<p class="mx-5 mt-6 text-center text-[12px] leading-snug font-semibold text-mute">
			Each payment goes to one person. Settle them one at a time.
		</p>
	{/if}
</main>
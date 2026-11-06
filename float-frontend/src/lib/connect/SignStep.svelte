<script lang="ts">
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import Check from '@lucide/svelte/icons/check';
	import Pencil from '@lucide/svelte/icons/pencil';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import Button from '#lib/components/ui/Button.svelte';
	import IconButton from '#lib/components/ui/IconButton.svelte';
	import NetworkBadge from '#lib/components/ui/NetworkBadge.svelte';
	import StatusCard from '#lib/components/ui/StatusCard.svelte';
	import { fallbackAvatarGradient, shortAddress } from '#lib/supabase/profiles.ts';
	import type { WalletStore } from '#lib/wallet/wallet.svelte.ts';
	import type { ConnectFlow } from './connect-flow.svelte';

	interface Props {
		flow: ConnectFlow;
		wallet: WalletStore;
	}

	let { flow, wallet }: Props = $props();

	const failed = $derived(flow.sign === 'rejected' || flow.sign === 'failed');

	const reassurances = [
		'It is free, no network fee',
		'A message, not a payment',
		'We never see your keys'
	];
</script>

<main class="flex min-h-dvh flex-col pb-[max(1.25rem,env(safe-area-inset-bottom))]">
	<header class="flex items-center justify-between px-5 pt-[max(20px,env(safe-area-inset-top))]">
		<IconButton label="Back" onclick={() => flow.backToWelcome()}>
			<ChevronLeft size={20} aria-hidden="true" />
		</IconButton>
		<NetworkBadge />
	</header>

	{#if wallet.address}
		<div class="mx-5 mt-5 flex items-center gap-3 self-start rounded-full bg-surface px-3.5 py-2.5">
			<span
				class="size-[30px] rounded-full"
				style:background={fallbackAvatarGradient(wallet.address)}
				aria-hidden="true"
			></span>
			<span class="font-mono text-[13px] font-semibold">{shortAddress(wallet.address)}</span>
			<span class="flex items-center gap-1 text-xs font-extrabold text-mint">
				<Check size={16} strokeWidth={2.6} aria-hidden="true" />
				{wallet.selected}
			</span>
		</div>
	{/if}

	{#if failed}
		<div class="mx-5 mt-8 rounded-[28px] bg-surface p-[22px]">
			{#if flow.sign === 'rejected'}
				<StatusCard
					icon={Pencil}
					title="Signature not approved"
					body="We need that one signature to know it is you. No money moves."
				>
					{#snippet actions()}
						<Button onclick={() => flow.signIn()}>Try again</Button>
						<Button variant="secondary" onclick={() => flow.useDifferentWallet()}>
							Use a different wallet
						</Button>
					{/snippet}
				</StatusCard>
			{:else}
				<StatusCard
					icon={CircleAlert}
					title="Could not sign you in"
					body="Something went wrong. Nothing was changed. Try again in a moment."
				>
					{#snippet actions()}
						<Button onclick={() => flow.signIn()}>Try again</Button>
						<Button variant="secondary" onclick={() => flow.useDifferentWallet()}>
							Use a different wallet
						</Button>
					{/snippet}
				</StatusCard>
			{/if}
		</div>
		<div class="flex-1"></div>
	{:else}
		<div class="flex flex-col items-center px-7 pt-9 text-center">
			<div class="grad-violet grid size-24 animate-bob place-items-center rounded-[32px] text-white">
				<ShieldCheck size={48} aria-hidden="true" />
			</div>
			<h1 class="mt-7 mb-2 font-display text-[34px] font-semibold tracking-tight">
				One quick signature
			</h1>
			<p class="text-base leading-[1.45] font-semibold text-mute">
				Your wallet will ask you to sign a short message. It proves this wallet is yours.
			</p>
		</div>

		<ul class="mx-5 mt-7 flex flex-col gap-3.5 rounded-[28px] bg-surface p-5">
			{#each reassurances as line (line)}
				<li class="flex items-center gap-3">
					<span class="grid size-7 shrink-0 place-items-center rounded-full bg-mint/16 text-mint">
						<Check size={16} strokeWidth={2.6} aria-hidden="true" />
					</span>
					<span class="text-[15px] font-bold">{line}</span>
				</li>
			{/each}
		</ul>

		<details class="group mx-5 mt-3 rounded-[22px] bg-surface">
			<summary
				class="flex h-13 cursor-pointer list-none items-center justify-between px-[18px] text-sm font-extrabold [&::-webkit-details-marker]:hidden"
			>
				What is this?
				<ChevronRight
					size={18}
					class="rotate-90 text-mute transition-transform group-open:-rotate-90"
					aria-hidden="true"
				/>
			</summary>
			<p class="px-[18px] pb-4 text-[13px] leading-relaxed font-semibold text-mute">
				This is a standard sign-in message. It only proves you own this wallet. It cannot move
				funds or approve payments.
			</p>
		</details>

		<div class="flex-1"></div>

		<div class="px-5 pt-5">
			<Button loading={flow.sign === 'signing'} onclick={() => flow.signIn()}>Continue</Button>
			<Button variant="ghost" disabled={flow.sign === 'signing'} onclick={() => flow.useDifferentWallet()}>
				Use a different wallet
			</Button>
		</div>
	{/if}
</main>

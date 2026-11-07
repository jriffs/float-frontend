<script lang="ts">
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Fuel from '@lucide/svelte/icons/fuel';
	import Wallet from '@lucide/svelte/icons/wallet';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import Button from '#lib/components/ui/Button.svelte';
	import StatusCard from '#lib/components/ui/StatusCard.svelte';
	import {
		SettleFlow,
		formatMajor,
		type SettleErrorReason
	} from './settle-flow.svelte.ts';

	interface Props {
		flow: SettleFlow;
	}

	let { flow }: Props = $props();

	const reason = $derived(flow.errorReason as SettleErrorReason);
	const peerName = $derived(flow.peer?.displayName ?? 'them');

	const copy: Record<
		SettleErrorReason,
		{ icon: typeof CircleAlert; title: string; body: string }
	> = {
		'no-usdc': {
			icon: Wallet,
			title: 'Not enough USDC',
			body: `Your wallet has $${formatMajor(flow.walletUsdcMinor)} USDC, but this payment is $${formatMajor(flow.payMinor)}. Pay a smaller amount or add more test USDC.`
		},
		'no-sol': {
			icon: Fuel,
			title: 'Not enough SOL for fees',
			body: 'Settling needs a tiny amount of Devnet SOL for network fees. Grab some free from the faucet.'
		},
		'needs-ata': {
			icon: CircleAlert,
			title: 'One-time setup fee',
			body: `${peerName} has not received USDC in this group before. Setting up their account adds a small one-time fee.`
		},
		'amount-changed': {
			icon: RefreshCw,
			title: 'The amount changed',
			body: `${peerName} updated the balance while you were looking. Here is the new amount before you pay.`
		},
		declined: {
			icon: Pencil,
			title: 'Request declined',
			body: 'No money was sent. Your balance is unchanged.'
		},
		network: {
			icon: CircleAlert,
			title: 'Payment did not go through',
			body: 'Something went wrong on the network. Nothing was sent. Try again in a moment.'
		}
	};

	const view = $derived(copy[reason] ?? copy.network);
</script>

<main class="flex min-h-dvh flex-col pb-[max(1.25rem,env(safe-area-inset-bottom))]">
	<div class="mx-5 mt-[max(48px,env(safe-area-inset-top))] rounded-[28px] bg-surface p-[22px]">
		<StatusCard icon={view.icon} title={view.title} body={view.body}>
			{#snippet actions()}
				{#if reason === 'no-usdc'}
					<Button onclick={() => flow.openPartial()}>Pay a different amount</Button>
					<Button
						variant="secondary"
						onclick={() =>
							window.open('https://faucet.circle.com/', '_blank', 'noopener,noreferrer')}
					>
						Get test USDC
					</Button>
				{:else if reason === 'no-sol'}
					<Button
						onclick={() =>
							window.open('https://faucet.solana.com/', '_blank', 'noopener,noreferrer')}
					>
						Get Devnet SOL
					</Button>
					<Button variant="secondary" onclick={() => flow.retry()}>
						I have some, try again
					</Button>
				{:else if reason === 'needs-ata'}
					<Button
						onclick={() => {
							flow.acknowledgeAta();
							void flow.submit();
						}}
					>
						Continue
					</Button>
					<Button variant="secondary" onclick={() => flow.backToConfirm()}>Cancel</Button>
				{:else if reason === 'amount-changed'}
					<Button onclick={() => flow.seeNewAmount()}>See new amount</Button>
					<Button variant="secondary" onclick={() => flow.backToList()}>Cancel</Button>
				{:else if reason === 'declined' || reason === 'network'}
					<Button onclick={() => flow.retry()}>Try again</Button>
					<Button variant="secondary" onclick={() => flow.backToConfirm()}>Back</Button>
				{/if}
			{/snippet}
		</StatusCard>
	</div>
	<div class="flex-1"></div>
</main>
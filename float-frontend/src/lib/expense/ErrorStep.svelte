<script lang="ts">
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Fuel from '@lucide/svelte/icons/fuel';
	import Activity from '@lucide/svelte/icons/activity';
	import Button from '#lib/components/ui/Button.svelte';
	import StatusCard from '#lib/components/ui/StatusCard.svelte';
	import type { ExpenseFlow, ExpenseErrorReason } from './expense-flow.svelte.ts';

	interface Props {
		flow: ExpenseFlow;
		ondone: () => void;
	}

	let { flow, ondone }: Props = $props();

	const reason = $derived(flow.errorReason as ExpenseErrorReason);

	const copy: Record<
		ExpenseErrorReason,
		{ icon: typeof CircleAlert; title: string; body: string }
	> = {
		declined: {
			icon: Pencil,
			title: 'Request declined',
			body: 'Nothing was recorded. Your amount and split are kept if you want to try again.'
		},
		network: {
			icon: CircleAlert,
			title: 'Could not add the expense',
			body: 'Something went wrong on the network. No balances changed. Try again in a moment.'
		},
		'no-sol': {
			icon: Fuel,
			title: 'Not enough SOL for fees',
			body: 'Adding an expense needs a tiny amount of Devnet SOL for network fees. Grab some free from the faucet.'
		},
		'meta-pending': {
			icon: Activity,
			title: 'Added, details pending',
			body: 'Your expense is recorded. The note or receipt did not save yet. You can retry from History.'
		}
	};

	const view = $derived(copy[reason] ?? copy.network);
</script>

<main class="flex min-h-dvh flex-col pb-[max(1.25rem,env(safe-area-inset-bottom))]">
	<div class="mx-5 mt-[max(48px,env(safe-area-inset-top))] rounded-[28px] bg-surface p-[22px]">
		<StatusCard icon={view.icon} title={view.title} body={view.body}>
			{#snippet actions()}
				{#if reason === 'declined' || reason === 'network'}
					<Button onclick={() => flow.retry()}>Try again</Button>
					<Button variant="secondary" onclick={() => flow.backToReview()}>
						Back to edit
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
				{:else if reason === 'meta-pending'}
					<Button onclick={() => flow.finishDespiteMeta()}>Done</Button>
					<Button variant="secondary" onclick={ondone}>Back to group</Button>
				{/if}
			{/snippet}
		</StatusCard>
	</div>
	<div class="flex-1"></div>
</main>
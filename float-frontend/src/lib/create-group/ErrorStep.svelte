<script lang="ts">
	import Pencil from '@lucide/svelte/icons/pencil';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import Fuel from '@lucide/svelte/icons/fuel';
	import Activity from '@lucide/svelte/icons/activity';
	import Button from '#lib/components/ui/Button.svelte';
	import StatusCard from '#lib/components/ui/StatusCard.svelte';
	import type { CreateFlow, CreateErrorReason } from './create-flow.svelte.ts';

	interface Props {
		flow: CreateFlow;
		ongroup: (pubkey: string) => void;
	}

	let { flow, ongroup }: Props = $props();

	const reason = $derived(flow.errorReason as CreateErrorReason);

	const copy: Record<
		CreateErrorReason,
		{ icon: typeof CircleAlert; title: string; body: string }
	> = {
		'name-taken': {
			icon: Pencil,
			title: 'Name already used',
			body: 'Group names are unique per creator. Add a year or a place to tell them apart.'
		},
		'no-sol': {
			icon: Fuel,
			title: 'Not enough SOL for fees',
			body: 'Creating a group needs a tiny amount of Devnet SOL for network fees. Grab some free from the faucet.'
		},
		declined: {
			icon: Pencil,
			title: 'Request declined',
			body: 'Nothing was created. Your details are saved if you want to try again.'
		},
		network: {
			icon: CircleAlert,
			title: 'Could not create the group',
			body: 'Something went wrong on the network. No funds moved. Try again in a moment.'
		},
		'setup-incomplete': {
			icon: Activity,
			title: 'Created, finishing setup',
			body: 'Your group exists, but we could not confirm your membership yet. This usually fixes itself.'
		}
	};

	const view = $derived(copy[reason] ?? copy.network);
</script>

<main class="flex min-h-dvh flex-col pb-[max(1.25rem,env(safe-area-inset-bottom))]">
	<div class="mx-5 mt-[max(48px,env(safe-area-inset-top))] rounded-[28px] bg-surface p-[22px]">
		<StatusCard icon={view.icon} title={view.title} body={view.body}>
			{#snippet actions()}
				{#if reason === 'name-taken'}
					<Button onclick={() => flow.backToForm()}>Edit name</Button>
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
				{:else if reason === 'declined'}
					<Button onclick={() => flow.retry()}>Try again</Button>
					<Button variant="secondary" onclick={() => flow.backToForm()}>Back to edit</Button>
				{:else if reason === 'network'}
					<Button onclick={() => flow.retry()}>Try again</Button>
					<Button variant="secondary" onclick={() => flow.backToForm()}>Back to edit</Button>
				{:else if reason === 'setup-incomplete'}
					<Button onclick={() => flow.retrySetup()}>Retry setup</Button>
					{#if flow.created}
						<Button variant="secondary" onclick={() => ongroup(flow.created!.pubkey)}>
							Go to group
						</Button>
					{/if}
				{/if}
			{/snippet}
		</StatusCard>
	</div>
	<div class="flex-1"></div>
</main>
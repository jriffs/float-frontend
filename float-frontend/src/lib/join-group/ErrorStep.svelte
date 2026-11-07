<script lang="ts">
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import Link2Off from '@lucide/svelte/icons/link-2-off';
	import DoorClosed from '@lucide/svelte/icons/door-closed';
	import UserCheck from '@lucide/svelte/icons/user-check';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Fuel from '@lucide/svelte/icons/fuel';
	import Button from '#lib/components/ui/Button.svelte';
	import StatusCard from '#lib/components/ui/StatusCard.svelte';
	import type { JoinFlow, JoinErrorReason } from './join-flow.svelte.ts';

	interface Props {
		flow: JoinFlow;
		ongroup: (pubkey: string) => void;
		ongroups: () => void;
	}

	let { flow, ongroup, ongroups }: Props = $props();

	const reason = $derived(flow.errorReason as JoinErrorReason);
	const name = $derived(flow.preview?.name ?? 'This group');

	const copy: Record<
		JoinErrorReason,
		{ icon: typeof CircleAlert; title: string; body: string }
	> = {
		'invalid-link': {
			icon: Link2Off,
			title: 'This link does not work',
			body: 'It may be mistyped or incomplete. Ask your friend to send it again.'
		},
		closed: {
			icon: DoorClosed,
			title: 'This group has closed',
			body: `${name} is finished, so new members cannot join. Ask your friend to start a new one.`
		},
		'already-member': {
			icon: UserCheck,
			title: 'You are already in',
			body: `You are a member of ${name}. Taking you there now.`
		},
		declined: {
			icon: Pencil,
			title: 'Request declined',
			body: 'You have not joined yet. Try again when you are ready.'
		},
		network: {
			icon: CircleAlert,
			title: 'Could not join the group',
			body: 'Something went wrong on the network. Nothing changed. Try again in a moment.'
		},
		'no-sol': {
			icon: Fuel,
			title: 'Not enough SOL for fees',
			body: 'Joining needs a tiny amount of Devnet SOL for network fees. Grab some free from the faucet.'
		}
	};

	const view = $derived(copy[reason] ?? copy.network);
</script>

<main class="flex min-h-dvh flex-col pb-[max(1.25rem,env(safe-area-inset-bottom))]">
	<div class="mx-5 mt-[max(48px,env(safe-area-inset-top))] rounded-[28px] bg-surface p-[22px]">
		<StatusCard icon={view.icon} title={view.title} body={view.body}>
			{#snippet actions()}
				{#if reason === 'invalid-link' || reason === 'closed'}
					<Button onclick={ongroups}>Back to groups</Button>
				{:else if reason === 'already-member'}
					<Button
						onclick={() => flow.preview && ongroup(flow.preview.pubkey)}
					>
						Open group
					</Button>
				{:else if reason === 'declined'}
					<Button onclick={() => flow.retry()}>Try again</Button>
					<Button variant="secondary" onclick={() => flow.backToPreview()}>
						Back to invite
					</Button>
				{:else if reason === 'network'}
					<Button onclick={() => flow.retry()}>Try again</Button>
					<Button variant="secondary" onclick={() => flow.backToPreview()}>
						Back to invite
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
				{/if}
			{/snippet}
		</StatusCard>
	</div>
	<div class="flex-1"></div>
</main>
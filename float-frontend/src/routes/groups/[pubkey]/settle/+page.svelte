<!-- Screen 8 — Settle up (UI-complete mock). -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { getWalletContext } from '#lib/wallet/wallet.svelte.ts';
	import { SettleFlow, type SettlePeer } from '#lib/settle/settle-flow.svelte.ts';
	import ListStep from '#lib/settle/ListStep.svelte';
	import ConfirmStep from '#lib/settle/ConfirmStep.svelte';
	import PendingStep from '#lib/settle/PendingStep.svelte';
	import DoneStep from '#lib/settle/DoneStep.svelte';
	import ErrorStep from '#lib/settle/ErrorStep.svelte';
	import NudgeSheet from '#lib/group-detail/NudgeSheet.svelte';

	const wallet = getWalletContext();
	const pubkey = $derived(page.params.pubkey ?? '');
	const flow = new SettleFlow();

	let nudgeOpen = $state(false);
	let nudgePeer = $state<SettlePeer | null>(null);

	onMount(() => {
		if (!wallet.address) {
			void goto(resolve('/'), { replaceState: true });
			return;
		}
		flow.init(pubkey);

		// Optional deep-link: ?peer=Dev44444 opens confirm for that wallet
		const peerWallet = page.url.searchParams.get('peer');
		if (peerWallet && flow.group) {
			const p = flow.group.peers.find((x) => x.wallet === peerWallet && x.netVsYou < 0);
			if (p) flow.openPay(p);
		}
	});

	function backToGroup() {
		void goto(resolve('/groups/[pubkey]', { pubkey }));
	}

	function openNudge(p: SettlePeer) {
		nudgePeer = p;
		nudgeOpen = true;
	}
</script>

{#if flow.step === 'list'}
	<ListStep {flow} onback={backToGroup} onnudge={openNudge} />
{:else if flow.step === 'confirm'}
	<ConfirmStep {flow} />
{:else if flow.step === 'pending'}
	<PendingStep {flow} />
{:else if flow.step === 'done'}
	<DoneStep {flow} ondone={backToGroup} />
{:else}
	<ErrorStep {flow} />
{/if}

{#if nudgePeer && flow.group}
	<NudgeSheet
		open={nudgeOpen}
		groupName={flow.group.name}
		peerName={nudgePeer.displayName}
		amount={nudgePeer.netVsYou}
		onclose={() => {
			nudgeOpen = false;
			nudgePeer = null;
		}}
	/>
{/if}
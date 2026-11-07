<!-- Screen 7 — Add expense (UI-complete mock). -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { getWalletContext } from '#lib/wallet/wallet.svelte.ts';
	import { ExpenseFlow } from '#lib/expense/expense-flow.svelte.ts';
	import AmountStep from '#lib/expense/AmountStep.svelte';
	import SplitStep from '#lib/expense/SplitStep.svelte';
	import ReviewStep from '#lib/expense/ReviewStep.svelte';
	import PendingStep from '#lib/expense/PendingStep.svelte';
	import DoneStep from '#lib/expense/DoneStep.svelte';
	import ErrorStep from '#lib/expense/ErrorStep.svelte';

	const wallet = getWalletContext();
	const pubkey = $derived(page.params.pubkey ?? '');
	const flow = new ExpenseFlow();

	onMount(() => {
		if (!wallet.address) {
			void goto(resolve('/'), { replaceState: true });
			return;
		}
		flow.init({
			groupPubkey: pubkey,
			groupName: 'Cape Town 2026',
			myWallet: wallet.address
		});
	});

	function close() {
		void goto(resolve('/groups/[pubkey]', { pubkey }));
	}
</script>

{#if flow.step === 'amount'}
	<AmountStep {flow} onclose={close} />
{:else if flow.step === 'split'}
	<SplitStep {flow} />
{:else if flow.step === 'review'}
	<ReviewStep {flow} />
{:else if flow.step === 'pending'}
	<PendingStep {flow} />
{:else if flow.step === 'done'}
	<DoneStep {flow} ondone={close} />
{:else}
	<ErrorStep {flow} ondone={close} />
{/if}
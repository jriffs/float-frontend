<!-- Screen 4 — Create group (UI-complete mock: pending → invite offline). -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { getWalletContext } from '#lib/wallet/wallet.svelte.ts';
	import { CreateFlow } from '#lib/create-group/create-flow.svelte.ts';
	import FormStep from '#lib/create-group/FormStep.svelte';
	import PendingStep from '#lib/create-group/PendingStep.svelte';
	import InviteStep from '#lib/create-group/InviteStep.svelte';
	import ErrorStep from '#lib/create-group/ErrorStep.svelte';

	const wallet = getWalletContext();
	const flow = new CreateFlow();

	onMount(() => {
		if (!wallet.address) {
			void goto(resolve('/'), { replaceState: true });
		}
	});

	function backToGroups() {
		void goto(resolve('/groups'));
	}

	function openGroup(pubkey: string) {
		// Group detail is still a stub; still navigate so the CTA is real.
		void goto(resolve('/groups/[pubkey]', { pubkey }));
	}
</script>

{#if flow.step === 'form'}
	<FormStep {flow} onback={backToGroups} />
{:else if flow.step === 'pending'}
	<PendingStep {flow} />
{:else if flow.step === 'invite'}
	<InviteStep {flow} ongroup={openGroup} />
{:else}
	<ErrorStep {flow} ongroup={openGroup} />
{/if}
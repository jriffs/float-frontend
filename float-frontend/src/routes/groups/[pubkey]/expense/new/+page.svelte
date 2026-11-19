<!-- Screen 7 — Add expense -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { PublicKey } from '@solana/web3.js';
	import { getWalletContext } from '#lib/wallet/wallet.svelte.ts';
	import { fetchGroup, fetchGroupMembers } from '#lib/program/client.ts';
	import { getProfiles, shortAddress } from '#lib/supabase/profiles.ts';
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

	let booting = $state(true);
	let bootError = $state<string | null>(null);

	onMount(() => {
		void bootstrap();
	});

	async function bootstrap() {
		if (!wallet.address) {
			await goto(resolve('/'), { replaceState: true });
			return;
		}

		flow.setAdapter(wallet.getActiveAdapter() ?? null);

		try {
			const groupPk = new PublicKey(pubkey);
			const [group, members] = await Promise.all([
				fetchGroup(groupPk),
				fetchGroupMembers(groupPk)
			]);
			if (!group) {
				bootError = 'Group not found on-chain.';
				booting = false;
				return;
			}
			if (!members.some((m) => m.member.toBase58() === wallet.address)) {
				bootError = 'You are not a member of this group.';
				booting = false;
				return;
			}

			const wallets = members.map((m) => m.member.toBase58());
			let names = new Map<string, string>();
			try {
				const profiles = await getProfiles(wallets);
				for (const [w, p] of profiles) names.set(w, p.display_name);
			} catch {
				/* ignore */
			}

			flow.init({
				groupPubkey: group.pubkey.toBase58(),
				groupName: group.name,
				creator: group.creator.toBase58(),
				myWallet: wallet.address,
				members: members.map((m) => {
					const w = m.member.toBase58();
					return {
						wallet: w,
						displayName: names.get(w) ?? shortAddress(w)
					};
				})
			});
		} catch (e) {
			bootError = e instanceof Error ? e.message : 'Could not load group.';
		} finally {
			booting = false;
		}
	}

	function close() {
		void goto(resolve('/groups/[pubkey]', { pubkey }));
	}
</script>

{#if booting}
	<main class="flex min-h-dvh items-center justify-center">
		<span class="text-sm font-bold text-mute">Loading…</span>
	</main>
{:else if bootError}
	<main class="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
		<p class="font-display text-xl font-semibold">Could not open expense</p>
		<p class="text-sm font-semibold text-mute">{bootError}</p>
		<button type="button" class="text-sm font-extrabold text-primary" onclick={close}>
			Back to group
		</button>
	</main>
{:else if flow.step === 'amount'}
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
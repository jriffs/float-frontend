<!-- Screen 5 — Join group (UI-complete mock). -->
<script lang="ts">
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import { resolve } from "$app/paths";
	import { getWalletContext } from "#lib/wallet/wallet.svelte.ts";
	import { JoinFlow } from "#lib/join-group/join-flow.svelte.ts";
	import GateStep from "#lib/join-group/GateStep.svelte";
	import PreviewStep from "#lib/join-group/PreviewStep.svelte";
	import PendingStep from "#lib/join-group/PendingStep.svelte";
	import DoneStep from "#lib/join-group/DoneStep.svelte";
	import ErrorStep from "#lib/join-group/ErrorStep.svelte";

	const wallet = getWalletContext();
	const flow = new JoinFlow();

	onMount(() => {
		const creator = page.url.searchParams.get("creator");
		const name = page.url.searchParams.get("name");
		const g = page.url.searchParams.get("g"); // optional

		flow.setAdapter(wallet.getActiveAdapter() ?? null);
		void flow.bootstrap({
			creator,
			name,
			groupPubkeyHint: g,
			wallet: wallet.address,
		});
	});
	
	// When wallet connects after gate:
	function connectWallet() {
		const creator = page.url.searchParams.get("creator") ?? "";
		const name = page.url.searchParams.get("name") ?? "";
		const q = new URLSearchParams({ creator, name });
		const redirectTo = `/groups/join?${q.toString()}`;
		void goto(
			`${resolve("/")}?redirectTo=${encodeURIComponent(redirectTo)}`,
		);
	}

	function backToGroups() {
		void goto(resolve("/groups"));
	}

	function openGroup(pubkey: string) {
		void goto(resolve("/groups/[pubkey]", { pubkey }));
	}
</script>

{#if flow.step === "boot"}
	<main class="flex min-h-dvh items-center justify-center">
		<span class="text-sm font-bold text-mute">Loading…</span>
	</main>
{:else if flow.step === "gate"}
	<GateStep {flow} onconnect={connectWallet} />
{:else if flow.step === "preview"}
	<PreviewStep {flow} onback={backToGroups} />
{:else if flow.step === "pending"}
	<PendingStep {flow} />
{:else if flow.step === "done"}
	<DoneStep {flow} ongroup={openGroup} />
{:else}
	<ErrorStep {flow} ongroup={openGroup} ongroups={backToGroups} />
{/if}

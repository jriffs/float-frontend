<!-- Screen 6 — Group detail (Balances). UI-complete mock. -->
<script lang="ts">
	import { onMount } from "svelte";
	import { page } from "$app/state";
	import { goto } from "$app/navigation";
	import { resolve } from "$app/paths";
	import ChevronLeft from "@lucide/svelte/icons/chevron-left";
	import Ellipsis from "@lucide/svelte/icons/ellipsis";
	import CircleAlert from "@lucide/svelte/icons/circle-alert";
	import IconButton from "#lib/components/ui/IconButton.svelte";
	import Button from "#lib/components/ui/Button.svelte";
	import StatusCard from "#lib/components/ui/StatusCard.svelte";
	import BottomNav from "#lib/components/nav/BottomNav.svelte";
	import { getWalletContext } from "#lib/wallet/wallet.svelte.ts";
	import { loadGroupDetail } from "#lib/group-detail/load.ts";
	import type {
		DetailLoadState,
		DetailTab,
		DetailMember,
		GroupDetail,
	} from "#lib/group-detail/types.ts";
	import LoadingView from "#lib/group-detail/LoadingView.svelte";
	import BalancesTab from "#lib/group-detail/BalancesTab.svelte";
	import NudgeSheet from "#lib/group-detail/NudgeSheet.svelte";

	const wallet = getWalletContext();
	const pubkey = $derived(page.params.pubkey ?? "");

	let LoadState = $state<DetailLoadState>({ status: "loading" });
	let tab = $state<DetailTab>("balances");
	let showSettled = $state(false);

	let nudgeOpen = $state(false);
	let nudgePeer = $state<DetailMember | null>(null);

	const detail = $derived(
		LoadState.status === "ready" || LoadState.status === "meta-degraded"
			? LoadState.detail
			: null,
	);

	onMount(() => {
		if (!wallet.address) {
			void goto(resolve("/"), { replaceState: true });
			return;
		}
		void reload();
	});

	async function reload() {
		LoadState = { status: "loading" };
		LoadState = await loadGroupDetail(pubkey);
	}

	function back() {
		void goto(resolve("/groups"));
	}

	function openNudge(m: DetailMember) {
		nudgePeer = m;
		nudgeOpen = true;
	}

	function closeNudge() {
		nudgeOpen = false;
		nudgePeer = null;
	}

	/** Placeholders until Add Expense / Settle screens exist. */
	function toastSoon(label: string) {
		// Keep CTAs live without navigating to missing routes.
		console.info(`[float] ${label} — screen not built yet`);
	}

	function inviteFriends() {
		if (!detail) return;
		const url = `${window.location.origin}/groups/join?g=${encodeURIComponent(detail.pubkey)}`;
		void navigator.clipboard?.writeText(url);
		toastSoon("Invite link copied");
	}
</script>

{#if LoadState.status === "loading"}
	<LoadingView />
{:else if LoadState.status === "error"}
	<main
		class="flex min-h-dvh flex-col pb-[max(1.25rem,env(safe-area-inset-bottom))]"
	>
		<header
			class="flex items-center gap-3 px-5 pt-[max(20px,env(safe-area-inset-top))]"
		>
			<IconButton label="Back" onclick={back}>
				<ChevronLeft size={20} aria-hidden="true" />
			</IconButton>
		</header>
		<div class="mx-5 mt-6 rounded-[28px] bg-surface p-[22px]">
			<StatusCard
				icon={CircleAlert}
				title="Could not load balances"
				body={LoadState.message}
			>
				{#snippet actions()}
					<Button onclick={() => void reload()}>Try again</Button>
					<Button variant="secondary" onclick={back}
						>Back to groups</Button
					>
				{/snippet}
			</StatusCard>
		</div>
	</main>
{:else if detail}
	<main class="flex min-h-dvh flex-col">
		<header
			class="flex items-center gap-3 px-5 pt-[max(20px,env(safe-area-inset-top))]"
		>
			<IconButton label="Back" onclick={back}>
				<ChevronLeft size={20} aria-hidden="true" />
			</IconButton>
			<div class="min-w-0 flex-1">
				<h1 class="truncate font-display text-[20px] font-semibold">
					{detail.name}
				</h1>
				<p class="text-[12px] font-bold text-mute">
					{detail.memberCount}
					{detail.memberCount === 1 ? "member" : "friends"}
				</p>
			</div>
			<IconButton
				label="Group menu"
				onclick={() => toastSoon("Group menu")}
			>
				<Ellipsis size={20} aria-hidden="true" />
			</IconButton>
		</header>

		{#if LoadState.status === "meta-degraded"}
			<div
				class="mx-5 mt-3 rounded-[16px] bg-amber/13 px-3.5 py-2.5 text-[12px] font-semibold text-amber"
				role="status"
			>
				Notes and receipts unavailable right now
				<button
					type="button"
					class="ml-2 font-extrabold underline"
					onclick={() => void reload()}
				>
					Retry
				</button>
			</div>
		{/if}

		<!-- Tabs -->
		<div
			class="mx-5 mt-4 flex gap-1 rounded-full bg-raised p-1"
			role="tablist"
			aria-label="Group sections"
		>
			{#each [{ id: "balances" as const, label: "Balances" }, { id: "pool" as const, label: "Pool" }, { id: "history" as const, label: "History" }] as t}
				<button
					type="button"
					role="tab"
					aria-selected={tab === t.id}
					class={[
						"flex-1 rounded-full py-2.5 text-[13px] font-extrabold transition-colors",
						tab === t.id
							? "bg-surface text-ink shadow-sm"
							: "text-mute",
					]}
					onclick={() => (tab = t.id)}
				>
					{t.label}
				</button>
			{/each}
		</div>

		{#if tab === "balances"}
			<div class="flex flex-1 flex-col">
				<BalancesTab
					{detail}
					{showSettled}
					ontoggleSettled={() => (showSettled = !showSettled)}
					onnudge={openNudge}
					onsettle={(m) =>
						void goto(
							resolve("/groups/[pubkey]/settle", {
								pubkey: detail.pubkey,
							}) + `?peer=${encodeURIComponent(m.wallet)}`,
						)}
					onaddexpense={() =>
						void goto(
							resolve("/groups/[pubkey]/expense/new", {
								pubkey: detail.pubkey,
							}),
						)}
					onsettleup={() =>
						void goto(
							resolve("/groups/[pubkey]/settle", {
								pubkey: detail.pubkey,
							}),
						)}
					oninvite={inviteFriends}
					onwithdraw={() => toastSoon("Withdraw pool share")}
				/>
			</div>
		{:else if tab === "pool"}
			<div
				class="flex flex-1 flex-col items-center justify-center px-8 text-center"
			>
				<p class="font-display text-[22px] font-semibold">Pool</p>
				<p class="mt-2 text-[14px] font-semibold text-mute">
					Deposit, deploy to Kamino, and withdraw land in a later
					screen.
				</p>
				{#if detail.poolEnabled}
					<p class="mt-3 text-[13px] font-bold text-amber">
						Pool is enabled for this group
					</p>
				{:else}
					<p class="mt-3 text-[13px] font-bold text-mute">
						Pool is off
					</p>
				{/if}
			</div>
		{:else}
			<div
				class="flex flex-1 flex-col items-center justify-center px-8 text-center"
			>
				<p class="font-display text-[22px] font-semibold">History</p>
				<p class="mt-2 text-[14px] font-semibold text-mute">
					Expenses and settlements feed will live here.
				</p>
			</div>
		{/if}

		<BottomNav active="groups" />
	</main>

	{#if nudgePeer}
		<NudgeSheet
			open={nudgeOpen}
			groupName={detail.name}
			peerName={nudgePeer.displayName}
			amount={nudgePeer.netVsYou}
			onclose={closeNudge}
		/>
	{/if}
{/if}

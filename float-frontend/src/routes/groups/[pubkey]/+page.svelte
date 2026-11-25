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
	import { loadGroupHistory } from '#lib/group-detail/history.ts';
	import type { HistoryLoadState } from '#lib/group-detail/types.ts';
	import HistoryTab from '#lib/group-detail/HistoryTab.svelte';
	import { loadPoolView, type PoolLoadState } from '#lib/group-detail/pool.ts';
	import PoolTab from '#lib/group-detail/PoolTab.svelte';
	import {
		enablePool,
		depositToPool,
		withdrawFromPool
	} from '#lib/program/client.ts';
	import { mapProgramError } from '#lib/program/errors.ts';
	import { PublicKey } from '@solana/web3.js';
	import { deployToKamino, recallFromKamino, harvestYield } from '#lib/program/client.ts';

	const wallet = getWalletContext();
	const pubkey = $derived(page.params.pubkey ?? "");

	let LoadState = $state<DetailLoadState>({ status: "loading" });
	let tab = $state<DetailTab>("balances");
	let showSettled = $state(false);

	let nudgeOpen = $state(false);
	let nudgePeer = $state<DetailMember | null>(null);

	let historyState = $state<HistoryLoadState>({ status: 'loading' });
	let historyLoaded = $state(false);

	let poolState = $state<PoolLoadState>({ status: 'loading' });
	let poolBusy = $state(false);
	let poolError = $state<string | null>(null);

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
		if (!wallet.address) {
			await goto(resolve("/"), { replaceState: true });
			return;
		}
		LoadState = { status: "loading" };
		LoadState = await loadGroupDetail(pubkey, wallet.address);
	}

	async function loadHistory() {
		if (!wallet.address) return;
		historyState = { status: 'loading' };
		historyState = await loadGroupHistory(pubkey, wallet.address);
		historyLoaded = true;
	}

	// Lazy-load when user opens the tab
	$effect(() => {
		if (tab === 'history' && wallet.address) {
			void loadHistory();
		}
	});

	async function loadPool() {
		if (!wallet.address) return;
		poolState = { status: 'loading' };
		poolError = null;
		poolState = await loadPoolView(pubkey, wallet.address);
	}

	$effect(() => {
		if (tab === 'pool' && wallet.address) {
			void loadPool();
		}
	});

	async function onEnablePool() {
		const ad = wallet.getActiveAdapter();
		const v = poolState.status === 'ready' ? poolState.view : null;
		if (!ad || !v) return;
		poolBusy = true;
		poolError = null;
		try {
			await enablePool({ adapter: ad, groupName: v.groupName });
			await loadPool();
			await reload(); // refresh group.poolEnabled on balances
		} catch (e) {
			poolError = mapProgramError(e).message;
		} finally {
			poolBusy = false;
		}
	}

	async function onDeposit(major: number) {
		const ad = wallet.getActiveAdapter();
		const v = poolState.status === 'ready' ? poolState.view : null;
		if (!ad || !v) return;
		poolBusy = true;
		poolError = null;
		try {
			await depositToPool({
				adapter: ad,
				creator: new PublicKey(v.creator),
				groupName: v.groupName,
				amount: Math.round(major * 1_000_000)
			});
			await loadPool();
		} catch (e) {
			poolError = mapProgramError(e).message;
		} finally {
			poolBusy = false;
		}
	}

	async function onWithdraw() {
		const ad = wallet.getActiveAdapter();
		const v = poolState.status === 'ready' ? poolState.view : null;
		if (!ad || !v) return;
		poolBusy = true;
		poolError = null;
		try {
			await withdrawFromPool({
				adapter: ad,
				creator: new PublicKey(v.creator),
				groupName: v.groupName
			});
			await loadPool();
		} catch (e) {
			poolError = mapProgramError(e).message;
		} finally {
			poolBusy = false;
		}
	}

	async function onDeploy() {
		const ad = wallet.getActiveAdapter();
		const v = poolState.status === 'ready' ? poolState.view : null;
		if (!ad || !v) return;
		poolBusy = true;
		poolError = null;
		try {
			await deployToKamino({
				adapter: ad,
				creator: new PublicKey(v.creator),
				groupName: v.groupName
			});
			await loadPool();
		} catch (e) {
			poolError = mapProgramError(e).message;
		} finally {
			poolBusy = false;
		}
	}

	async function onRecall() {
		const ad = wallet.getActiveAdapter();
		const v = poolState.status === 'ready' ? poolState.view : null;
		if (!ad || !v) return;
		poolBusy = true;
		poolError = null;
		try {
			await recallFromKamino({
				adapter: ad,
				creator: new PublicKey(v.creator),
				groupName: v.groupName
			});
			await loadPool();
		} catch (e) {
			poolError = mapProgramError(e).message;
		} finally {
			poolBusy = false;
		}
	}

	async function onHarvest() {
		const ad = wallet.getActiveAdapter();
		const v = poolState.status === 'ready' ? poolState.view : null;
		if (!ad || !v) return;
		poolBusy = true;
		poolError = null;
		try {
			await harvestYield({
				adapter: ad,
				creator: new PublicKey(v.creator),
				groupName: v.groupName
			});
			await loadPool();
		} catch (e) {
			poolError = mapProgramError(e).message;
		} finally {
			poolBusy = false;
		}
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
		{:else if tab === 'pool'}
			{#if poolState.status === 'loading'}
				<p class="py-16 text-center text-sm font-bold text-mute">Loading pool…</p>
			{:else if poolState.status === 'error'}
				<div class="mx-5 mt-6 rounded-[28px] bg-surface p-[22px]">
					<StatusCard icon={CircleAlert} title="Could not load pool" body={poolState.message}>
						{#snippet actions()}
							<Button onclick={() => void loadPool()}>Try again</Button>
						{/snippet}
					</StatusCard>
				</div>
			{:else}
				<PoolTab
					view={poolState.view}
					busy={poolBusy}
					error={poolError}
					onenable={() => void onEnablePool()}
					ondeposit={(n) => void onDeposit(n)}
					onwithdraw={() => void onWithdraw()}
					ondeploy={() => void onDeploy()}
					onrecall={() => void onRecall()}
					onharvest={() => void onHarvest()}
				/>
			{/if}
		{:else if tab === 'history'}
			{#if historyState.status === 'error'}
				<div class="mx-5 mt-6 rounded-[28px] bg-surface p-[22px]">
					<StatusCard
						icon={CircleAlert}
						title="Could not load history"
						body={historyState.message}
					>
						{#snippet actions()}
							<Button onclick={() => void loadHistory()}>Try again</Button>
						{/snippet}
					</StatusCard>
				</div>
			{:else}
				<HistoryTab
					items={historyState.status === 'ready' ? historyState.items : []}
					metaDegraded={historyState.status === 'ready' && historyState.metaDegraded}
					loading={historyState.status === 'loading'}
					onretry={() => void loadHistory()}
				/>
			{/if}
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

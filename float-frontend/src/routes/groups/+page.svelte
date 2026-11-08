<script lang="ts">
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";
	import { resolve } from "$app/paths";
	import Plus from "@lucide/svelte/icons/plus";
	import WifiOff from "@lucide/svelte/icons/wifi-off";
	import CircleAlert from "@lucide/svelte/icons/circle-alert";
	import { getWalletContext } from "#lib/wallet/wallet.svelte.ts";
	import {
		getProfile,
		avatarUrl,
		fallbackAvatarGradient,
	} from "#lib/supabase/profiles.ts";
	import NetworkBadge from "#lib/components/ui/NetworkBadge.svelte";
	import Button from "#lib/components/ui/Button.svelte";
	import BottomNav from "#lib/components/nav/BottomNav.svelte";
	import GroupCard from "#lib/groups/GroupCard.svelte";
	import GroupsSummary from "#lib/groups/GroupsSummary.svelte";
	import GroupsEmpty from "#lib/groups/GroupsEmpty.svelte";
	import GroupsLoading from "#lib/groups/GroupsLoading.svelte";
	import { loadGroups } from "#lib/groups/load.ts";
	import type { GroupsLoadState } from "#lib/groups/types.ts";

	const wallet = getWalletContext();

	let loadState = $state<GroupsLoadState>({ status: "loading" });
	let avatar = $state<string | null>(null);
	let avatarGrad = $state("linear-gradient(135deg, #a78bfa, #22d3c5)");

	onMount(() => {
		void bootstrap();

		const onOnline = () => void refresh();
		window.addEventListener("online", onOnline);
		return () => window.removeEventListener("online", onOnline);
	});

	async function bootstrap() {
		if (!wallet.address) {
			await goto(resolve("/"), { replaceState: true });
			return;
		}

		avatarGrad = fallbackAvatarGradient(wallet.address);

		try {
			const profile = await getProfile(wallet.address);
			if (!profile) {
				await goto(resolve("/onboarding"), { replaceState: true });
				return;
			}
			avatar = avatarUrl(profile);
		} catch {
			/* header avatar is decorative; still try to load groups */
		}

		await refresh();
	}

	async function refresh() {
		if (!wallet.address) return;
		loadState = { status: "loading" };
		loadState = await loadGroups(wallet.address);
	}

	function openGroup(pubkey: string) {
		void goto(resolve("/groups/[pubkey]", { pubkey }));
	}

	function startGroup() {
		void goto(resolve("/groups/new"));
	}

	function joinGroup() {
		void goto(resolve("/groups/join"));
	}

	function openProfile() {
		void goto(resolve("/profile"));
	}
</script>

<main class="flex min-h-dvh flex-col pb-0">
	<header
		class="flex items-center justify-between px-5 pt-[max(22px,env(safe-area-inset-top))]"
	>
		<h1 class="font-display text-[32px] font-semibold">Groups</h1>
		<div class="flex items-center gap-2.5">
			<NetworkBadge />
			<button
				type="button"
				aria-label="Open profile"
				class="size-9 overflow-hidden rounded-full"
				onclick={openProfile}
			>
				{#if avatar}
					<img src={avatar} alt="" class="size-9 object-cover" />
				{:else}
					<span
						class="block size-9"
						style:background={avatarGrad}
						aria-hidden="true"
					></span>
				{/if}
			</button>
		</div>
	</header>

	{#if loadState.status === "loading"}
		<GroupsLoading />
	{:else if loadState.status === "error"}
		<div
			class="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center"
		>
			<div
				class="grid size-14 place-items-center rounded-[20px] bg-raised-2 text-coral"
			>
				<CircleAlert size={26} aria-hidden="true" />
			</div>
			<h2 class="font-display text-[22px] font-semibold">
				Could not load your groups
			</h2>
			<p class="text-sm leading-snug font-semibold text-mute">
				{loadState.message ||
					"We could not reach the network. Your groups are safe on-chain."}
			</p>
			<div class="mt-2 w-full max-w-xs">
				<Button onclick={() => void refresh()}>Try again</Button>
			</div>
		</div>
	{:else if loadState.status === "empty"}
		<GroupsEmpty oncreate={startGroup} onjoin={joinGroup} />
	{:else}
		<!-- ready | offline -->
		{#if loadState.status === "offline"}
			<div
				class="mx-5 mt-3 flex items-center gap-2 rounded-2xl bg-raised px-3.5 py-2.5"
				role="status"
			>
				<WifiOff
					size={16}
					class="shrink-0 text-amber"
					aria-hidden="true"
				/>
				<p class="text-[13px] font-bold text-mute">
					Offline · showing saved groups
				</p>
				<button
					type="button"
					class="ml-auto text-[13px] font-extrabold text-primary"
					onclick={() => void refresh()}
				>
					Retry
				</button>
			</div>
		{/if}

		<div class="mt-4 px-5">
			<GroupsSummary summary={loadState.summary} />
		</div>

		<h2 class="mt-[18px] mb-2 px-5 font-display text-[17px] font-semibold">
			Your groups
		</h2>

		<div class="flex flex-col gap-2 px-5">
			{#each loadState.groups as group (group.pubkey)}
				<GroupCard {group} onclick={() => openGroup(group.pubkey)} />
			{/each}

			<button
				type="button"
				class={[
					"mt-1 flex w-full items-center gap-3.5 rounded-[28px] bg-raised p-3.5 text-left",
					"shadow-[0_3px_0_var(--color-sink)] transition-[transform,box-shadow] duration-100",
					"active:translate-y-[3px] active:shadow-[0_1px_0_var(--color-sink)]",
				]}
				onclick={startGroup}
			>
				<span
					class="grid size-[52px] shrink-0 place-items-center rounded-[18px] bg-raised-2 text-primary"
				>
					<Plus size={22} strokeWidth={2.4} aria-hidden="true" />
				</span>
				<span class="min-w-0 flex-1">
					<span class="block text-[15px] font-extrabold"
						>Start a new group</span
					>
					<span class="block text-xs font-bold text-primary"
						>or join with a link</span
					>
				</span>
			</button>
		</div>

		<div class="flex-1"></div>
	{/if}

	<BottomNav active="groups" />
</main>

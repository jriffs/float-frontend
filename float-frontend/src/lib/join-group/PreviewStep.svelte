<script lang="ts">
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Button from '#lib/components/ui/Button.svelte';
	import IconButton from '#lib/components/ui/IconButton.svelte';
	import NetworkBadge from '#lib/components/ui/NetworkBadge.svelte';
	import type { JoinFlow } from './join-flow.svelte.ts';

	interface Props {
		flow: JoinFlow;
		onback: () => void;
	}

	let { flow, onback }: Props = $props();

	const group = $derived(flow.preview);
	const members = $derived(flow.membersForUi());
</script>

<main class="flex min-h-dvh flex-col pb-[max(1.25rem,env(safe-area-inset-bottom))]">
	<header
		class="flex items-center gap-3.5 px-5 pt-[max(20px,env(safe-area-inset-top))]"
	>
		<IconButton label="Back" onclick={onback}>
			<ChevronLeft size={20} aria-hidden="true" />
		</IconButton>
		<h1 class="flex-1 font-display text-[22px] font-semibold">You are invited</h1>
		<NetworkBadge />
	</header>

	<div class="flex flex-col items-center px-6 pt-6 text-center">
		<div
			class="grad-brand grid size-[72px] place-items-center rounded-[24px] font-display text-[28px] font-semibold text-white"
		>
			{(group?.name?.[0] ?? 'G').toUpperCase()}
		</div>
		<h2 class="mt-4 font-display text-[28px] font-semibold tracking-tight">
			{group?.name ?? 'Group'}
		</h2>
		<p class="mt-1 text-[14px] font-semibold text-mute">
			Created by {group?.creatorName ?? '—'} · {group?.memberCount ?? 0} friends
		</p>
	</div>

	<section class="mx-5 mt-7 rounded-[24px] bg-surface p-4">
		<p class="mb-3 text-[11px] font-extrabold tracking-[0.08em] text-mute">WHO IS IN</p>
		<ul class="flex flex-col gap-2.5">
			{#each members as m (m.wallet)}
				<li class="flex items-center gap-3">
					<span
						class={[
							'grid size-10 place-items-center rounded-full font-display text-sm font-semibold text-white',
							m.isYou ? 'grad-violet' : 'grad-brand'
						]}
					>
						{m.displayName[0]?.toUpperCase() ?? '?'}
					</span>
					<span class="min-w-0 flex-1 text-left">
						<span class="block truncate text-[15px] font-extrabold">
							{m.displayName}
						</span>
						{#if m.role === 'creator'}
							<span class="text-xs font-bold text-mute">Creator</span>
						{:else if m.isYou}
							<span class="text-xs font-bold text-primary">You</span>
						{/if}
					</span>
				</li>
			{/each}
		</ul>
	</section>

	{#if group?.poolEnabled}
		<div class="mx-5 mt-3 flex gap-3 rounded-[22px] bg-surface px-4 py-3.5">
			<span class="grid size-10 shrink-0 place-items-center rounded-2xl grad-yield text-white">
				<Sparkles size={20} strokeWidth={2.4} aria-hidden="true" />
			</span>
			<div class="min-w-0 text-left">
				<p class="text-[14px] font-extrabold">This group has a yield pool</p>
				<p class="mt-0.5 text-[12px] leading-snug font-semibold text-mute">
					You can deposit later. Deposited money stays in the pool until the group closes.
				</p>
			</div>
		</div>
	{/if}

	<div class="flex-1"></div>

	<div class="px-5 pt-5">
		<Button loading={flow.busy} onclick={() => void flow.submit()}>Join group</Button>
		<p class="mt-3 text-center text-xs font-semibold text-mute">
			Your wallet will ask you to approve. A tiny Devnet SOL network fee applies.
		</p>
	</div>
</main>
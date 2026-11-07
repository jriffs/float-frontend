<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import Button from '#lib/components/ui/Button.svelte';
	import NetworkBadge from '#lib/components/ui/NetworkBadge.svelte';
	import type { JoinFlow, PendingPhase } from './join-flow.svelte.ts';

	interface Props {
		flow: JoinFlow;
	}

	let { flow }: Props = $props();

	const group = $derived(flow.preview);
	const members = $derived(flow.membersForUi());

	const phases: { id: PendingPhase; label: string }[] = [
		{ id: 'details', label: 'Details ready' },
		{ id: 'approve', label: 'Approve in Phantom' },
		{ id: 'joining', label: 'Joining the group on Solana' },
		{ id: 'setup', label: 'Setting you up' }
	];

	const order: PendingPhase[] = ['details', 'approve', 'joining', 'setup'];

	function phaseStatus(id: PendingPhase): 'done' | 'active' | 'todo' {
		const cur = order.indexOf(flow.pendingPhase);
		const i = order.indexOf(id);
		if (i < cur) return 'done';
		if (i === cur) return 'active';
		return 'todo';
	}
</script>

<main class="flex min-h-dvh flex-col pb-[max(1.25rem,env(safe-area-inset-bottom))]">
	<header
		class="flex items-center justify-between px-5 pt-[max(20px,env(safe-area-inset-top))]"
	>
		<h1 class="font-display text-[22px] font-semibold">You are invited</h1>
		<NetworkBadge />
	</header>

	<div class="px-5 pt-4 text-center">
		<h2 class="font-display text-[24px] font-semibold">{group?.name ?? 'Group'}</h2>
		<p class="mt-1 text-[13px] font-semibold text-mute">
			Created by {group?.creatorName ?? '—'} · {group?.memberCount ?? 0} friends
		</p>
	</div>

	<!-- Compact member strip -->
	<section class="mx-5 mt-5 rounded-[22px] bg-surface px-4 py-3">
		<p class="mb-2 text-[11px] font-extrabold tracking-[0.08em] text-mute">WHO IS IN</p>
		<div class="flex flex-wrap gap-2">
			{#each members as m (m.wallet)}
				<span
					class={[
						'inline-flex items-center gap-1.5 rounded-full bg-raised px-2.5 py-1 text-[12px] font-extrabold',
						m.isYou ? 'text-primary' : 'text-ink'
					]}
				>
					{m.displayName}
					{#if m.role === 'creator'}
						<span class="font-bold text-mute">· Creator</span>
					{/if}
				</span>
			{/each}
		</div>
	</section>

	<div class="mt-6 flex flex-col items-center px-7 text-center">
		<div class="grad-brand grid size-16 place-items-center rounded-[22px] text-white">
			<LoaderCircle size={28} class="animate-spin" strokeWidth={2.4} aria-hidden="true" />
		</div>
		<h2 class="mt-4 font-display text-[22px] font-semibold">Waiting for your wallet</h2>
		<p class="mt-1 text-[14px] font-semibold text-mute">
			Approve to join <span class="text-ink">{group?.name ?? 'the group'}</span>
		</p>
	</div>

	<ol class="mx-5 mt-6 flex flex-col rounded-[28px] bg-surface p-5">
		{#each phases as phase, i (phase.id)}
			{@const status = phaseStatus(phase.id)}
			<li class="flex items-start gap-3">
				<div class="flex flex-col items-center">
					<span
						class={[
							'grid size-8 place-items-center rounded-full text-sm font-extrabold',
							status === 'done' && 'bg-mint/20 text-mint',
							status === 'active' && 'bg-primary/20 text-primary',
							status === 'todo' && 'bg-raised-2 text-mute'
						]}
					>
						{#if status === 'done'}
							<Check size={16} strokeWidth={2.8} aria-hidden="true" />
						{:else if status === 'active'}
							<LoaderCircle size={16} class="animate-spin" strokeWidth={2.6} aria-hidden="true" />
						{:else}
							{i + 1}
						{/if}
					</span>
					{#if i < phases.length - 1}
						<span
							class={[
								'my-1 w-0.5 flex-1 min-h-4 rounded-full',
								status === 'done' ? 'bg-mint/40' : 'bg-raised-2'
							]}
							aria-hidden="true"
						></span>
					{/if}
				</div>
				<span
					class={[
						'pt-1.5 text-[15px] font-bold',
						status === 'todo' ? 'text-mute' : 'text-ink'
					]}
				>
					{phase.label}
				</span>
			</li>
		{/each}
	</ol>

	<p class="mx-5 mt-4 text-center text-[13px] leading-snug font-semibold text-mute">
		Nothing changes until you approve. You can close this and try again.
	</p>

	<div class="flex-1"></div>

	<div class="px-5 pt-5">
		<Button variant="secondary" onclick={() => flow.cancelPending()}>Cancel</Button>
	</div>
</main>
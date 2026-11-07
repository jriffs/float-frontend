<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import Button from '#lib/components/ui/Button.svelte';
	import NetworkBadge from '#lib/components/ui/NetworkBadge.svelte';
	import type { CreateFlow, PendingPhase } from './create-flow.svelte.ts';

	interface Props {
		flow: CreateFlow;
	}

	let { flow }: Props = $props();

	const phases: { id: PendingPhase; label: string }[] = [
		{ id: 'details', label: 'Details ready' },
		{ id: 'approve', label: 'Approve in Phantom' },
		{ id: 'creating', label: 'Creating your group on Solana' },
		{ id: 'invite-setup', label: 'Setting up your invite' }
	];

	const order: PendingPhase[] = ['details', 'approve', 'creating', 'invite-setup'];

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
		<h1 class="font-display text-[28px] font-semibold">New group</h1>
		<NetworkBadge />
	</header>

	<div class="flex flex-col items-center px-7 pt-10 text-center">
		<div
			class="grad-brand grid size-24 place-items-center rounded-[32px] text-white"
		>
			<LoaderCircle size={40} class="animate-spin" strokeWidth={2.4} aria-hidden="true" />
		</div>
		<h2 class="mt-7 mb-2 font-display text-[28px] font-semibold tracking-tight">
			Waiting for your wallet
		</h2>
		<p class="text-base leading-[1.45] font-semibold text-mute">
			Approve to create <span class="text-ink">{flow.trimmedName || 'your group'}</span>
		</p>
	</div>

	<ol class="mx-5 mt-8 flex flex-col gap-0 rounded-[28px] bg-surface p-5">
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
		Nothing is created until you approve. You can close this and try again.
	</p>

	<div class="flex-1"></div>

	<div class="px-5 pt-5">
		<Button variant="secondary" onclick={() => flow.cancelPending()}>Cancel</Button>
	</div>
</main>
<script lang="ts">
	import Button from '#lib/components/ui/Button.svelte';
	import NetworkBadge from '#lib/components/ui/NetworkBadge.svelte';
	import type { JoinFlow } from './join-flow.svelte.ts';

	interface Props {
		flow: JoinFlow;
		onconnect: () => void;
	}

	let { flow, onconnect }: Props = $props();

	const group = $derived(flow.preview);
</script>

<main class="flex min-h-dvh flex-col pb-[max(1.25rem,env(safe-area-inset-bottom))]">
	<header
		class="flex items-center justify-between px-6 pt-[max(22px,env(safe-area-inset-top))]"
	>
		<span class="font-display text-[26px] font-bold tracking-tight text-primary">float</span>
		<NetworkBadge />
	</header>

	<div class="flex flex-1 flex-col items-center justify-center px-6 text-center">
		<div
			class="grad-brand grid size-[88px] place-items-center rounded-[28px] font-display text-[36px] font-semibold text-white"
		>
			{(group?.name?.[0] ?? 'G').toUpperCase()}
		</div>

		<h1 class="mt-7 font-display text-[32px] leading-tight font-semibold tracking-tight">
			{group?.name ?? 'Group'}
		</h1>
		<p class="mt-2 text-[15px] font-semibold text-mute">
			<span class="text-ink">{group?.creatorName ?? 'A friend'}</span> invited you
		</p>
		<p class="mt-1 text-[13px] font-bold text-mute">
			{group?.memberCount ?? 0} friends are already in
		</p>
	</div>

	<div class="flex flex-col gap-2.5 px-5 pt-2">
		<Button onclick={onconnect}>Connect</Button>
		<p class="text-center text-xs font-semibold text-mute">Connect wallet to join</p>
		<p class="text-center text-[11px] font-semibold text-mute/80">
			Devnet beta · By continuing you agree to the Terms
		</p>
	</div>
</main>
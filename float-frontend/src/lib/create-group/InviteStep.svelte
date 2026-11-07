<script lang="ts">
	import { onMount } from 'svelte';
	import Check from '@lucide/svelte/icons/check';
	import Copy from '@lucide/svelte/icons/copy';
	import Share2 from '@lucide/svelte/icons/share-2';
	import Button from '#lib/components/ui/Button.svelte';
	import type { CreateFlow } from './create-flow.svelte.ts';

	interface Props {
		flow: CreateFlow;
		ongroup: (pubkey: string) => void;
	}

	let { flow, ongroup }: Props = $props();

	let copied = $state(false);
	let origin = $state('');

	onMount(() => {
		origin = window.location.origin;
	});

	const fullUrl = $derived(flow.inviteUrl(origin || 'https://float.app'));
	const shortPath = $derived(flow.shortInvitePath());
	const group = $derived(flow.created);

	async function copyLink() {
		if (!fullUrl) return;
		try {
			await navigator.clipboard.writeText(fullUrl);
			copied = true;
			setTimeout(() => (copied = false), 1800);
		} catch {
			/* clipboard blocked — user can still share or select text */
		}
	}

	async function shareInvite() {
		if (!fullUrl || !group) return;
		const text = `Join ${group.name} on Float`;
		if (navigator.share) {
			try {
				await navigator.share({ title: group.name, text, url: fullUrl });
				return;
			} catch {
				/* user cancelled or share failed — fall through to copy */
			}
		}
		await copyLink();
	}
</script>

<main class="flex min-h-dvh flex-col pb-[max(1.25rem,env(safe-area-inset-bottom))]">
	<div class="flex flex-1 flex-col items-center justify-center px-6 text-center">
		<div
			class="grid size-20 place-items-center rounded-[28px] bg-mint/16 text-mint"
		>
			<Check size={40} strokeWidth={2.6} aria-hidden="true" />
		</div>

		<p class="mt-6 text-xs font-extrabold tracking-[0.08em] text-mint">GROUP LIVE</p>
		<h1 class="mt-2 font-display text-[32px] leading-tight font-semibold tracking-tight">
			{group?.name ?? 'Your group'} is live
		</h1>
		<p class="mt-2 max-w-xs text-base font-semibold text-mute">
			Invite your friends so they can join.
		</p>

		<!-- Invite link card -->
		<div class="mt-8 w-full max-w-sm rounded-[24px] bg-surface p-4 text-left">
			<p class="mb-2 text-[11px] font-extrabold tracking-[0.08em] text-mute">INVITE LINK</p>
			<div class="flex items-center gap-2">
				<code
					class="min-w-0 flex-1 truncate font-mono text-[13px] font-bold text-ink"
					title={fullUrl}
				>
					{shortPath || '…'}
				</code>
				<button
					type="button"
					class={[
						'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-[14px] px-3 text-[13px] font-extrabold',
						'bg-raised shadow-[0_2px_0_var(--color-sink)] transition-[transform,box-shadow] duration-100',
						'active:translate-y-[2px] active:shadow-[0_0_0_var(--color-sink)]',
						copied ? 'text-mint' : 'text-primary'
					]}
					onclick={() => void copyLink()}
				>
					{#if copied}
						<Check size={16} strokeWidth={2.6} aria-hidden="true" />
						Copied
					{:else}
						<Copy size={16} strokeWidth={2.4} aria-hidden="true" />
						Copy
					{/if}
				</button>
			</div>

			{#if group?.poolEnabled}
				<p class="mt-3 text-[13px] font-semibold text-mute">
					<span class="font-extrabold text-amber">Pool is on.</span>
					Deposits open once friends join.
				</p>
			{/if}
		</div>
	</div>

	<div class="flex flex-col gap-2.5 px-5 pt-2">
		<Button onclick={() => void shareInvite()}>
			<span class="inline-flex items-center gap-2">
				<Share2 size={18} strokeWidth={2.4} aria-hidden="true" />
				Share invite
			</span>
		</Button>
		<Button
			variant="secondary"
			onclick={() => group && ongroup(group.pubkey)}
		>
			Go to group
		</Button>
	</div>
</main>
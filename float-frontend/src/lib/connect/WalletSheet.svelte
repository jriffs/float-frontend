<script lang="ts">
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import WalletIcon from '@lucide/svelte/icons/wallet';
	import X from '@lucide/svelte/icons/x';
	import Globe from '@lucide/svelte/icons/globe';
	import Clock from '@lucide/svelte/icons/clock';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import BottomSheet from '#lib/components/ui/BottomSheet.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import StatusCard from '#lib/components/ui/StatusCard.svelte';
	import type { WalletStore } from '#lib/wallet/wallet.svelte.ts';
	import type { ConnectFlow } from './connect-flow.svelte';

	interface Props {
		flow: ConnectFlow;
		wallet: WalletStore;
	}

	let { flow, wallet }: Props = $props();

	const sheet = $derived(flow.sheet);
</script>

<BottomSheet open={sheet.kind !== 'closed'} label="Connect a wallet" onclose={() => flow.closeSheet()}>
	{#if sheet.kind === 'picker'}
		<h2 class="font-display text-[26px] font-semibold">Connect a wallet</h2>
		<p class="mt-1 mb-4 text-sm font-semibold text-mute">Pick the wallet you use on Solana.</p>

		<ul class="flex flex-col gap-3">
			{#each wallet.options as option (option.name)}
				<li>
					<button
						type="button"
						onclick={() => flow.choose(option.name)}
						class={[
							'flex h-17 w-full items-center gap-3.5 rounded-[22px] px-4 text-left text-ink',
							'shadow-[0_4px_0_var(--edge)] transition-[transform,box-shadow] duration-100',
							'active:translate-y-[3px] active:shadow-[0_1px_0_var(--edge)]',
							option.recommended
								? 'bg-[#134b52] [--edge:#0e6f68]'
								: 'bg-raised [--edge:var(--color-sink)]'
						]}
					>
						<span
							class={['grid size-11 shrink-0 place-items-center rounded-[14px] text-white', option.tile]}
						>
							<WalletIcon size={22} aria-hidden="true" />
						</span>
						<span class="flex flex-1 items-center text-base font-extrabold">
							{option.name}
							{#if option.recommended}
								<span
									class="ml-2 inline-flex h-5 items-center rounded-full bg-primary px-2 text-[11px] font-extrabold text-on-primary"
								>
									Recommended
								</span>
							{/if}
						</span>
						<ChevronRight size={18} class="text-mute" aria-hidden="true" />
					</button>
				</li>
			{/each}
		</ul>

		<p class="mt-[18px] text-center text-[13px] font-semibold text-mute">
			New to wallets?
			<a
				href={wallet.installHref('Phantom')}
				target="_blank"
				rel="noopener noreferrer"
				class="font-extrabold text-primary"
			>
				Get Phantom
			</a>
			<br />
			<span class="text-xs">On mobile this opens the Phantom app.</span>
		</p>
	{:else if sheet.kind === 'connecting'}
		<div class="flex flex-col gap-3" role="status">
			<svg class="size-14 animate-spin text-primary" viewBox="0 0 24 24" fill="none" aria-hidden="true">
				<circle cx="12" cy="12" r="9" stroke="var(--color-raised-2)" stroke-width="3" />
				<path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
			</svg>
			<h2 class="mt-1 font-display text-[24px] font-semibold">Waiting for {sheet.wallet}</h2>
			<p class="text-sm leading-[1.45] font-semibold text-mute">
				Approve the connection in your wallet. Nothing happens until you do.
			</p>
			<Button variant="ghost" onclick={() => flow.closeSheet()}>Cancel</Button>
		</div>
	{:else if sheet.kind === 'error'}
		{#if sheet.reason === 'no-wallet'}
			<StatusCard
				icon={WalletIcon}
				title="No wallet found"
				body="Float works with Solana wallets like Phantom. Get one, then come back."
			>
				{#snippet actions()}
					<Button onclick={() => wallet.openInstall(sheet.wallet ?? 'Phantom')}>
						Get {sheet.wallet ?? 'Phantom'}
					</Button>
					<Button variant="secondary" onclick={() => flow.retry()}>I already have one</Button>
				{/snippet}
			</StatusCard>
		{:else if sheet.reason === 'cancelled'}
			<StatusCard
				icon={X}
				title="Connection cancelled"
				body="No worries, nothing was connected. Try again whenever you are ready."
			>
				{#snippet actions()}
					<Button onclick={() => flow.retry()}>Try again</Button>
					<Button variant="secondary" onclick={() => flow.chooseAnother()}>
						Choose another wallet
					</Button>
				{/snippet}
			</StatusCard>
		{:else if sheet.reason === 'wrong-network'}
			<StatusCard
				icon={Globe}
				tone="brand"
				title="Switch to Devnet"
				body="Float is running on Solana Devnet for now. Switch your wallet network, then try again."
			>
				{#snippet note()}
					<p class="rounded-2xl bg-canvas px-3 py-2.5 text-xs font-bold text-mute">
						Look for the network or developer setting in your wallet.
					</p>
				{/snippet}
				{#snippet actions()}
					<Button onclick={() => flow.retry()}>I have switched</Button>
				{/snippet}
			</StatusCard>
		{:else if sheet.reason === 'expired'}
			<StatusCard
				icon={Clock}
				title="Session expired"
				body="For your security, sign in again to pick up where you left off."
			>
				{#snippet actions()}
					<Button onclick={() => flow.signInAgain()}>Sign in again</Button>
					<Button variant="ghost" onclick={() => flow.chooseAnother()}>Use a different wallet</Button>
				{/snippet}
			</StatusCard>
		{:else}
			<StatusCard
				icon={CircleAlert}
				title="Could not connect"
				body="Something went wrong. Nothing was connected. Try again in a moment."
			>
				{#snippet actions()}
					<Button onclick={() => flow.retry()}>Try again</Button>
					<Button variant="secondary" onclick={() => flow.chooseAnother()}>
						Choose another wallet
					</Button>
				{/snippet}
			</StatusCard>
		{/if}
	{/if}
</BottomSheet>

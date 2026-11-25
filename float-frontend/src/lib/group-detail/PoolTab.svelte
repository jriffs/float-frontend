<script lang="ts">
	import Button from '#lib/components/ui/Button.svelte';
	import type { PoolView } from './pool.ts';

	interface Props {
		view: PoolView;
		busy?: boolean;
		error?: string | null;
		onenable: () => void;
		ondeposit: (amountMajor: number) => void;
		onwithdraw: () => void;
		ondeploy?: () => void;
		onrecall?: () => void;
		onharvest?: () => void;
	}

	let {
		view,
		busy = false,
		error = null,
		onenable,
		ondeposit,
		onwithdraw,
		ondeploy,
		onrecall,
		onharvest
	}: Props = $props();

	let amountInput = $state('');

	function formatUsdc(minor: number): string {
		return (minor / 1_000_000).toLocaleString('en-US', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		});
	}

	function submitDeposit() {
		const n = Number.parseFloat(amountInput.replace(/,/g, ''));
		if (!Number.isFinite(n) || n <= 0) return;
		ondeposit(n);
	}
</script>

<div class="flex flex-1 flex-col px-5 pb-28 pt-4">
	{#if error}
		<p class="mb-3 rounded-[16px] bg-danger/10 px-3.5 py-2.5 text-[12px] font-semibold text-danger">
			{error}
		</p>
	{/if}

	{#if view.phase === 'off'}
		<div class="rounded-[24px] bg-surface p-5 text-center">
			<p class="font-display text-[22px] font-semibold">Pool is off</p>
			<p class="mt-2 text-[14px] font-semibold text-mute">
				Turn on the shared pool so friends can deposit USDC and (later) earn yield on Kamino.
			</p>
			{#if view.isCreator}
				<div class="mt-5">
					<Button loading={busy} onclick={onenable}>Enable pool</Button>
				</div>
			{:else}
				<p class="mt-4 text-[13px] font-bold text-mute">Only the group creator can enable it.</p>
			{/if}
		</div>
	{:else if view.phase === 'idle'}
		<section class="rounded-[24px] bg-surface p-5">
			<p class="text-[12px] font-bold text-mute">Pool value</p>
			<p class="mt-1 font-display text-[36px] font-semibold tabular-nums">
				${formatUsdc(view.totalValue)}
			</p>
			<p class="mt-1 text-[13px] font-semibold text-mute">
				Your share ≈ ${formatUsdc(view.myValue)}
				{#if view.myPrincipal > 0}
					· deposited ${formatUsdc(view.myPrincipal)}
				{/if}
			</p>
			<p class="mt-3 text-[12px] font-bold text-mute">
				Idle in pool · not deployed to Kamino yet
			</p>
		</section>

		<section class="mt-4 rounded-[24px] bg-surface p-5">
			<p class="text-sm font-extrabold">Deposit USDC</p>
			<div class="mt-3 flex items-baseline gap-1">
				<span class="text-xl font-bold text-mute">$</span>
				<input
					type="text"
					inputmode="decimal"
					class="w-full bg-transparent font-display text-[32px] font-semibold outline-none"
					placeholder="0.00"
					bind:value={amountInput}
				/>
			</div>
			<div class="mt-4">
				<Button loading={busy} onclick={submitDeposit}>Deposit</Button>
			</div>
			{#if view.isCreator && view.totalValue > 0}
				<div class="mt-3">
					<Button variant="secondary" loading={busy} onclick={ondeploy}>
						Deploy to Kamino
					</Button>
				</div>
			{/if}
		</section>
	{:else if view.phase === 'deployed'}
		<section class="rounded-[24px] bg-surface p-5">
			<p class="text-[12px] font-extrabold text-primary">Earning on Kamino</p>
			<p class="mt-2 font-display text-[36px] font-semibold tabular-nums">
				${formatUsdc(view.totalValue)}
			</p>
			<p class="mt-1 text-[13px] font-semibold text-mute">
				Your share ≈ ${formatUsdc(view.myValue)}
			</p>
			<p class="mt-3 text-[12px] font-semibold text-mute">
				Deposits are paused while deployed. Creator must recall before using yield or closing.
			</p>
			{#if view.isCreator}
				<div class="mt-5 flex flex-col gap-2">
					<Button loading={busy} onclick={onrecall}>Recall from Kamino</Button>
					<Button variant="secondary" loading={busy} onclick={onharvest}>
						Refresh yield
					</Button>
				</div>
			{/if}
		</section>
	{:else}
		<!-- closed -->
		<section class="rounded-[24px] bg-surface p-5 text-center">
			<p class="font-display text-[22px] font-semibold">Group closed</p>
			<p class="mt-2 text-[14px] font-semibold text-mute">
				Your claim ≈ ${formatUsdc(view.myValue)}
			</p>
			{#if view.myShares > 0}
				<div class="mt-5">
					<Button loading={busy} onclick={onwithdraw}>Withdraw my share</Button>
				</div>
			{:else}
				<p class="mt-4 text-[13px] font-bold text-mute">No pool share to withdraw.</p>
			{/if}
		</section>
	{/if}
</div>
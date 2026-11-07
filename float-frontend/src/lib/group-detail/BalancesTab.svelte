<script lang="ts">
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Users from '@lucide/svelte/icons/users';
	import Button from '#lib/components/ui/Button.svelte';
	import { formatUsdc, formatYield, balanceTone } from '#lib/groups/format.ts';
	import type { GroupDetail, DetailMember } from './types';

	interface Props {
		detail: GroupDetail;
		showSettled: boolean;
		ontoggleSettled: () => void;
		onnudge: (m: DetailMember) => void;
		onsettle: (m: DetailMember) => void;
		onaddexpense: () => void;
		onsettleup: () => void;
		oninvite: () => void;
		onwithdraw: () => void;
	}

	let {
		detail,
		showSettled,
		ontoggleSettled,
		onnudge,
		onsettle,
		onaddexpense,
		onsettleup,
		oninvite,
		onwithdraw
	}: Props = $props();

	const openMembers = $derived(
		detail.members.filter((m) => m.netVsYou !== 0)
	);
	const settledMembers = $derived(
		detail.members.filter((m) => m.netVsYou === 0)
	);
	const visible = $derived(
		showSettled ? [...openMembers, ...settledMembers] : openMembers
	);

	const isEmpty = $derived(
		detail.status === 'active' &&
			detail.members.every((m) => m.netVsYou === 0) &&
			detail.myBalance === 0 &&
			detail.memberCount <= 1
	);

	const isEveryoneEven = $derived(
		detail.status === 'active' &&
			!isEmpty &&
			detail.myBalance === 0 &&
			openMembers.length === 0
	);

	const netClass = $derived.by(() => {
		const t = balanceTone(detail.myBalance);
		return t === 'mint' ? 'text-mint' : t === 'coral' ? 'text-coral' : 'text-mute';
	});
</script>

<!-- Closed banner -->
{#if detail.status === 'closed'}
	<div class="mx-5 mt-3 rounded-[18px] bg-raised px-4 py-3 text-center">
		<p class="text-[13px] font-extrabold text-mute">
			Group closed · expenses are read-only
		</p>
	</div>
{/if}

<!-- Balance hero -->
<section class="mx-5 mt-4 rounded-[28px] bg-surface p-5">
	<p class="text-[12px] font-extrabold tracking-[0.06em] text-mute">YOUR BALANCE</p>
	<p class={['mt-1 font-display text-[36px] font-semibold tabular-nums leading-none', netClass]}>
		{formatUsdc(detail.myBalance)}
	</p>
	{#if detail.myBalance !== 0}
		<p class="mt-2 text-[13px] font-semibold text-mute">
			{#if detail.owedToYou > 0}
				<span class="text-mint">Owed to you {formatUsdc(detail.owedToYou)}</span>
			{/if}
			{#if detail.owedToYou > 0 && detail.youOwe > 0}
				<span class="text-mute"> · </span>
			{/if}
			{#if detail.youOwe > 0}
				<span class="text-coral">You owe {formatUsdc(-detail.youOwe)}</span>
			{/if}
		</p>
	{/if}
</section>

<!-- Pool earning chip (active + earning) -->
{#if detail.poolEarning}
	<div
		class="mx-5 mt-3 flex items-center gap-3 rounded-[22px] bg-surface px-4 py-3"
	>
		<span class="grid size-10 place-items-center rounded-2xl grad-yield text-white">
			<Sparkles size={20} strokeWidth={2.4} aria-hidden="true" />
		</span>
		<div class="min-w-0 flex-1 text-left">
			<p class="text-[11px] font-extrabold tracking-[0.06em] text-amber">
				POOL EARNING · EST.
			</p>
			<p class="font-display text-lg font-semibold tabular-nums text-ink">
				{formatYield(detail.estYield)}
			</p>
		</div>
		<span class="text-right text-[12px] font-bold text-mute">
			Deployed<br />to Kamino
		</span>
	</div>
{/if}

<!-- Pool share ready (closed) -->
{#if detail.status === 'closed' && detail.poolShareReady}
	<div class="mx-5 mt-3 rounded-[22px] bg-surface p-4">
		<p class="text-[15px] font-extrabold">Your pool share is ready</p>
		<p class="mt-1 text-[13px] font-semibold text-mute">
			Withdraw your principal and yield
		</p>
		<div class="mt-3">
			<Button onclick={onwithdraw}>Withdraw your share</Button>
		</div>
	</div>
{/if}

<!-- Body states -->
{#if isEmpty}
	<div class="mx-5 mt-8 flex flex-col items-center text-center">
		<div class="grid size-16 place-items-center rounded-[22px] bg-raised-2 text-mute">
			<Users size={28} strokeWidth={2.2} aria-hidden="true" />
		</div>
		<h2 class="mt-4 font-display text-[22px] font-semibold">No expenses yet</h2>
		<p class="mt-2 max-w-xs text-[14px] font-semibold text-mute">
			Add the first one and everyone sees who owes what.
		</p>
		<p class="mt-4 text-[13px] font-bold text-mute">Only you so far</p>
		<div class="mt-3 w-full max-w-xs">
			<Button variant="secondary" onclick={oninvite}>Invite friends</Button>
		</div>
	</div>
{:else if isEveryoneEven}
	<div class="mx-5 mt-8 flex flex-col items-center text-center">
		<div class="grid size-16 place-items-center rounded-[22px] bg-mint/16 text-mint">
			<span class="font-display text-2xl font-semibold">✓</span>
		</div>
		<h2 class="mt-4 font-display text-[22px] font-semibold">Everyone is even</h2>
		<p class="mt-2 max-w-xs text-[14px] font-semibold text-mute">
			Nothing to settle. Add an expense when something comes up.
		</p>
	</div>
{:else}
	<section class="mx-5 mt-6">
		<p class="mb-3 text-[13px] font-extrabold text-mute">
			{detail.status === 'closed' ? 'Still to settle' : 'Who owes who'}
		</p>
		<ul class="flex flex-col gap-2.5">
			{#each visible as m (m.wallet)}
				{@const owesYou = m.netVsYou > 0}
				{@const settled = m.netVsYou === 0}
				<li
					class="flex items-center gap-3 rounded-[22px] bg-surface px-3.5 py-3"
				>
					<span
						class="grid size-11 shrink-0 place-items-center rounded-full grad-brand font-display text-sm font-semibold text-white"
					>
						{m.displayName[0]?.toUpperCase() ?? '?'}
					</span>
					<span class="min-w-0 flex-1">
						<span class="block truncate text-[15px] font-extrabold">{m.displayName}</span>
						<span class="text-[12px] font-bold text-mute">
							{#if settled}
								settled
							{:else if owesYou}
								owes you
							{:else}
								you owe
							{/if}
						</span>
					</span>
					<span class="shrink-0 text-right">
						<p
							class={[
								'font-display text-[16px] font-semibold tabular-nums',
								settled ? 'text-mute' : owesYou ? 'text-mint' : 'text-coral'
							]}
						>
							{formatUsdc(m.netVsYou)}
						</p>
						{#if !settled && detail.status !== 'closed'}
							<button
								type="button"
								class="mt-0.5 text-[12px] font-extrabold text-primary"
								onclick={() => (owesYou ? onnudge(m) : onsettle(m))}
							>
								{owesYou ? 'Nudge' : 'Settle'}
							</button>
						{:else if !settled && detail.status === 'closed'}
							<button
								type="button"
								class="mt-0.5 text-[12px] font-extrabold text-primary"
								onclick={() => (owesYou ? onnudge(m) : onsettle(m))}
							>
								{owesYou ? 'Nudge' : 'Settle'}
							</button>
						{/if}
					</span>
				</li>
			{/each}
		</ul>

		{#if detail.settledCount > 0 && openMembers.length > 0}
			<button
				type="button"
				class="mt-3 w-full text-center text-[13px] font-extrabold text-mute"
				onclick={ontoggleSettled}
			>
				{showSettled ? 'Hide settled' : `Show settled (${detail.settledCount})`}
			</button>
		{/if}

		{#if detail.status === 'closed'}
			<p class="mt-4 text-center text-[12px] font-semibold text-mute">
				Debts can still be settled after a group closes.
			</p>
		{/if}
	</section>
{/if}

<div class="flex-1"></div>

<!-- Footer actions -->
<div class="mx-5 mb-3 flex gap-2.5 pt-4">
	{#if detail.status === 'closed'}
		<!-- Withdraw already shown above when share ready; keep settle path via rows -->
		{#if !detail.poolShareReady}
			<Button onclick={onaddexpense} disabled>Add expense</Button>
		{/if}
	{:else if isEmpty}
		<Button onclick={onaddexpense}>Add expense</Button>
	{:else if isEveryoneEven}
		<Button onclick={onaddexpense}>Add expense</Button>
	{:else}
		<Button class="flex-1" onclick={onaddexpense}>Add expense</Button>
		<Button class="flex-1" variant="secondary" onclick={onsettleup}>Settle up</Button>
	{/if}
</div>
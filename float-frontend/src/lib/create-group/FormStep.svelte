<script lang="ts">
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Waves from '@lucide/svelte/icons/waves';
	import DollarSign from '@lucide/svelte/icons/dollar-sign';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Button from '#lib/components/ui/Button.svelte';
	import IconButton from '#lib/components/ui/IconButton.svelte';
	import NetworkBadge from '#lib/components/ui/NetworkBadge.svelte';
	import type { CreateFlow } from './create-flow.svelte.ts';

	interface Props {
		flow: CreateFlow;
		onback: () => void;
	}

	let { flow, onback }: Props = $props();

	const poolOn = $derived(flow.poolEnabled);
</script>

<main class="flex min-h-dvh flex-col pb-[max(1.25rem,env(safe-area-inset-bottom))]">
	<header
		class="flex items-center gap-3.5 px-5 pt-[max(20px,env(safe-area-inset-top))]"
	>
		<IconButton label="Back" onclick={onback}>
			<ChevronLeft size={20} aria-hidden="true" />
		</IconButton>
		<h1 class="flex-1 font-display text-[28px] font-semibold">New group</h1>
		<NetworkBadge />
	</header>

	<!-- Hero icon + palette chips (matches S4Form mock) -->
	<div class="flex flex-col items-center gap-3 px-5 pt-3.5">
		<div
			class="grad-brand animate-bob grid size-[76px] place-items-center rounded-[26px] text-white"
		>
			<Waves size={36} strokeWidth={2.2} aria-hidden="true" />
		</div>
		<div class="flex justify-center gap-3 py-1.5" aria-hidden="true">
			<span class="grad-brand grid size-11 place-items-center rounded-2xl text-white">
				<Waves size={22} strokeWidth={2.2} />
			</span>
			<span class="grad-violet grid size-11 place-items-center rounded-2xl text-white">
				<Sparkles size={22} strokeWidth={2.2} />
			</span>
			<span class="grad-pink grid size-11 place-items-center rounded-2xl text-white">
				<DollarSign size={22} strokeWidth={2.2} />
			</span>
		</div>
	</div>

	<div class="mt-5 flex flex-col gap-4 px-5">
		<!-- Group name -->
		<div>
			<div class="mb-2 flex items-baseline justify-between">
				<label for="group-name" class="text-sm font-extrabold">Group name</label>
				<span
					class={[
						'text-xs font-bold',
						flow.nameOverLimit || flow.nameError ? 'text-coral' : 'text-mute'
					]}
				>
					{flow.nameCount} / {flow.nameMax}
				</span>
			</div>
			<input
				id="group-name"
				type="text"
				maxlength={flow.nameMax + 8}
				autocomplete="off"
				placeholder="Cape Town 2026"
				value={flow.name}
				aria-invalid={!!flow.nameError}
				aria-describedby={flow.nameError ? 'group-name-hint' : undefined}
				class={[
					'h-14 w-full rounded-[18px] bg-surface px-[18px] text-[17px] font-bold text-ink',
					'placeholder:text-mute/60 outline-none',
					'transition-[box-shadow] duration-150',
					'focus-visible:shadow-[0_0_0_3px_rgb(34_211_197_/_0.4)]',
					flow.nameError ? 'shadow-[0_0_0_3px_rgb(255_122_107_/_0.45)]' : ''
				]}
				oninput={(e) => flow.setName((e.currentTarget as HTMLInputElement).value)}
			/>
			{#if flow.nameError}
				<p id="group-name-hint" class="mt-2 text-[13px] font-bold text-coral" role="alert">
					{flow.nameError}
				</p>
			{/if}
		</div>

		<!-- Settles in USDC (fixed for MVP) -->
		<div
			class="flex items-center gap-3.5 rounded-[22px] bg-surface px-4 py-3.5"
		>
			<span
				class="grid size-11 shrink-0 place-items-center rounded-2xl bg-raised-2 text-mint"
			>
				<DollarSign size={22} strokeWidth={2.4} aria-hidden="true" />
			</span>
			<span class="min-w-0 flex-1">
				<span class="block text-[15px] font-extrabold">Settles in USDC</span>
				<span class="block text-xs font-bold text-mute">Dollar-stable</span>
			</span>
			<span
				class="rounded-full bg-raised px-2.5 py-1 text-[11px] font-extrabold tracking-wide text-mute"
			>
				FIXED
			</span>
		</div>

		<!-- Yield pool toggle -->
		<div class="overflow-hidden rounded-[22px] bg-surface">
			<button
				type="button"
				class="flex w-full items-center gap-3.5 px-4 py-3.5 text-left"
				onclick={() => flow.togglePool()}
				aria-pressed={poolOn}
			>
				<span
					class={[
						'grid size-11 shrink-0 place-items-center rounded-2xl text-white',
						poolOn ? 'grad-yield' : 'bg-raised-2 text-mute'
					]}
				>
					<Sparkles size={22} strokeWidth={2.4} aria-hidden="true" />
				</span>
				<span class="min-w-0 flex-1">
					<span class="block text-[15px] font-extrabold">Yield pool</span>
					<span class="block text-xs font-bold text-mute">
						Deposit together and earn while you travel
					</span>
				</span>
				<span
					class={[
						'relative h-7 w-12 shrink-0 rounded-full transition-colors duration-150',
						poolOn ? 'bg-primary' : 'bg-raised-2'
					]}
					aria-hidden="true"
				>
					<span
						class={[
							'absolute top-0.5 size-6 rounded-full bg-white shadow transition-transform duration-150',
							poolOn ? 'translate-x-5' : 'translate-x-0.5'
						]}
					></span>
				</span>
			</button>

			<!-- How the pool works -->
			<div class="border-t border-raised-2/80 px-2 pb-2">
				<button
					type="button"
					class="flex w-full items-center justify-between px-2 py-3 text-left"
					onclick={() => flow.togglePoolHelp()}
					aria-expanded={flow.poolHelpOpen}
				>
					<span class="text-[13px] font-extrabold text-mute">How the pool works</span>
					<ChevronDown
						size={18}
						class={[
							'text-mute transition-transform duration-150',
							flow.poolHelpOpen ? 'rotate-180' : ''
						]}
						aria-hidden="true"
					/>
				</button>
				{#if flow.poolHelpOpen}
					<ul class="flex flex-col gap-2.5 px-2 pb-3 text-[13px] leading-snug font-semibold text-mute">
						<li class="flex gap-2">
							<span class="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber"></span>
							<span>Members deposit USDC into a shared pool.</span>
						</li>
						<li class="flex gap-2">
							<span class="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber"></span>
							<span>You choose when to put it to work earning on Kamino.</span>
						</li>
						<li class="flex gap-2">
							<span class="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber"></span>
							<span>
								Money stays in the pool until the group closes, then everyone withdraws their
								share.
							</span>
						</li>
						<li class="flex gap-2">
							<span class="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber"></span>
							<span>You can also switch this on later.</span>
						</li>
					</ul>
				{/if}
			</div>
		</div>
	</div>

	<div class="flex-1"></div>

	<div class="px-5 pt-5">
		<Button disabled={!flow.canSubmit} loading={flow.busy} onclick={() => void flow.submit()}>
			Create group
		</Button>
		<p class="mt-3 text-center text-xs font-semibold text-mute">
			Your wallet will ask you to approve. A tiny Devnet SOL network fee applies.
		</p>
	</div>
</main>
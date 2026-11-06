<script lang="ts">
	import Receipt from '@lucide/svelte/icons/receipt';
	import Zap from '@lucide/svelte/icons/zap';
	import Flame from '@lucide/svelte/icons/flame';
	import Waves from '@lucide/svelte/icons/waves';
	import Coins from '@lucide/svelte/icons/coins';
	import Button from '#lib/components/ui/Button.svelte';

	interface Props {
		oncreate: () => void;
		onjoin: () => void;
	}

	let { oncreate, onjoin }: Props = $props();

	const features = [
		{
			title: 'Log expenses',
			body: 'Everyone adds what they paid',
			grad: 'grad-brand',
			Icon: Receipt,
			n: '1'
		},
		{
			title: 'Settle in one tap',
			body: 'USDC moves instantly, no transfers',
			grad: 'grad-violet',
			Icon: Zap,
			n: '2'
		},
		{
			title: 'Pool and earn',
			body: 'Optional: deposit together, earn while you wait',
			grad: 'grad-yield',
			Icon: Flame,
			n: '3'
		}
	] as const;

	function openFaucet() {
		window.open('https://faucet.circle.com/', '_blank', 'noopener,noreferrer');
	}
</script>

<div class="flex flex-1 flex-col px-5">
	<div class="relative mt-2.5 flex flex-col items-center px-2 text-center">
		<div class="relative h-28 w-full" aria-hidden="true">
			<div
				class="grad-brand absolute top-4 left-1/2 grid size-20 -translate-x-1/2 animate-bob place-items-center rounded-[28px] text-white"
			>
				<Waves size={38} strokeWidth={2.2} />
			</div>
			<div
				class="grad-pink absolute top-2 left-[18%] size-[46px] animate-bob rounded-full border-4 border-canvas [animation-delay:-1s]"
			></div>
			<div
				class="grad-violet absolute top-10 right-[16%] size-[42px] animate-bob rounded-full border-4 border-canvas [animation-delay:-2s]"
			></div>
		</div>
		<h2 class="mt-2 font-display text-[30px] font-semibold">No groups yet</h2>
		<p class="mt-1.5 max-w-[280px] text-[15px] leading-snug font-semibold text-mute">
			Split a trip, a flat or a dinner. Start one or join a friend.
		</p>
	</div>

	<ul class="mt-[18px] flex flex-col gap-2">
		{#each features as f}
			<li class="flex items-center gap-3.5 rounded-[22px] bg-raised px-3.5 py-3">
				<span
					class={['grid size-11 shrink-0 place-items-center rounded-[14px] text-white', f.grad]}
				>
					<f.Icon size={22} strokeWidth={2.2} aria-hidden="true" />
				</span>
				<span class="min-w-0 flex-1">
					<span class="block text-[15px] font-extrabold">{f.title}</span>
					<span class="mt-px block text-xs font-semibold text-mute">{f.body}</span>
				</span>
				<span class="font-display text-lg font-semibold text-raised-2">{f.n}</span>
			</li>
		{/each}
	</ul>

	<div class="mt-3 flex items-center gap-3 rounded-[22px] bg-raised px-3.5 py-3">
		<span class="grid size-11 shrink-0 place-items-center rounded-[14px] bg-raised-2 text-amber">
			<Coins size={22} strokeWidth={2.2} aria-hidden="true" />
		</span>
		<span class="min-w-0 flex-1">
			<span class="block text-sm font-extrabold">Need test USDC?</span>
			<span class="mt-px block text-xs font-semibold text-mute"
				>Devnet only, free from the faucet</span
			>
		</span>
		<button
			type="button"
			class={[
				'h-[38px] shrink-0 rounded-[14px] bg-raised-2 px-3.5 text-[13px] font-extrabold',
				'shadow-[0_3px_0_var(--color-sink)] transition-[transform,box-shadow] duration-100',
				'active:translate-y-[3px] active:shadow-[0_1px_0_var(--color-sink)]'
			]}
			onclick={openFaucet}
		>
			Get USDC
		</button>
	</div>

	<div class="flex-1"></div>

	<div class="flex flex-col gap-2.5 pt-4 pb-3.5">
		<Button onclick={oncreate}>Start a group</Button>
		<Button variant="secondary" onclick={onjoin}>Join with a link</Button>
	</div>
</div>
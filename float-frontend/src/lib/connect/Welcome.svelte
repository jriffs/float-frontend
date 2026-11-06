<script lang="ts">
	import Waves from '@lucide/svelte/icons/waves';
	import Users from '@lucide/svelte/icons/users';
	import Flame from '@lucide/svelte/icons/flame';
	import Button from '#lib/components/ui/Button.svelte';
	import NetworkBadge from '#lib/components/ui/NetworkBadge.svelte';

	interface Props {
		loading?: boolean;
		onconnect: () => void;
	}

	let { loading = false, onconnect }: Props = $props();
</script>

<main class="flex min-h-dvh flex-col pb-[max(1.25rem,env(safe-area-inset-bottom))]">
	<header class="flex items-center justify-between px-6 pt-[max(22px,env(safe-area-inset-top))]">
		<span class="font-display text-[26px] font-bold tracking-tight text-primary">float</span>
		<NetworkBadge />
	</header>

	<!-- Decorative hero: purely visual, hidden from assistive tech -->
	<div class="relative mt-2 h-[270px]" aria-hidden="true">
		<div class="absolute inset-x-0 top-[70px] flex justify-center">
			<div class="grad-brand grid size-24 animate-bob place-items-center rounded-[32px] text-white">
				<Waves size={44} />
			</div>
		</div>
		<div
			class="grad-pink absolute top-6 left-[15%] size-14 animate-bob rounded-full border-4 border-canvas [animation-delay:-1s]"
		></div>
		<div
			class="grad-violet absolute top-11 left-[74%] size-12 animate-bob rounded-full border-4 border-canvas [animation-delay:-2s]"
		></div>
		<div
			class="absolute top-[178px] left-[8%] flex h-10 items-center gap-2 rounded-full bg-surface px-4 text-sm font-extrabold text-mint"
		>
			+$18.00 <span class="font-bold text-mute">from Kofi</span>
		</div>
		<div
			class="absolute top-[206px] left-1/2 flex h-10 items-center gap-2 rounded-full bg-amber/13 px-4 text-[13px] font-extrabold text-amber"
		>
			<span class="size-2.5 animate-pulse-ring rounded-full bg-amber"></span>
			Pool earning
		</div>
	</div>

	<div class="px-6">
		<h1
			class="font-display text-[46px] leading-[1.05] font-semibold tracking-[-0.015em] text-balance"
		>
			Split it.<br />Settle it.<br /><span class="text-primary">Let it float.</span>
		</h1>
		<p class="mt-3 text-base font-bold text-mute">Group money that works while you travel.</p>
	</div>

	<ul class="flex flex-col gap-3 px-6 pt-[22px]">
		<li class="flex items-center gap-3">
			<span class="grad-brand grid size-10 shrink-0 place-items-center rounded-[14px] text-white">
				<Users size={20} aria-hidden="true" />
			</span>
			<span class="text-[15px] font-bold">Split any bill, settle in one tap</span>
		</li>
		<li class="flex items-center gap-3">
			<span class="grad-yield grid size-10 shrink-0 place-items-center rounded-[14px] text-white">
				<Flame size={20} aria-hidden="true" />
			</span>
			<span class="text-[15px] font-bold">Pool cash and earn while you wait</span>
		</li>
	</ul>

	<div class="flex-1"></div>

	<div class="px-6 pt-6">
		<Button {loading} onclick={onconnect}>Connect wallet</Button>
		<p class="mt-3.5 text-center text-xs font-semibold text-mute">
			Devnet beta · By continuing you agree to the Terms
		</p>
	</div>
</main>

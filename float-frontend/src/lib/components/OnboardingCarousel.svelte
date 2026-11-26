<script lang="ts">
	import Button from '#lib/components/ui/Button.svelte';

	interface Props {
		onfinish: () => void;
	}

	let { onfinish }: Props = $props();

	const slides = [
		'/onboarding/slide-1.png',
		'/onboarding/slide-2.png',
		'/onboarding/slide-3.png',
		'/onboarding/slide-4.png',
		'/onboarding/slide-5.png'
	];

	let current = $state(0);
	let touchStartX = 0;

	const isLast = $derived(current === slides.length - 1);

	function next() {
		if (isLast) {
			onfinish();
		} else {
			current += 1;
		}
	}

	function skip() {
		onfinish();
	}

	function onTouchStart(e: TouchEvent) {
		touchStartX = e.changedTouches[0].screenX;
	}

	function onTouchEnd(e: TouchEvent) {
		const delta = e.changedTouches[0].screenX - touchStartX;
		if (Math.abs(delta) < 48) return;
		if (delta < 0 && !isLast) current += 1;
		if (delta > 0 && current > 0) current -= 1;
	}
</script>

<div
	class="relative h-dvh w-full overflow-hidden bg-canvas select-none"
	ontouchstart={onTouchStart}
	ontouchend={onTouchEnd}
>
	<!-- full-bleed slide -->
	<img
		src={slides[current]}
		alt="Onboarding slide {current + 1}"
		class="absolute inset-0 size-full object-cover object-center"
		draggable="false"
	/>

	<!-- top-right Skip (matches design overlays) -->
	{#if !isLast}
		<button
			type="button"
			class="absolute top-[max(16px,env(safe-area-inset-top))] right-5 z-10 px-1 py-2 text-[15px] font-bold text-ink/80"
			onclick={skip}
		>
			Skip
		</button>
	{/if}

	<!-- bottom controls (safe zone) -->
	<div
		class="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-5 px-6 pb-[max(28px,env(safe-area-inset-bottom))]"
	>
		<!-- dots -->
		<div class="flex items-center gap-2" aria-hidden="true">
			{#each slides as _, i}
				<span
					class="h-2 rounded-full transition-all duration-200
					{i === current ? 'w-6 bg-primary' : 'w-2 bg-ink/25'}"
				></span>
			{/each}
		</div>

		<!-- Next / Get started – reuses your primary Button -->
		<Button onclick={next}>
			{isLast ? 'Get started' : 'Next'}
		</Button>
	</div>
</div>
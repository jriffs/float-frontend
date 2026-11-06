<script lang="ts">
	import Button from '#lib/components/ui/Button.svelte';

	interface Props {
		name: string;
		previewUrl?: string | null;
		gradient: string;
		/** Name saved but photo upload failed. */
		photoPending?: boolean;
		loading?: boolean;
		oncontinue: () => void;
		onretryphoto?: () => void;
	}

	let {
		name,
		previewUrl = null,
		gradient,
		photoPending = false,
		loading = false,
		oncontinue,
		onretryphoto
	}: Props = $props();

	const initial = $derived(name.trim() ? name.trim()[0]!.toUpperCase() : '?');

	/** Decorative confetti positions — purely visual, matches S2Welcome. */
	const confetti = [
		{ left: '40px', top: '80px', w: 14, h: 8, r: 3, color: '#22D3C5', rot: 20, delay: '0s' },
		{ left: '300px', top: '60px', w: 10, h: 10, r: 999, color: '#F472B6', rot: -30, delay: '-1s' },
		{ left: '80px', top: '200px', w: 12, h: 6, r: 3, color: '#A78BFA', rot: 45, delay: '-2s' },
		{ left: '330px', top: '230px', w: 10, h: 10, r: 999, color: '#4ADE80', rot: 10, delay: '0s' },
		{ left: '30px', top: '330px', w: 8, h: 14, r: 3, color: '#3B82F6', rot: -50, delay: '-1s' },
		{ left: '350px', top: '360px', w: 12, h: 6, r: 3, color: '#22D3C5', rot: 70, delay: '-2s' },
		{ left: '120px', top: '60px', w: 8, h: 8, r: 3, color: '#4ADE80', rot: 0, delay: '0s' },
		{ left: '250px', top: '120px', w: 14, h: 6, r: 3, color: '#A78BFA', rot: -20, delay: '-1s' },
		{ left: '60px', top: '450px', w: 10, h: 10, r: 3, color: '#F472B6', rot: 30, delay: '-2s' },
		{ left: '320px', top: '470px', w: 12, h: 6, r: 3, color: '#3B82F6', rot: -60, delay: '0s' },
		{ left: '190px', top: '40px', w: 10, h: 6, r: 3, color: '#F472B6', rot: 15, delay: '-1s' },
		{ left: '210px', top: '520px', w: 8, h: 8, r: 999, color: '#22D3C5', rot: 0, delay: '-2s' }
	] as const;
</script>

<main
	class="relative flex min-h-dvh flex-col overflow-hidden pb-[max(1.25rem,env(safe-area-inset-bottom))]"
>
	<!-- Decorative floating shapes (hidden from a11y) -->
	<div class="pointer-events-none absolute inset-0" aria-hidden="true">
		{#each confetti as c}
			<div
				class="animate-bob absolute"
				style:left={c.left}
				style:top={c.top}
				style:width="{c.w}px"
				style:height="{c.h}px"
				style:border-radius="{c.r}px"
				style:background={c.color}
				style:transform="rotate({c.rot}deg)"
				style:animation-delay={c.delay}
			></div>
		{/each}
	</div>

	<div
		class="relative flex flex-1 flex-col items-center justify-center px-8 text-center"
	>
		{#if previewUrl}
			<img
				src={previewUrl}
				alt=""
				class="animate-bob size-32 rounded-full object-cover"
			/>
		{:else}
			<div
				class="animate-bob grid size-32 place-items-center rounded-full font-display text-[52px] font-semibold text-white"
				style:background={gradient}
				aria-hidden="true"
			>
				{initial}
			</div>
		{/if}

		{#if photoPending}
			<h1 class="mt-6 font-display text-[34px] leading-tight font-semibold tracking-[-0.01em]">
				You are in, photo pending
			</h1>
			<p class="mt-3 max-w-[280px] text-base font-semibold text-mute">
				We saved your name, but the photo did not upload. You can add it again from Profile.
			</p>
		{:else}
			<h1 class="mt-6 font-display text-[34px] leading-tight font-semibold tracking-[-0.01em]">
				You are in, {name}
			</h1>
			<p class="mt-3 max-w-[280px] text-base font-semibold text-mute">
				Start a group, or join one with a link from a friend.
			</p>
		{/if}
	</div>

	<div class="relative px-6 pt-4">
		<Button {loading} onclick={oncontinue}>Continue</Button>
		{#if photoPending && onretryphoto}
			<button
				type="button"
				class="mt-3 w-full text-center text-[15px] font-extrabold text-primary"
				onclick={onretryphoto}
			>
				Try the photo again
			</button>
		{/if}
	</div>
</main>
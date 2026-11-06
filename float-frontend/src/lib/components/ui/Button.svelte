<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Variant = 'primary' | 'secondary' | 'ghost';

	interface Props extends Omit<HTMLButtonAttributes, 'children'> {
		variant?: Variant;
		loading?: boolean;
		children: Snippet;
	}

	let {
		variant = 'primary',
		loading = false,
		disabled = false,
		type = 'button',
		class: className,
		children,
		...rest
	}: Props = $props();

	const solid = $derived(variant !== 'ghost');

	// Palette is chosen in one place so utilities never fight each other.
	const palette = $derived.by(() => {
		if (variant === 'ghost') return 'bg-transparent text-primary';
		if (disabled) return 'bg-raised text-mute opacity-60 [--edge:transparent]';
		return variant === 'primary'
			? 'bg-primary text-on-primary [--edge:var(--color-primary-edge)]'
			: 'bg-raised text-ink [--edge:var(--color-sink)]';
	});
</script>

<button
	{type}
	disabled={disabled || loading}
	aria-busy={loading || undefined}
	class={[
		'inline-flex w-full items-center justify-center gap-2 text-[15px] font-extrabold select-none',
		'transition-[transform,box-shadow] duration-100 disabled:cursor-not-allowed',
		solid
			? 'h-13 rounded-[18px] shadow-[0_4px_0_var(--edge)] enabled:active:translate-y-[3px] enabled:active:shadow-[0_1px_0_var(--edge)]'
			: 'h-11 disabled:opacity-60',
		palette,
		className
	]}
	{...rest}
>
	{#if loading}
		<svg class="size-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-opacity="0.25" stroke-width="3" />
			<path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
		</svg>
	{/if}
	{@render children()}
</button>

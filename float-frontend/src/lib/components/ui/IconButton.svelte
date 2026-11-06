<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	interface Props extends Omit<HTMLButtonAttributes, 'children'> {
		label: string;
		children: Snippet;
	}

	let { label, type = 'button', class: className, children, ...rest }: Props = $props();
</script>

<button
	{type}
	aria-label={label}
	class={[
		'grid size-11 shrink-0 place-items-center rounded-[18px] bg-raised text-ink',
		'shadow-[0_3px_0_var(--color-sink)] transition-[transform,box-shadow] duration-100',
		'active:translate-y-[3px] active:shadow-[0_1px_0_var(--color-sink)]',
		className
	]}
	{...rest}
>
	{@render children()}
</button>

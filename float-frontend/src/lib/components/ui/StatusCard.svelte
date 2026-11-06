<script lang="ts">
	import type { Component, Snippet } from 'svelte';
	import type { IconProps } from '@lucide/svelte';
	import { CircleAlert, Info, Activity } from '@lucide/svelte';

	interface Props {
		icon: Component<IconProps>;
		title: string;
		body: string;
		/** `brand` is for states that are not failures (e.g. switch network). */
		tone?: 'muted' | 'brand';
		/** Optional hint box under the body. */
		note?: Snippet;
		actions?: Snippet;
	}

	let { icon: Icon, title, body, tone = 'muted', note, actions }: Props = $props();
</script>

<div class="flex flex-col gap-3" role="status">
	<div
		class={[
			'grid size-14 place-items-center rounded-[20px] text-white',
			tone === 'brand' ? 'grad-brand' : 'bg-raised-2'
		]}
	>
		<CircleAlert size={26} aria-hidden="true" />
	</div>
	<h2 class="mt-1 font-display text-[22px] font-semibold">{title}</h2>
	<p class="text-sm leading-[1.45] font-semibold text-mute">{body}</p>
	{@render note?.()}
	{#if actions}
		<div class="mt-1 flex flex-col gap-2.5">
			{@render actions()}
		</div>
	{/if}
</div>

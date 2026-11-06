<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		open: boolean;
		label: string;
		onclose?: () => void;
		children: Snippet;
	}

	let { open, label, onclose, children }: Props = $props();

	let dialog = $state<HTMLDialogElement>();

	// Native <dialog> gives us focus trapping, Esc to close and a backdrop for free.
	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		else if (!open && dialog.open) dialog.close();
	});
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog
	bind:this={dialog}
	aria-label={label}
	onclose={() => onclose?.()}
	onclick={(e) => {
		if (e.target === dialog) dialog?.close(); // tap on the dimmed area
	}}
	class="m-0 h-full max-h-none w-full max-w-none overflow-hidden border-0 bg-transparent p-0 text-ink backdrop:bg-[#050910]/60"
>
	<div
		class="sheet absolute inset-x-0 bottom-0 mx-auto max-h-[92dvh] w-full max-w-[430px] overflow-y-auto rounded-t-[28px] bg-surface px-5 pt-3 pb-[max(1.75rem,env(safe-area-inset-bottom))]"
	>
		<div class="mx-auto mb-5 h-[5px] w-11 rounded-full bg-raised-2"></div>
		{@render children()}
	</div>
</dialog>

<style>
	dialog[open] .sheet {
		animation: sheet-up 0.28s cubic-bezier(0.2, 0.9, 0.3, 1.05);
	}
	@keyframes sheet-up {
		from {
			transform: translateY(100%);
		}
	}
</style>

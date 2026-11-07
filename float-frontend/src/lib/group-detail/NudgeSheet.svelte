<script lang="ts">
	import BottomSheet from '#lib/components/ui/BottomSheet.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import { formatUsdc } from '#lib/groups/format.ts';

	interface Props {
		open: boolean;
		groupName: string;
		peerName: string;
		/** Amount they owe you, minor units (positive). */
		amount: number;
		onclose: () => void;
	}

	let { open, groupName, peerName, amount, onclose }: Props = $props();

	const message = $derived(
		`Hey ${peerName}, quick reminder for ${groupName}: you owe ${formatUsdc(amount, { signed: false })}. Settle in one tap on Float.`
	);

	async function share() {
		try {
			if (navigator.share) {
				await navigator.share({ text: message });
			} else if (navigator.clipboard) {
				await navigator.clipboard.writeText(message);
			}
		} catch {
			/* cancelled */
		}
		onclose();
	}
</script>

<BottomSheet {open} label="Nudge ready" {onclose}>
	<p class="text-xs font-extrabold tracking-[0.08em] text-mute">NUDGE READY</p>
	<h2 class="mt-2 font-display text-[24px] font-semibold">Nudge ready</h2>
	<p class="mt-2 text-[14px] leading-snug font-semibold text-mute">
		We open your share sheet with a friendly reminder you can send in any chat. No notification
		is sent from Float.
	</p>

	<blockquote
		class="mt-5 rounded-[18px] bg-raised px-4 py-3 text-left text-[14px] leading-snug font-semibold text-ink"
	>
		{message}
	</blockquote>

	<div class="mt-5 flex flex-col gap-2.5">
		<Button onclick={() => void share()}>Open share sheet</Button>
		<Button variant="secondary" onclick={onclose}>Cancel</Button>
	</div>
</BottomSheet>
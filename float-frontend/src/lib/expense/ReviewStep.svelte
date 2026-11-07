<script lang="ts">
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import Paperclip from '@lucide/svelte/icons/paperclip';
	import Button from '#lib/components/ui/Button.svelte';
	import IconButton from '#lib/components/ui/IconButton.svelte';
	import NetworkBadge from '#lib/components/ui/NetworkBadge.svelte';
	import { formatUsdc } from '#lib/groups/format.ts';
	import {
		ExpenseFlow,
		CATEGORY_LABELS,
		NOTE_MAX,
		formatMajor
	} from './expense-flow.svelte.ts';

	interface Props {
		flow: ExpenseFlow;
	}

	let { flow }: Props = $props();

	function onFile(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0] ?? null;
		if (!file) {
			flow.setReceipt(null);
			return;
		}
		const ok = [
			'image/jpeg',
			'image/png',
			'image/webp',
			'application/pdf'
		].includes(file.type);
		if (!ok) {
			input.value = '';
			return;
		}
		flow.setReceipt(file);
	}
</script>

<main class="flex min-h-dvh flex-col pb-[max(1.25rem,env(safe-area-inset-bottom))]">
	<header
		class="flex items-center gap-3 px-5 pt-[max(20px,env(safe-area-inset-top))]"
	>
		<IconButton label="Back" onclick={() => flow.backToSplit()}>
			<ChevronLeft size={20} aria-hidden="true" />
		</IconButton>
		<h1 class="flex-1 font-display text-[22px] font-semibold">Review</h1>
		<NetworkBadge />
	</header>

	<section class="mx-5 mt-5 rounded-[24px] bg-surface p-4">
		<p class="font-display text-[20px] font-semibold">{flow.description}</p>
		<p class="mt-1 text-[13px] font-semibold text-mute">
			Paid by you · split {flow.participants.length} ways
			{flow.splitMode === 'equal' ? ' equally' : ' (custom)'}
		</p>
		<p class="mt-3 font-display text-[28px] font-semibold tabular-nums">
			${formatMajor(flow.amountMinor)}
		</p>
		{#if flow.category}
			<span
				class="mt-2 inline-block rounded-full bg-raised px-3 py-1 text-[12px] font-extrabold"
			>
				{CATEGORY_LABELS[flow.category]}
			</span>
		{/if}
		<p class="mt-3 text-[14px] font-extrabold text-mint">
			You will be owed {formatUsdc(flow.youAreOwed)}
		</p>
	</section>

	<div class="mt-5 px-5">
		<div class="mb-2 flex items-baseline justify-between">
			<label for="exp-note" class="text-sm font-extrabold">
				Note <span class="font-bold text-mute">(optional)</span>
			</label>
			<span
				class={['text-xs font-bold', flow.noteOver ? 'text-coral' : 'text-mute']}
			>
				{flow.noteCount} / {NOTE_MAX}
			</span>
		</div>
		<textarea
			id="exp-note"
			rows="3"
			maxlength={NOTE_MAX + 20}
			placeholder="Add a note for the group"
			value={flow.note}
			class="w-full resize-none rounded-[18px] bg-surface px-4 py-3 text-[15px] font-semibold text-ink outline-none placeholder:text-mute/50 focus-visible:shadow-[0_0_0_3px_rgb(34_211_197_/_0.35)]"
			oninput={(e) => (flow.note = (e.currentTarget as HTMLTextAreaElement).value)}
		></textarea>
	</div>

	<div class="mt-4 px-5">
		<label
			class="flex cursor-pointer items-center gap-3 rounded-[22px] bg-surface px-4 py-3.5"
		>
			<span class="grid size-10 place-items-center rounded-2xl bg-raised-2 text-mute">
				<Paperclip size={20} aria-hidden="true" />
			</span>
			<span class="min-w-0 flex-1 text-left">
				<span class="block text-[14px] font-extrabold">Add a receipt photo</span>
				<span class="block text-[12px] font-bold text-mute">
					{flow.receiptName ?? 'Optional · JPG, PNG, WebP or PDF'}
				</span>
			</span>
			<input
				type="file"
				accept="image/jpeg,image/png,image/webp,application/pdf"
				class="sr-only"
				onchange={onFile}
			/>
		</label>
	</div>

	<div class="flex-1"></div>

	<div class="px-5 pt-4">
		<Button
			disabled={!flow.canSubmit}
			loading={flow.busy}
			onclick={() => void flow.submit()}
		>
			Add expense
		</Button>
		<p class="mt-3 text-center text-xs font-semibold text-mute">
			Your wallet will ask you to approve. The expense is recorded first, then your note and
			receipt are saved.
		</p>
	</div>
</main>
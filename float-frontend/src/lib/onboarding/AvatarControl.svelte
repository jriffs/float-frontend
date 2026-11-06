<script lang="ts">
	import Camera from '@lucide/svelte/icons/camera';
	import UserRound from '@lucide/svelte/icons/user-round';

	interface Props {
		/** First letter shown when there is a name but no photo. */
		initial?: string;
		/** Object URL or remote URL of the selected/uploaded photo. */
		previewUrl?: string | null;
		/** Deterministic gradient when no photo (from wallet). */
		gradient?: string;
		disabled?: boolean;
		onchange: (file: File | null) => void;
	}

	let {
		initial = '',
		previewUrl = null,
		gradient = 'linear-gradient(135deg, #22d3c5, #3b82f6)',
		disabled = false,
		onchange
	}: Props = $props();

	let inputEl: HTMLInputElement | undefined = $state();

	function openPicker() {
		if (disabled) return;
		inputEl?.click();
	}

	function onFileChange(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0] ?? null;
		// Allow re-selecting the same file later.
		input.value = '';
		onchange(file);
	}
</script>

<div class="relative size-32">
	{#if previewUrl}
		<img
			src={previewUrl}
			alt=""
			class="size-32 rounded-full object-cover"
		/>
	{:else if initial}
		<div
			class="grid size-32 place-items-center rounded-full font-display text-[52px] font-semibold text-white"
			style:background={gradient}
			aria-hidden="true"
		>
			{initial}
		</div>
	{:else}
		<div
			class="grid size-32 place-items-center rounded-full text-white"
			style:background={gradient}
			aria-hidden="true"
		>
			<UserRound size={52} strokeWidth={2.2} />
		</div>
	{/if}

	<button
		type="button"
		aria-label="Add photo"
		class={[
			'absolute right-[-2px] bottom-0.5 grid size-11 place-items-center rounded-2xl',
			'bg-primary text-on-primary shadow-[0_3px_0_var(--color-primary-edge)]',
			'transition-[transform,box-shadow] duration-100',
			'enabled:active:translate-y-[3px] enabled:active:shadow-[0_1px_0_var(--color-primary-edge)]',
			'disabled:cursor-not-allowed disabled:opacity-60'
		]}
		{disabled}
		onclick={openPicker}
	>
		<Camera size={20} strokeWidth={2.2} aria-hidden="true" />
	</button>

	<input
		bind:this={inputEl}
		type="file"
		accept="image/jpeg,image/png,image/webp"
		class="sr-only"
		onchange={onFileChange}
	/>
</div>
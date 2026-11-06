<script lang="ts">
	import Button from '#lib/components/ui/Button.svelte';
	import NetworkBadge from '#lib/components/ui/NetworkBadge.svelte';
	import AvatarControl from './AvatarControl.svelte';

	interface Props {
		name: string;
		previewUrl: string | null;
		gradient: string;
		/** Inline field error (e.g. name too long). */
		nameError?: string | null;
		/** Banner error for photo or save failures. */
		banner?: { title: string; body: string } | null;
		saving?: boolean;
		onnamechange: (value: string) => void;
		onphoto: (file: File | null) => void;
		onsubmit: () => void;
		onclearbanner?: () => void;
		onskipphoto?: () => void;
		onretryphoto?: () => void;
	}

	let {
		name,
		previewUrl,
		gradient,
		nameError = null,
		banner = null,
		saving = false,
		onnamechange,
		onphoto,
		onsubmit,
		onclearbanner,
		onskipphoto,
		onretryphoto
	}: Props = $props();

	const MAX = 32;
	const trimmed = $derived(name.trim());
	const count = $derived(name.length);
	const overLimit = $derived(count > MAX);
	const canSubmit = $derived(trimmed.length >= 1 && !overLimit && !saving);
	const initial = $derived(trimmed ? trimmed[0]!.toUpperCase() : '');
	const previewName = $derived(trimmed || 'You');
</script>

<main class="flex min-h-dvh flex-col pb-[max(1.25rem,env(safe-area-inset-bottom))]">
	<header class="flex items-center justify-between px-6 pt-[max(22px,env(safe-area-inset-top))]">
		<span class="font-display text-[26px] font-bold tracking-tight text-primary">float</span>
		<NetworkBadge />
	</header>

	<div class="px-6 pt-[22px]">
		<h1 class="font-display text-[34px] leading-tight font-semibold tracking-[-0.01em]">
			Make it yours
		</h1>
		<p class="mt-1.5 text-[15px] font-semibold text-mute">
			Pick a name and a photo so friends know it is you.
		</p>
	</div>

	<div class="mt-[22px] flex flex-col items-center gap-2">
		<AvatarControl
			{initial}
			{previewUrl}
			{gradient}
			disabled={saving}
			onchange={onphoto}
		/>
		<p class="text-[13px] font-bold text-mute">Photo is optional</p>
	</div>

	{#if banner}
		<div
			class="mx-6 mt-4 rounded-2xl bg-raised px-4 py-3"
			role="alert"
		>
			<p class="text-sm font-extrabold text-coral">{banner.title}</p>
			<p class="mt-1 text-[13px] leading-snug font-semibold text-mute">{banner.body}</p>
			{#if onskipphoto || onretryphoto}
				<div class="mt-3 flex gap-2">
					{#if onretryphoto}
						<button
							type="button"
							class="text-[13px] font-extrabold text-primary"
							onclick={onretryphoto}
						>
							Choose another photo
						</button>
					{/if}
					{#if onskipphoto}
						<button
							type="button"
							class="text-[13px] font-extrabold text-mute"
							onclick={onskipphoto}
						>
							Skip for now
						</button>
					{/if}
				</div>
			{:else if onclearbanner}
				<button
					type="button"
					class="mt-2 text-[13px] font-extrabold text-primary"
					onclick={onclearbanner}
				>
					Dismiss
				</button>
			{/if}
		</div>
	{/if}

	<div class="px-6 pt-[18px]">
		<div class="mb-2 flex items-baseline justify-between">
			<label for="display-name" class="text-sm font-extrabold">
				What should your friends call you?
			</label>
			<span
				class={[
					'text-xs font-bold',
					overLimit ? 'text-coral' : 'text-mute'
				]}
			>
				{count} / {MAX}
			</span>
		</div>
		<input
			id="display-name"
			type="text"
			maxlength={MAX + 8}
			autocomplete="nickname"
			placeholder="Your name"
			value={name}
			disabled={saving}
			aria-invalid={overLimit || !!nameError}
			aria-describedby={overLimit || nameError ? 'name-hint' : undefined}
			class={[
				'h-14 w-full rounded-[18px] bg-surface px-[18px] text-[17px] font-bold text-ink',
				'placeholder:text-mute/60 outline-none',
				'transition-[box-shadow] duration-150',
				'focus-visible:shadow-[0_0_0_3px_rgb(34_211_197_/_0.4)]',
				overLimit || nameError
					? 'shadow-[0_0_0_3px_rgb(255_122_107_/_0.45)]'
					: ''
			]}
			oninput={(e) => onnamechange((e.currentTarget as HTMLInputElement).value)}
		/>
		{#if overLimit || nameError}
			<p id="name-hint" class="mt-2 text-[13px] font-bold text-coral" role="alert">
				{nameError ?? 'Names can be 32 characters at most'}
			</p>
		{/if}
	</div>

	<div class="mt-[22px] px-6">
		<p class="mb-2 text-[12px] font-extrabold tracking-[0.06em] text-mute">
			HOW FRIENDS WILL SEE YOU
		</p>
		<div class="flex items-center gap-3 rounded-3xl bg-surface px-3.5 py-3">
			{#if previewUrl}
				<img src={previewUrl} alt="" class="size-10 shrink-0 rounded-full object-cover" />
			{:else}
				<div
					class="grid size-10 shrink-0 place-items-center rounded-full font-display text-lg font-semibold text-white"
					style:background={gradient}
					aria-hidden="true"
				>
					{initial || '?'}
				</div>
			{/if}
			<div class="min-w-0 flex-1">
				<p class="truncate text-[15px] font-extrabold">
					{previewName} added Dinner
				</p>
				<p class="mt-0.5 text-xs font-semibold text-mute">Split 5 ways · just now</p>
			</div>
			<span class="font-display text-lg font-semibold tabular-nums">$84.00</span>
		</div>
	</div>

	<div class="flex-1"></div>

	<div class="px-6 pt-6">
		<Button disabled={!canSubmit} loading={saving} onclick={onsubmit}>Let's go</Button>
		<p class="mt-3 text-center text-xs font-semibold text-mute">
			{#if canSubmit || saving}
				Other Float users can see your name and photo
			{:else}
				Add a name to continue
			{/if}
		</p>
	</div>
</main>
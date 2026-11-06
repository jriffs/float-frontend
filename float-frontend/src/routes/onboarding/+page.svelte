<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { safeRedirect } from '#lib/connect/redirect.ts';
	import { getWalletContext } from '#lib/wallet/wallet.svelte.ts';
	import {
		createProfile,
		getProfile,
		uploadAvatar,
		fallbackAvatarGradient
	} from '#lib/supabase/profiles.ts';
	import ProfileForm from '#lib/onboarding/ProfileForm.svelte';
	import SuccessView from '#lib/onboarding/SuccessView.svelte';

	type Step = 'boot' | 'form' | 'success' | 'success-photo-pending';

	const wallet = getWalletContext();
	const redirectTo = safeRedirect(page.url.searchParams.get('redirectTo'));

	let step = $state<Step>('boot');
	let name = $state('');
	let file = $state<File | null>(null);
	let previewUrl = $state<string | null>(null);
	let saving = $state(false);
	/** True once createProfile has succeeded this session. */
	let profileCreated = $state(false);
	let banner = $state<{ title: string; body: string } | null>(null);
	/** Show "Choose another photo / Skip for now" actions on the banner. */
	let photoBannerActions = $state(false);

	const gradient = $derived(
		wallet.address
			? fallbackAvatarGradient(wallet.address)
			: 'linear-gradient(135deg, #22d3c5, #3b82f6)'
	);

	onMount(() => {
		void bootstrap();
		return () => {
			if (previewUrl) URL.revokeObjectURL(previewUrl);
		};
	});

	async function bootstrap() {
		const address = wallet.address;
		if (!address) {
			const q = redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : '';
			await goto(`${resolve('/')}${q}`, { replaceState: true });
			return;
		}

		try {
			const existing = await getProfile(address);
			if (existing) {
				await goto(redirectTo ?? resolve('groups'), { replaceState: true });
				return;
			}
		} catch {
			/* network blip — still allow first-time setup */
		}

		step = 'form';
	}

	function onNameChange(value: string) {
		name = value;
		// Clear non-photo banners as the user types.
		if (banner && !photoBannerActions) banner = null;
	}

	function onPhoto(next: File | null) {
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
			previewUrl = null;
		}
		file = null;
		banner = null;
		photoBannerActions = false;

		if (!next) return;

		const allowed = ['image/jpeg', 'image/png', 'image/webp'];
		if (!allowed.includes(next.type)) {
			banner = {
				title: 'Photo format not supported',
				body: 'Try a JPG, PNG or WebP image instead. Your name is kept.'
			};
			photoBannerActions = true;
			return;
		}

		if (next.size > 12 * 1024 * 1024) {
			banner = {
				title: 'Photo is too big',
				body: 'Even after shrinking, that file is too large. Try a smaller photo or crop it first.'
			};
			photoBannerActions = true;
			return;
		}

		file = next;
		previewUrl = URL.createObjectURL(next);
	}

	function clearPhoto() {
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		previewUrl = null;
		file = null;
		banner = null;
		photoBannerActions = false;
	}

	async function tryUploadPhoto(): Promise<boolean> {
		if (!file) return true;
		try {
			await uploadAvatar(file);
			return true;
		} catch {
			return false;
		}
	}

	async function submit() {
		const trimmed = name.trim();
		if (trimmed.length < 1 || trimmed.length > 32 || saving) return;

		saving = true;
		banner = null;
		photoBannerActions = false;

		if (!profileCreated) {
			try {
				await createProfile({ display_name: trimmed });
				profileCreated = true;
			} catch {
				saving = false;
				banner = {
					title: 'Could not save your profile',
					body: 'Check your connection and try again. Everything you typed is still here.'
				};
				return;
			}
		}

		// Name is committed. Photo is best-effort and must never block.
		const photoOk = await tryUploadPhoto();
		step = photoOk ? 'success' : 'success-photo-pending';
		saving = false;
	}

	async function goNext() {
		await goto(redirectTo ?? resolve('groups'), { replaceState: true });
	}

	function backToFormForPhoto() {
		step = 'form';
		banner = null;
		photoBannerActions = false;
		clearPhoto();
	}
</script>

{#if step === 'boot'}
	<main class="flex min-h-dvh items-center justify-center">
		<span class="text-sm font-bold text-mute">Loading…</span>
	</main>
{:else if step === 'form'}
	<ProfileForm
		{name}
		{previewUrl}
		{gradient}
		{banner}
		{saving}
		onnamechange={onNameChange}
		onphoto={onPhoto}
		onsubmit={() => void submit()}
		onclearbanner={() => {
			banner = null;
			photoBannerActions = false;
		}}
		onskipphoto={photoBannerActions ? clearPhoto : undefined}
		onretryphoto={photoBannerActions
			? () => {
					banner = null;
					photoBannerActions = false;
				}
			: undefined}
	/>
{:else}
	<SuccessView
		name={name.trim()}
		{previewUrl}
		{gradient}
		photoPending={step === 'success-photo-pending'}
		oncontinue={goNext}
		onretryphoto={step === 'success-photo-pending' ? backToFormForPhoto : undefined}
	/>
{/if}
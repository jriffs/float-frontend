<script lang="ts">
	import Users from '@lucide/svelte/icons/users';
	import UserRound from '@lucide/svelte/icons/user-round';
	import { resolve } from '$app/paths';

	interface Props {
		active: 'groups' | 'profile';
	}

	let { active }: Props = $props();
</script>

<nav
	class="flex h-[72px] shrink-0 rounded-t-[28px] bg-surface pb-[max(0px,env(safe-area-inset-bottom))]"
	aria-label="Main"
>
	<a
		href={resolve('/groups')}
		class={[
			'flex flex-1 flex-col items-center justify-center gap-1 text-xs font-extrabold',
			active === 'groups' ? 'text-primary' : 'text-mute'
		]}
		aria-current={active === 'groups' ? 'page' : undefined}
	>
		<Users size={22} strokeWidth={2.2} aria-hidden="true" />
		Groups
	</a>
	<a
		href={resolve('/profile')}
		class={[
			'flex flex-1 flex-col items-center justify-center gap-1 text-xs font-extrabold',
			active === 'profile' ? 'text-primary' : 'text-mute'
		]}
		aria-current={active === 'profile' ? 'page' : undefined}
	>
		<UserRound size={22} strokeWidth={2.2} aria-hidden="true" />
		Profile
	</a>
</nav>
<script lang="ts">
	/** Shimmer skeleton matching S3Loading. */
	const shim =
		'animate-shimmer bg-[linear-gradient(90deg,var(--color-raised-2)_25%,var(--color-raised)_50%,var(--color-raised-2)_75%)] bg-[length:200%_100%]';
</script>

<div class="flex flex-1 flex-col" aria-busy="true" aria-label="Loading groups">
	<div class="mx-5 mt-4 rounded-[28px] bg-raised p-[18px]">
		<div class={['h-3.5 w-28 rounded-lg', shim]}></div>
		<div class={['mt-3 h-11 w-40 rounded-xl', shim]}></div>
		<div class="mt-3 flex gap-2.5">
			<div class={['h-12 flex-1 rounded-[18px]', shim]}></div>
			<div class={['h-12 flex-1 rounded-[18px]', shim]}></div>
		</div>
	</div>

	<div class={['mx-5 mt-[18px] mb-2 h-4 w-[100px] rounded-lg', shim]}></div>

	<div class="flex flex-col gap-2 px-5">
		{#each [1, 2, 3] as _}
			<div class="flex items-center gap-3.5 rounded-[28px] bg-raised p-3.5">
				<div class={['size-[52px] shrink-0 rounded-[18px]', shim]}></div>
				<div class="flex flex-1 flex-col gap-2">
					<div class={['h-4 w-[130px] rounded-lg', shim]}></div>
					<div class={['h-3 w-[90px] rounded-lg', shim]}></div>
				</div>
				<div class={['h-[22px] w-[60px] rounded-lg', shim]}></div>
			</div>
		{/each}
	</div>
</div>
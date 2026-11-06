<script lang="ts">
	let { label = 'Devnet' }: { label?: string } = $props();
</script>

<span
	class="inline-flex h-7 items-center gap-1.5 rounded-full bg-raised px-3 text-xs font-extrabold text-ink"
>
	<span class="size-2 rounded-full bg-primary"></span>
	{label}
</span>

<script lang="ts">
	import { cn } from '$lib/utils';

	let { src, alt, fallbackSrc, class: className } = $props();

	let imgSrc = $state(src ?? fallbackSrc);

	$effect(() => {
		if (src) {
			imgSrc = src;
		} else {
			imgSrc = fallbackSrc;
		}
	});
</script>

<img
	src={imgSrc}
	{alt}
	class={cn('h-full w-full', className)}
	onerror={() => (imgSrc = fallbackSrc)}
/>

<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar';
	import { cn } from '$lib/utils';

	let {
		src,
		alt,
		fallbackText,
		border
	}: {
		src?: string;
		alt: string;
		fallbackText: string;
		border?: boolean;
	} = $props();
</script>

<Avatar.Root class={cn('h-full w-full', border && 'border-2 border-white')}>
	<Avatar.Image {src} {alt} class="object-cover" />
	<Avatar.Fallback>
		{fallbackText}
	</Avatar.Fallback>
</Avatar.Root>

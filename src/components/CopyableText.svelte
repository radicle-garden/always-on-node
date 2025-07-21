<script module lang="ts">
	import { toast } from 'svelte-sonner';

	export async function copyToClipboard(text: string) {
		await navigator.clipboard.writeText(text);
		toast.success('Copied to clipboard');
	}
</script>

<script lang="ts">
	import { debounce } from '$lib/utils';

	import Icon from './Icon.svelte';

	let container: HTMLDivElement;

	let { children, text } = $props();

	let icon = $state<'link' | 'checkmark'>('link');
	const restoreIcon = debounce(() => {
		icon = 'link';
	}, 800);

	async function handleClick() {
		copyToClipboard(text);
		icon = 'checkmark';
		restoreIcon();
	}
</script>

<div class="flex items-center gap-2 font-mono">
	<div
		role="button"
		class="copyable-container flex cursor-pointer items-center gap-2 rounded-xs bg-card p-1 text-muted-foreground select-text hover:bg-primary"
		onclick={() => handleClick()}
		tabindex="0"
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				handleClick();
			}
		}}
		bind:this={container}
	>
		{@render children()}
		<Icon name={icon} size="16" />
	</div>
</div>

<script lang="ts">
	import { toast } from 'svelte-sonner';

	import { debounce } from '$lib/utils';

	import Icon from './Icon.svelte';

	let icon = $state<'copy' | 'checkmark'>('copy');
	let container: HTMLDivElement;

	let { children, text } = $props();

	const restoreIcon = debounce(() => {
		icon = 'copy';
	}, 800);

	async function copyToClipboard(text: string) {
		await navigator.clipboard.writeText(text);
		icon = 'checkmark';
		toast.success('Copied to clipboard');
		restoreIcon();
	}
</script>

<div class="flex items-center gap-2">
	<div
		role="button"
		class="copyable-container flex cursor-pointer items-center gap-2 p-2 select-text"
		onclick={() => copyToClipboard(text)}
		tabindex="0"
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				copyToClipboard(text);
			}
		}}
		bind:this={container}
	>
		{@render children()}
		<Icon name={icon} size="16" />
	</div>
</div>

<style>
	.copyable-container {
		background-color: var(--muted);
		border-radius: 4px;
		padding: 4px;
		transition: background-color 0.2s ease-in-out;
	}
	.copyable-container:hover {
		background-color: var(--primary);
	}
	div {
		font-family: monospace;
	}
</style>

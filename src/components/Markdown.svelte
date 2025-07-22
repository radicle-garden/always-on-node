<script lang="ts">
	import emoji from 'remark-emoji';
	import Markdown, { type Plugin } from 'svelte-exmarkdown';
	import { gfmPlugin } from 'svelte-exmarkdown/gfm';

	let { md }: { md: string } = $props();

	let emojiPlugin = { remarkPlugin: [emoji, { emoticon: false }] } as Plugin;
	let plugins = [gfmPlugin(), emojiPlugin];
</script>

<div class="markdown">
	<Markdown {md} {plugins} />
</div>

<style lang="postcss">
	@reference '../app.css';
	.markdown {
		:global(h1) {
			@apply mb-4 text-2xl font-bold;
		}
		:global(h2) {
			@apply mb-3 text-xl font-bold;
		}
		:global(h3) {
			@apply mb-2 text-lg font-bold;
		}
		:global(p) {
			@apply mt-0 mb-4;
		}
		:global(pre),
		:global(code) {
			@apply rounded-xs bg-muted px-2 py-1 leading-6;
		}
		:global(pre) {
			@apply my-4 overflow-x-auto;
		}
		:global(ul),
		:global(ol) {
			@apply pb-4 pl-4;
		}
		:global(ul li) {
			@apply list-inside list-disc;
		}
		:global(ol li) {
			@apply list-inside list-decimal;
		}
		:global(blockquote) {
			@apply border-l-4 border-muted-foreground pl-2;
		}
		:global(table) {
			@apply w-full;
		}
		:global(table th) {
			@apply bg-muted p-2;
		}
		:global(table td) {
			@apply border border-border p-2;
		}
		:global(.footnotes ol li) {
			@apply list-none;
		}
		:global(.contains-task-list li) {
			@apply list-none;
		}
		:global(.contains-task-list .task-list-item) {
			@apply flex items-center gap-2;
		}
	}
</style>

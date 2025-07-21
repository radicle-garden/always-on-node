<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import type { Comment } from '$lib/http-client';
	import { timeAgo } from '$lib/utils';

	import Markdown from './Markdown.svelte';
	import Reactions from './Reactions.svelte';

	let { discussion }: { discussion: Comment[] } = $props();
</script>

<div class="flex flex-col">
	{#each discussion.slice(1) as comment, i}
		{#if i < discussion.length}
			<div class="!ml-8 h-4 w-0 border border-l"></div>
		{/if}
		<Card class="p-4">
			<div class="flex items-center gap-2">
				<div class="text-sm font-bold text-gray-500">
					{comment.author.alias}
				</div>
				<div class="text-sm text-gray-500">
					{timeAgo(new Date(comment.timestamp * 1000))} ago
				</div>
			</div>
			<Markdown md={comment.body} />
			<Reactions {comment} />
		</Card>
	{/each}
</div>

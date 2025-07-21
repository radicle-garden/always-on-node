<script lang="ts">
	import { goto } from '$app/navigation';

	import { Card } from '$lib/components/ui/card';
	import { truncateText } from '$lib/utils';

	import { copyToClipboard } from './CopyableText.svelte';

	let {
		name,
		description,
		repositoryId,
		namespace
	}: {
		name: string;
		description: string;
		repositoryId: string;
		namespace: string;
	} = $props();
</script>

<Card
	class="h-full"
	variant="navigable"
	onclick={() => {
		let url = `/${namespace.trim()}/${name.trim()}${repositoryId ? `?rid=${repositoryId}` : ''}`;
		goto(url);
	}}
>
	<div class="flex flex-col gap-2">
		<div class="flex w-full justify-between">
			<div class="max-w-80 truncate font-medium md:max-w-60 lg:max-w-80">
				{name}
			</div>
		</div>
		<div class="flex flex-col gap-0 text-sm">
			<div class="flex font-mono font-semibold text-radicle-blue">
				<button
					class="hover:underline"
					onclick={(e) => {
						e.stopPropagation();
						e.preventDefault();
						copyToClipboard(repositoryId);
					}}
				>
					{truncateText(repositoryId, 6)}
				</button>
			</div>
			<div class="line-clamp-3 text-muted-foreground">{description}</div>
		</div>
	</div>
</Card>

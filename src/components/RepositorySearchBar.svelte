<script lang="ts">
	import { get } from 'svelte/store';

	import type { RadicleRepositoryListItem } from '$types/app';

	import { api } from '$lib/api';
	import { Input } from '$lib/components/ui/input';
	import * as Popover from '$lib/components/ui/popover';
	import {
		findRepositoriesByFuzzyTerm,
		gardenNode,
		radicleRepositoryList
	} from '$lib/state';
	import { parseRepositoryId } from '$lib/utils';

	let { rid = $bindable() } = $props();

	let pinnedRepositories = $state<Record<string, string[]>>({});
	let hasLoaded = $state(false);
	let nid = $derived($gardenNode?.node_id);
	let searchResults = $derived<RadicleRepositoryListItem[]>(
		get(radicleRepositoryList).filter((repo) => {
			const repoName = repo.name.toLowerCase();
			const repoDescription = repo.desc?.toLowerCase() ?? '';
			return repoName.includes(rid) || repoDescription.includes(rid);
		})
	);
	let ridInput = $state<HTMLInputElement>();
	let isPopoverOpen = $state(false);

	async function loadRepositories(nid: string) {
		const pinnedResult = await api.getPinnedRepositories(nid);

		if (pinnedResult.success) {
			pinnedRepositories[nid] = pinnedResult.content;
		} else {
			console.warn('Failed to load pinned repositories:', pinnedResult.error);
			pinnedRepositories[nid] = [];
		}
	}

	$effect(() => {
		if (nid && !hasLoaded) {
			hasLoaded = true;
			loadRepositories($gardenNode!.node_id);
		}
	});

	$effect(() => {
		if (rid && rid.length > 0 && !parseRepositoryId(rid)) {
			searchResults = findRepositoriesByFuzzyTerm(rid);
			isPopoverOpen = true;
		} else if (rid && parseRepositoryId(rid)) {
			searchResults = [];
			isPopoverOpen = false;
		} else if (!rid) {
			searchResults = [];
			isPopoverOpen = false;
		}
	});
</script>

<div class="relative flex flex-col">
	<Popover.Root bind:open={isPopoverOpen}>
		<Popover.Trigger class="max-w-md" tabindex={-1}>
			<Input
				class="text-white"
				type="text"
				placeholder="RID or search term..."
				bind:value={rid}
				ref={ridInput}
			/>
		</Popover.Trigger>
		{#if searchResults.length > 0}
			<Popover.Content
				class="popover-content-width-full no-scrollbar flex flex-col gap-2 overflow-y-scroll"
				trapFocus={false}
				onOpenAutoFocus={(e) => {
					e.preventDefault();
					ridInput?.focus();
				}}
				onCloseAutoFocus={(e) => {
					e.preventDefault();
					ridInput?.focus();
				}}
			>
				{#each searchResults as result}
					<button
						class="flex w-full flex-row items-center rounded-sm px-1 hover:bg-muted"
						onclick={() => {
							rid = result.rid;
							isPopoverOpen = false;
						}}
					>
						<div class="flex max-w-[-webkit-fill-available] flex-col text-left">
							<span class="truncate font-bold">{result.name}</span>
							<span class="text-sm text-muted-foreground"
								>{result.desc || 'No description available'}</span
							>
						</div>
					</button>
				{/each}
			</Popover.Content>
		{/if}
	</Popover.Root>
</div>

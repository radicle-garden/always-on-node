<script lang="ts">
	import { Skeleton } from '$lib/components/ui/skeleton';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { findRespositoryByRid, user } from '$lib/state';

	import Icon from './Icon.svelte';
	import RepositoryCard from './RepositoryCard.svelte';

	const {
		pinnedRepositories,
		deletePinnedRepository,
		skeleton,
		showEditLink,
		showInfoTooltip
	}: {
		pinnedRepositories: Record<string, string[]>;
		deletePinnedRepository?: (nid: string, rid: string) => void;
		skeleton?: boolean;
		showEditLink?: boolean;
		showInfoTooltip?: boolean;
	} = $props();

	let numPinnedRepositories = $derived(
		Object.values(pinnedRepositories).reduce(
			(acc, repositories) => acc + repositories.length,
			0
		)
	);
</script>

<div class="flex flex-col gap-2">
	<div class="flex items-center gap-2">
		<h2 class="flex items-center gap-2 text-2xl font-bold">
			Pinned Repositories
			{#if showInfoTooltip}
				<Tooltip.Provider>
					<Tooltip.Root delayDuration={0}>
						<Tooltip.Trigger class="cursor-pointer">
							<Icon name="info" />
						</Tooltip.Trigger>
						<Tooltip.Content>
							Pinning a repository keeps its information on your <a
								href={`/${$user!.handle}`}>profile</a
							>.
						</Tooltip.Content>
					</Tooltip.Root>
				</Tooltip.Provider>
			{/if}
		</h2>
		{#if showEditLink}
			<a href="/garden" class="text-muted-foreground"><Icon name="pen" /></a>
		{/if}
	</div>
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		{#if numPinnedRepositories === 0}
			<div class="col-span-full">No pinned repositories.</div>
		{/if}
		{#each Object.entries(pinnedRepositories) as [nid, repositories]}
			{#each repositories as rid}
				<div class="col-span-1">
					<RepositoryCard
						name={findRespositoryByRid(rid)?.name ?? ''}
						description={findRespositoryByRid(rid)?.desc ?? ''}
						repositoryId={rid}
						nodeId={nid}
						onRemove={() => deletePinnedRepository?.(nid, rid)}
					/>
				</div>
			{/each}
		{/each}
		{#if skeleton}
			<div class="col-span-1">
				<Skeleton class="h-full w-full" />
			</div>
		{/if}
	</div>
</div>

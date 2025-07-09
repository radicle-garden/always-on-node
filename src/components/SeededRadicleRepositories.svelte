<script lang="ts">
	import type { Node, SeededRadicleRepository } from '$types/app';

	import { Skeleton } from '$lib/components/ui/skeleton';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { findRespositoryByRid } from '$lib/state';

	import Icon from './Icon.svelte';
	import RepositoryCard from './RepositoryCard.svelte';

	const {
		seededRepositories,
		deleteSeededRepository,
		gardenNode,
		skeleton,
		showInfoTooltip
	}: {
		seededRepositories: Record<string, SeededRadicleRepository[]>;
		deleteSeededRepository: (nid: string, rid: string) => void;
		gardenNode: Node;
		skeleton: boolean;
		showInfoTooltip?: boolean;
	} = $props();

	let numSeededRepositories = $derived(
		Object.values(seededRepositories).reduce(
			(acc, repositories) => acc + repositories.length,
			0
		)
	);
</script>

<div class="flex flex-col gap-2">
	<h2 class="flex items-center gap-2 text-2xl font-bold">
		Seeded Repositories
		{#if showInfoTooltip}
			<Tooltip.Provider>
				<Tooltip.Root delayDuration={0}>
					<Tooltip.Trigger class="cursor-pointer">
						<Icon name="info" />
					</Tooltip.Trigger>
					<Tooltip.Content>
						Seeding a repository increases its availability to other users of
						Radicle.
					</Tooltip.Content>
				</Tooltip.Root>
			</Tooltip.Provider>
		{/if}
	</h2>
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		{#if numSeededRepositories === 0}
			<div class="col-span-full">No seeded repositories.</div>
		{/if}
		{#each Object.entries(seededRepositories) as [nid, repositories]}
			{#each repositories as { id, repository_id, seeding, seeding_end, seeding_start }}
				<div class="col-span-1 overflow-hidden">
					<RepositoryCard
						name={findRespositoryByRid(repository_id)?.name ?? ''}
						description={findRespositoryByRid(repository_id)?.desc ?? ''}
						repositoryId={repository_id}
						nodeId={nid}
						nodeConnectAddress={gardenNode.connect_address}
						seedingStart={new Date(seeding_start)}
						onRemove={() => deleteSeededRepository(nid, repository_id)}
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

<script lang="ts">
	import type { Node } from '$types/app';

	import { findRespositoryByRid, user } from '$lib/state';

	import EditPinnedRepositoriesDialog from './EditPinnedRepositoriesDialog.svelte';
	import Icon from './Icon.svelte';
	import RepositoryCard from './RepositoryCard.svelte';

	const {
		pinnedRepositories,
		gardenNode,
		showEditDialog = false,
		refresh
	}: {
		pinnedRepositories: Record<string, string[]>;
		gardenNode: Node;
		showEditDialog?: boolean;
		refresh?: () => void;
	} = $props();

	let numPinnedRepositories = $derived(
		Object.values(pinnedRepositories).reduce(
			(acc, repositories) => acc + repositories.length,
			0
		)
	);

	let pinnedGardenNodeRepositories = $derived(
		pinnedRepositories[gardenNode.node_id]
	);
</script>

<div class="flex flex-col gap-2">
	<div class="flex items-center justify-between gap-2">
		<h2 class="flex items-center gap-2 text-2xl font-medium">
			<Icon name="pin" /> Pinned Repositories
		</h2>
		{#if showEditDialog}
			<EditPinnedRepositoriesDialog
				nodeId={gardenNode.node_id}
				originalPinned={pinnedGardenNodeRepositories ?? []}
				onSaved={() => refresh?.()}
			/>
		{/if}
	</div>
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
		{#if numPinnedRepositories === 0}
			<div class="col-span-full">No pinned repositories.</div>
		{/if}
		{#each Object.entries(pinnedRepositories) as [_, repositories]}
			{#each repositories as rid}
				<div class="col-span-1">
					<RepositoryCard
						repositoryId={rid}
						namespace={$user!.handle}
						name={findRespositoryByRid(rid)?.name ?? ''}
						description={findRespositoryByRid(rid)?.desc ?? ''}
					/>
				</div>
			{/each}
		{/each}
	</div>
</div>

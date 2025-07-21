<script lang="ts">
	import type { SeededRadicleRepository } from '$types/app';

	import { Card } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { findRespositoryByRid } from '$lib/state';

	import NewRepositoryDialog from './NewRepositoryDialog.svelte';
	import RepositoryCard from './RepositoryCard.svelte';

	let {
		namespace,
		repositories,
		showCreateDialog,
		onCreate
	}: {
		namespace: string;
		repositories: SeededRadicleRepository[];
		showCreateDialog: boolean;
		onCreate: (rid: string) => void;
	} = $props();

	let filter = $state('');

	let filteredRepositories = $derived(
		repositories.filter((repository) => {
			const repoName =
				findRespositoryByRid(repository.repository_id)?.name.toLowerCase() ??
				'';
			const repoDescription =
				findRespositoryByRid(repository.repository_id)?.desc.toLowerCase() ??
				'';
			return (
				repoName.includes(filter.toLowerCase()) ||
				repoDescription.includes(filter.toLowerCase())
			);
		})
	);
</script>

<Card variant="outline" class="p-4">
	<div class="flex flex-col gap-2">
		<div class="flex items-center justify-between">
			<div class="text-2xl font-medium">{namespace}'s repositories</div>
			{#if showCreateDialog}
				<div class="flex items-center gap-2">
					<NewRepositoryDialog onSave={onCreate} />
				</div>
			{/if}
		</div>
		<div class="flex max-w-md flex-col gap-2">
			<Input
				type="text"
				bind:value={filter}
				placeholder="filter repositories"
			/>
		</div>
		<div class="flex flex-col gap-2">
			{#if filteredRepositories.length === 0}
				<div class="text-sm text-muted-foreground">No repositories found</div>
			{/if}
			{#each filteredRepositories as { repository_id }}
				<RepositoryCard
					repositoryId={repository_id}
					{namespace}
					name={findRespositoryByRid(repository_id)?.name ?? ''}
					description={findRespositoryByRid(repository_id)?.desc ?? ''}
				/>
			{/each}
		</div>
	</div>
</Card>

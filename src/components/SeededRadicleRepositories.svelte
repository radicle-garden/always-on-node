<script lang="ts">
	import type { SeededRadicleRepository } from '$types/app';

	import { findRespositoryByRid, user } from '$lib/state';

	import RepositoryCard from './RepositoryCard.svelte';

	const {
		seededRepositories
	}: {
		seededRepositories: Record<string, SeededRadicleRepository[]>;
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
	</h2>
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		{#if numSeededRepositories === 0}
			<div class="col-span-full">No seeded repositories.</div>
		{/if}
		{#each Object.entries(seededRepositories) as [nid, repositories]}
			{#each repositories as { id, repository_id, seeding, seeding_end, seeding_start }}
				<div class="col-span-1 overflow-hidden">
					<RepositoryCard
						repositoryId={repository_id}
						namespace={$user!.handle}
						name={findRespositoryByRid(repository_id)?.name ?? ''}
						description={findRespositoryByRid(repository_id)?.desc ?? ''}
					/>
				</div>
			{/each}
		{/each}
	</div>
</div>

<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { get } from 'svelte/store';

	import type {
		RadicleRepositoryListItem,
		SeededRadicleRepository
	} from '$types/app';

	import { api } from '$lib/api';
	import { checkAuth } from '$lib/auth';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Popover from '$lib/components/ui/popover';
	import {
		findRepositoriesByFuzzyTerm,
		gardenNode,
		radicleRepositoryList
	} from '$lib/state';
	import { cn, parseRepositoryId } from '$lib/utils';

	import Icon from '$components/Icon.svelte';
	import PinnedRadicleRepositories from '$components/PinnedRadicleRepositories.svelte';
	import SeededRadicleRepositories from '$components/SeededRadicleRepositories.svelte';

	let seededRepositories = $state<Record<string, SeededRadicleRepository[]>>(
		{}
	);
	let pinnedRepositories = $state<Record<string, string[]>>({});
	let pinningRepository = $state(false);
	let seedingRepository = $state(false);
	let hasLoaded = $state(false);
	let rid = $state('');
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

	function refresh() {
		hasLoaded = false;
	}

	async function loadRepositories(nid: string) {
		const [seededResult, pinnedResult] = await Promise.allSettled([
			api.getSeededRepositories(nid),
			api.getPinnedRepositories(nid)
		]);

		if (seededResult.status === 'fulfilled') {
			seededRepositories[nid] = seededResult.value.content.filter(
				(repository: SeededRadicleRepository) => repository.seeding
			);
		} else {
			console.warn('Failed to load seeded repositories:', seededResult.reason);
			seededRepositories[nid] = [];
		}

		if (pinnedResult.status === 'fulfilled') {
			pinnedRepositories[nid] = pinnedResult.value.content;
		} else {
			console.warn('Failed to load pinned repositories:', pinnedResult.reason);
			pinnedRepositories[nid] = [];
		}
	}

	async function seedRepository(nid: string, rid: string) {
		seedingRepository = true;
		toast.promise(api.addSeededRepository(nid, rid), {
			loading: 'Seeding repository...',
			success: () => {
				rid = '';
				refresh();
				return 'Repository seeded';
			},
			error: 'Failed to seed repository',
			finally: () => {
				seedingRepository = false;
			}
		});
	}
	async function deleteSeededRepository(nid: string, rid: string) {
		await api.deleteSeededRepository(nid, rid);
		refresh();
	}

	async function pinRepository(nid: string, rid: string) {
		pinningRepository = true;
		toast.promise(api.addPinnedRepository(nid, rid), {
			loading: 'Pinning repository...',
			success: () => {
				rid = '';
				refresh();
				return 'Repository pinned';
			},
			error: 'Failed to pin repository',
			finally: () => {
				pinningRepository = false;
			}
		});
	}
	async function deletePinnedRepository(nid: string, rid: string) {
		await api.deletePinnedRepository(nid, rid);
		refresh();
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

	onMount(async () => {
		await checkAuth();
	});
</script>

<div class="flex w-full flex-col gap-4 pt-4">
	<div>
		Add a project to your Radicle.Garden using its RID or search for a project.
		View the full list of public projects <a
			href="https://search.radicle.xyz/repolist.txt"
			target="_blank">here</a
		>.
	</div>
	<div class="relative flex flex-col">
		<Popover.Root bind:open={isPopoverOpen}>
			<Popover.Trigger class="max-w-md" tabindex={-1}>
				<Input
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
							class="hover:bg-muted flex w-full flex-row items-center rounded-sm px-1"
							onclick={() => {
								rid = result.rid;
								isPopoverOpen = false;
							}}
						>
							<div
								class="flex flex-col text-left max-w-[-webkit-fill-available]"
							>
								<span class="font-bold truncate">{result.name}</span>
								<span class="text-muted-foreground text-sm"
									>{result.desc || 'No description available'}</span
								>
							</div>
						</button>
					{/each}
				</Popover.Content>
			{/if}
		</Popover.Root>
	</div>
	<div class="flex flex-row gap-2">
		<Button
			disabled={seedingRepository || !parseRepositoryId(rid)}
			class={cn('min-w-24', !parseRepositoryId(rid) && 'cursor-not-allowed')}
			onclick={async () => {
				if (!nid || !rid) return;
				seedRepository(nid, rid);
			}}><Icon name="seedling" />Seed</Button
		>
		<Button
			disabled={pinningRepository || !parseRepositoryId(rid)}
			class={cn('min-w-24', !parseRepositoryId(rid) && 'cursor-not-allowed')}
			onclick={async () => {
				if (!nid || !rid) return;
				pinRepository(nid, rid);
			}}><Icon name="pin" />Pin</Button
		>
	</div>

	<SeededRadicleRepositories
		{seededRepositories}
		{deleteSeededRepository}
		gardenNode={$gardenNode!}
		skeleton={seedingRepository}
		showInfoTooltip={true}
	/>

	<PinnedRadicleRepositories
		{pinnedRepositories}
		{deletePinnedRepository}
		gardenNode={$gardenNode!}
		skeleton={pinningRepository}
		showInfoTooltip={true}
	/>
</div>

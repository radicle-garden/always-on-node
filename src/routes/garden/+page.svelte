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
		nodes,
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
	let nid = $derived($nodes?.[0]?.node_id);
	let searchResults = $derived<RadicleRepositoryListItem[]>(
		get(radicleRepositoryList).filter((repo) => {
			const repoName = repo.name.toLowerCase();
			const repoDescription = repo.desc?.toLowerCase() ?? '';
			return repoName.includes(rid) || repoDescription.includes(rid);
		})
	);
	let ridInput = $state<HTMLInputElement>();
	let isPopoverOpen = $state(false);

	const refresh = () => {
		hasLoaded = false;
	};

	const getSeededRepositories = async (nid: string) =>
		api.getSeededRepositories(nid);
	const addSeededRepository = async (nid: string, rid: string) =>
		api.addSeededRepository(nid, rid);
	const deleteSeededRepository = async (nid: string, rid: string) => {
		await api.deleteSeededRepository(nid, rid);
		refresh();
	};

	const getPinnedRepositories = async (nid: string) =>
		api.getPinnedRepositories(nid);
	const addPinnedRepository = async (nid: string, rid: string) =>
		api.addPinnedRepository(nid, rid);
	const deletePinnedRepository = async (nid: string, rid: string) => {
		await api.deletePinnedRepository(nid, rid);
		refresh();
	};

	$effect(() => {
		if (nid && !hasLoaded) {
			hasLoaded = true;
			Promise.all([
				getSeededRepositories(nid),
				getPinnedRepositories(nid)
			]).then(([seeded, pinned]) => {
				if (seeded.success) {
					seededRepositories[nid] = seeded.content.filter(
						(repository) => repository.seeding
					);
				}
				if (pinned.success) {
					pinnedRepositories[nid] = pinned.content;
				}
			});
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
				try {
					seedingRepository = true;
					await addSeededRepository(nid, rid);
					rid = '';
					toast.success('Repository seeded');
					refresh();
				} catch (error) {
					toast.error('Failed to seed repository');
				} finally {
					seedingRepository = false;
				}
			}}><Icon name="seedling" />Seed</Button
		>
		<Button
			disabled={pinningRepository || !parseRepositoryId(rid)}
			class={cn('min-w-24', !parseRepositoryId(rid) && 'cursor-not-allowed')}
			onclick={async () => {
				if (!nid || !rid) return;
				try {
					pinningRepository = true;
					await addPinnedRepository(nid, rid);
					rid = '';
					toast.success('Repository pinned');
					refresh();
				} catch (error) {
					toast.error('Failed to pin repository');
				} finally {
					pinningRepository = false;
				}
			}}><Icon name="pin" />Pin</Button
		>
	</div>

	<SeededRadicleRepositories
		{seededRepositories}
		{deleteSeededRepository}
		skeleton={seedingRepository}
		showInfoTooltip={true}
	/>

	<PinnedRadicleRepositories
		{pinnedRepositories}
		{deletePinnedRepository}
		skeleton={pinningRepository}
		showInfoTooltip={true}
	/>
</div>

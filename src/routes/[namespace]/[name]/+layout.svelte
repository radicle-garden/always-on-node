<script lang="ts">
	import { page } from '$app/state';
	import { onMount, setContext } from 'svelte';
	import { toast } from 'svelte-sonner';

	import { api } from '$lib/api';
	import { refreshUser } from '$lib/auth';
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import type { Repo } from '$lib/http-client/lib/repo';
	import { httpdApi } from '$lib/httpdApi';
	import {
		gardenNode,
		radicleRepositoryList,
		user,
		mySeededRepositories
	} from '$lib/state';
	import { cn, truncateText } from '$lib/utils';

	import CopyableText from '$components/CopyableText.svelte';
	import Icon from '$components/Icon.svelte';

	let { children } = $props();

	const { namespace, name } = page.params;
	const ridParam = page.url.searchParams.get('rid');
	let rid = $state<string | undefined>(ridParam ?? undefined);
	let repository: Promise<Repo> = $state(new Promise(() => {}));

	function loadRepository(rid: string) {
		repository = httpdApi.getByRid(rid);
		setContext('repo', { repository });
	}

	onMount(() => {
		if (!rid) {
			rid = $radicleRepositoryList.find(
				(repo) => repo.name.trim() === name.trim()
			)?.rid;
		}
		if (rid) {
			loadRepository(rid);
		} else {
			repository = Promise.reject(new Error('Repository not found'));
		}
	});

	let pathname = $derived(page.url.pathname);

	function isActive(tab: 'readme' | 'issues' | 'patches' | 'settings') {
		if (tab === 'readme' && pathname === `/${namespace}/${name}`) return true;
		return pathname.includes(`/${tab}`);
	}
</script>

{#await repository}
	<div>Loading...</div>
{:then repo}
	<div class="grid w-full grid-cols-12 gap-4 pt-8">
		<div class="col-span-2 flex flex-col gap-4">
			<div>
				<div class="max-w-fit text-2xl font-bold break-all">
					{repo.payloads['xyz.radicle.project'].data.name}
				</div>
				<div class="text-sm text-muted-foreground">{repo.seeding} seeders</div>
			</div>
			<div class="flex flex-col gap-2">
				<CopyableText text={`rad clone ${repo.rid}`}>
					rad clone {truncateText(repo.rid, 6)}
				</CopyableText>
				<div>
					{#await $mySeededRepositories}
						<Button>
							<Icon name="seedling" />
							Checking...
						</Button>
					{:then seededRepositories}
						{#if seededRepositories.content.find((sr) => sr.repository_id === repo.rid)}
							<Button
								variant="success"
								onclick={() => {
									toast.promise(
										api.deleteSeededRepository($gardenNode!.node_id, repo.rid),
										{
											loading: 'Unseeding repository...',
											success: () => {
												refreshUser();
												return 'Repository unseeded';
											},
											error: 'Failed to unseed repository'
										}
									);
								}}
							>
								<Icon name="seedling-filled" />
								Seeding
							</Button>
						{:else}
							<Button
								onclick={() => {
									console.log({ user: $user });
									toast.promise(
										api.addSeededRepository($gardenNode!.node_id, repo.rid),
										{
											loading: 'Seeding repository...',
											success: () => {
												refreshUser();
												return 'Repository seeded';
											},
											error: 'Failed to seed repository'
										}
									);
								}}
							>
								<Icon name="seedling" />
								Seed
							</Button>
						{/if}
					{/await}
				</div>
			</div>
			<div class="flex flex-col gap-2">
				<Button
					href={`/${namespace}/${name}?rid=${repo.rid}`}
					class={cn('py-6 !text-white', isActive('readme') && 'bg-tab-active')}
				>
					<div class="flex w-full items-center justify-between">
						<div class="flex items-center gap-2">
							<Icon name="markdown" /> Readme
						</div>
					</div>
				</Button>
				<Button
					href={`/${namespace}/${name}/issues?rid=${repo.rid}`}
					class={cn('py-6 !text-white', isActive('issues') && 'bg-tab-active')}
				>
					<div class="flex w-full items-center justify-between">
						<div class="flex items-center gap-2">
							<Icon name="issue" /> Issues
						</div>
						<div>{repo.payloads['xyz.radicle.project'].meta.issues.open}</div>
					</div>
				</Button>
				<Button
					href={`/${namespace}/${name}/patches?rid=${repo.rid}`}
					class={cn('py-6 !text-white', isActive('patches') && 'bg-tab-active')}
				>
					<div class="flex w-full items-center justify-between">
						<div class="flex items-center gap-2">
							<Icon name="patch" /> Patches
						</div>
						<div>{repo.payloads['xyz.radicle.project'].meta.patches.open}</div>
					</div>
				</Button>
			</div>
			<Button
				href={`/${namespace}/${name}/settings?rid=${repo.rid}`}
				class={cn('py-6 !text-white', isActive('settings') && 'bg-tab-active')}
			>
				<div class="flex w-full items-center justify-between">
					<div class="flex items-center gap-2">
						<Icon name="settings" /> Settings
					</div>
				</div>
			</Button>
		</div>
		<div class="col-span-8">
			{@render children()}
		</div>
		<div class="col-span-2">
			<Card variant="outline">
				<div class="flex flex-col gap-2 p-2">
					<div class="text-2xl font-bold">Contributors</div>
					<div class="flex flex-col gap-2">
						{#each repo.delegates as delegate}
							<div class="flex flex-row gap-2">
								<div>
									{delegate.alias}
								</div>
							</div>
						{/each}
					</div>
				</div></Card
			>
		</div>
	</div>
{:catch err}
	<div class="grid w-full grid-cols-12 gap-4 pt-8">
		<div class="col-span-12 flex min-h-[50vh] items-center justify-center">
			<Card class="max-w-md">
				<div class="p-6 text-center">
					<div class="flex items-center justify-center">
						<Icon name="eye-closed" size="32" />
					</div>
					<p class="mb-4 text-lg font-semibold">
						We can't find any data for this repository
					</p>
					<Button onclick={() => history.back()} variant="outline"
						>Go back</Button
					>
				</div>
			</Card>
		</div>
	</div>
{/await}

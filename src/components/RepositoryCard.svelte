<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	import type { WeeklyActivity } from '$types/app';

	import { groupCommitsByWeek } from '$lib/commit';
	import { Card } from '$lib/components/ui/card';
	import type { Repo } from '$lib/http-client';
	import { httpdApi } from '$lib/httpdApi';
	import { timeAgo, truncateText } from '$lib/utils';

	import ActivityDiagram from './ActivityDiagram.svelte';
	import { copyToClipboard } from './CopyableText.svelte';
	import Icon from './Icon.svelte';

	let {
		name = 'unknown',
		description,
		repositoryId,
		namespace = 'unknown',
		showActivity = false
	}: {
		name: string;
		description: string;
		repositoryId: string;
		namespace: string;
		showActivity?: boolean;
	} = $props();

	let repository: Promise<Repo> = $state(new Promise(() => {}));
	let activity: WeeklyActivity[] = $state([]);

	onMount(() => {
		repository = httpdApi.getByRid(repositoryId);
		if (showActivity) {
			httpdApi.getActivity(repositoryId).then((response) => {
				activity = groupCommitsByWeek(response.activity);
			});
		}
		repository.then((repo) => {
			name = repo.payloads['xyz.radicle.project'].data.name;
			description = repo.payloads['xyz.radicle.project'].data.description;
		});
	});
</script>

<Card
	class="h-full"
	variant="navigable"
	onclick={() => {
		let url = `/${namespace.trim() || 'unknown'}/${name.trim() || 'unknown'}${repositoryId ? `?rid=${repositoryId}` : ''}`;
		goto(url);
	}}
>
	<div class="flex h-full flex-col justify-between gap-6">
		<div class="flex flex-col gap-2">
			<div class="flex w-full justify-between">
				<div class="max-w-80 truncate font-medium md:max-w-60 lg:max-w-80">
					{name || 'Untitled'}
				</div>
				{#await repository}
					<div></div>
				{:then repo}
					<div class="flex items-center gap-2">
						<Icon name="seedling-filled" />
						{repo.seeding}
					</div>
				{/await}
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
				<div class="line-clamp-3 text-muted-foreground">
					{description || 'No description'}
				</div>
			</div>
		</div>
		<div class="flex flex-col gap-2">
			{#if showActivity && activity.length > 0}
				<ActivityDiagram
					id={repositoryId}
					{activity}
					viewBoxHeight={20}
					styleColor="var(--radicle-blue)"
				/>
			{/if}
			<div class="flex items-center justify-between">
				{#await repository}
					<div>.</div>
				{:then repo}
					<div
						class="flex items-center gap-2 text-sm font-light text-muted-foreground"
					>
						<div class="flex items-center gap-1">
							<Icon name="issue" />
							{repo.payloads['xyz.radicle.project'].meta.issues.open}
						</div>
						<div class="flex items-center gap-1">
							<Icon name="patch" />
							{repo.payloads['xyz.radicle.project'].meta.patches.open}
						</div>
					</div>

					{#await httpdApi.getCommitBySha(repositoryId, repo.payloads['xyz.radicle.project'].meta.head)}
						<div>.</div>
					{:then { commit }}
						<div class="text-sm font-light text-muted-foreground">
							Updated {timeAgo(new Date(commit.committer.time * 1000), true)} ago
						</div>
					{/await}
				{/await}
			</div>
		</div>
	</div>
</Card>

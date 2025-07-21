<script lang="ts">
	import { page } from '$app/state';
	import { getContext, onMount } from 'svelte';

	import { Badge } from '$lib/components/ui/badge';
	import { Card } from '$lib/components/ui/card';
	import type { Issue, Repo } from '$lib/http-client';
	import { httpdApi } from '$lib/httpdApi';
	import { timeAgo } from '$lib/utils';

	import Breadcrumbs from '$components/Breadcrumbs.svelte';
	import DiscussionThread from '$components/DiscussionThread.svelte';
	import Icon from '$components/Icon.svelte';
	import Markdown from '$components/Markdown.svelte';
	import Reactions from '$components/Reactions.svelte';

	const { repository } = getContext<{ repository: Promise<Repo> }>('repo');
	let issue = $state<Issue | null>(null);
	let repoState = $state<Repo | null>(null);

	onMount(async () => {
		repoState = await repository;
		issue = await httpdApi.getIssueById(repoState.rid, page.params.issueId);
	});
</script>

{#if repoState && issue}
	<div class="flex flex-col gap-4">
		<Breadcrumbs
			items={[
				{
					label: repoState.payloads['xyz.radicle.project'].data.name,
					href: `/${page.params.namespace}/${page.params.name}?rid=${repoState.rid}`
				},
				{
					label: 'Issues',
					href: `/${page.params.namespace}/${page.params.name}/issues?rid=${repoState.rid}`
				},
				{ label: issue.title }
			]}
		/>
		<div class="flex flex-col">
			<Card class="p-4">
				<div class="flex flex-col gap-2">
					<div class="flex items-center gap-2">
						<div class="text-xl font-semibold">{issue.title}</div>
					</div>
					<div class="flex items-center gap-2">
						{#if issue.state.status === 'open'}
							<Badge variant="success"><Icon name="issue" /> Open</Badge>
						{:else if issue.state.status === 'closed'}
							{#if issue.state.reason === 'solved'}
								<Badge variant="merged"
									><Icon name="issue-closed" /> Closed - {issue.state
										.reason}</Badge
								>
							{:else}
								<Badge variant="destructive"
									><Icon name="issue-closed" /> Closed - {issue.state
										.reason}</Badge
								>
							{/if}
						{/if}
						<div class="text-sm text-gray-500">
							<span class="font-bold">{issue.discussion[0].author.alias}</span>
							opened {timeAgo(new Date(issue.discussion[0].timestamp * 1000))} ago
						</div>
					</div>
					<Markdown md={issue.discussion[0].body} />
					<Reactions comment={issue.discussion[0]} />
				</div>
			</Card>
			<DiscussionThread discussion={issue.discussion} />
		</div>
	</div>
{/if}

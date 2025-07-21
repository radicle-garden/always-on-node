<script lang="ts">
	import { page } from '$app/state';
	import { getContext } from 'svelte';
	// Replace with proper type
	import { onMount } from 'svelte';

	import { Badge } from '$lib/components/ui/badge';
	import { Card } from '$lib/components/ui/card';
	import type {
		Patch,
		DiffResponse,
		Comment,
		Revision,
		HunkLine,
		Commit
	} from '$lib/http-client';
	import type { Repo } from '$lib/http-client/lib/repo';
	import { httpdApi } from '$lib/httpdApi';
	import { timeAgo } from '$lib/utils';

	import Breadcrumbs from '$components/Breadcrumbs.svelte';
	import DiscussionThread from '$components/DiscussionThread.svelte';
	import Icon from '$components/Icon.svelte';
	import Markdown from '$components/Markdown.svelte';
	import Reactions from '$components/Reactions.svelte';

	const { repository } = getContext<{ repository: Promise<Repo> }>('repo');
	const { patchId } = page.params;

	let rid: string | undefined;

	repository.then((repo) => {
		rid = repo.rid;
	});

	// TODO: Fetch specific patch
	// let patch = $state(await httpdApi.getPatchById(rid, patchId));

	// Add fetching for patch
	let patch = $state<Patch | null>(null);
	let diff = $state<DiffResponse | null>(null);
	let revisionDiffs = $state<Map<string, DiffResponse>>(new Map());
	let commitDetails = $state<Map<string, Map<string, Commit>>>(new Map());
	let repo = $state<Repo | null>(null);

	let latestRevision = $state<Revision | null>(null);
	let allComments = $state<Comment[]>([]);
	let inlineComments = $state<Map<string, Map<number, Comment[]>>>(new Map());
	let generalComments = $state<Comment[]>([]);

	let currentTab = $state<'activity' | 'changes'>('activity');
	let expandedRevisions = $state<Set<string>>(new Set());

	$effect(() => {
		const map = new Map<string, Map<number, Comment[]>>();
		for (const comment of allComments) {
			const loc = comment.location;
			if (!loc || !loc.new || loc.new.type !== 'lines') continue;
			const path = loc.path;
			const line = loc.new.range.start;
			if (!map.has(path)) map.set(path, new Map());
			const lineMap = map.get(path)!;
			if (!lineMap.has(line)) lineMap.set(line, []);
			lineMap.get(line)!.push(comment);
		}
		inlineComments = map;
	});

	$effect(() => {
		generalComments = allComments.filter((c) => !c.location);
	});

	function getOldLineDisplay(line: HunkLine): string {
		if (line.type === 'addition') return '';
		return `${('lineNoOld' in line ? line.lineNoOld : line.lineNo) ?? ''}`;
	}

	function getNewLineDisplay(line: HunkLine): string {
		if (line.type === 'deletion') return '';
		return `${('lineNoNew' in line ? line.lineNoNew : line.lineNo) ?? ''}`;
	}

	function getNewLineNo(line: HunkLine): number | undefined {
		if (line.type === 'deletion') return undefined;
		return 'lineNoNew' in line ? line.lineNoNew : line.lineNo;
	}

	onMount(async () => {
		repo = await repository;
		patch = await httpdApi.getPatchById(repo.rid, page.params.patchId);
		latestRevision = patch
			? (patch.revisions[patch.revisions.length - 1] ?? null)
			: null;
		if (!latestRevision) {
			allComments = [];
			return;
		}
		let cms: Comment[] = [...latestRevision.discussions];
		for (const rev of latestRevision.reviews) {
			cms.push(...rev.comments);
		}
		allComments = cms;
		if (patch && repo) {
			for (const rev of patch.revisions) {
				const d = await httpdApi.getDiff(repo.rid, rev.base, rev.oid);
				revisionDiffs.set(rev.id, d);
				const commitMap = new Map<string, Commit>();
				for (const ch of d.commits) {
					const fullCommit = await httpdApi.getCommitBySha(repo.rid, ch.id);
					commitMap.set(ch.id, fullCommit);
				}
				commitDetails.set(rev.id, commitMap);
			}
			diff = revisionDiffs.get(latestRevision.id) ?? null;
		}
	});

	$inspect({ patch });
	$inspect({ latestRevision });
	$inspect({ diff });
</script>

{#if repo && patch && latestRevision}
	<div class="flex flex-col gap-4">
		<Breadcrumbs
			items={[
				{
					label: repo.payloads['xyz.radicle.project'].data.name,
					href: `/${page.params.namespace}/${page.params.name}?rid=${repo.rid}`
				},
				{
					label: 'Patches',
					href: `/${page.params.namespace}/${page.params.name}/patches?rid=${repo.rid}`
				},
				{ label: patch.title }
			]}
		/>
		<Card>
			<div class="flex flex-col gap-2">
				<div class="text-2xl font-bold">{patch.title}</div>
				<div class="flex items-center gap-2">
					{#if patch.state.status === 'open'}
						<Badge variant="success"><Icon name="patch" /> Open</Badge>
					{:else if patch.state.status === 'archived'}
						<Badge variant="outline"
							><Icon name="patch-archived" /> Archived</Badge
						>
					{:else if patch.state.status === 'merged'}
						<Badge variant="merged"><Icon name="patch-merged" /> Merged</Badge>
					{/if}
					<div class="text-sm text-gray-500">
						<span class="font-bold"
							>{patch.revisions[0]?.author.alias ??
								patch.revisions[0]?.author.id}</span
						>
						opened {timeAgo(new Date(patch.revisions[0]?.timestamp * 1000))} ago
					</div>
				</div>
			</div>
			<Markdown md={patch.revisions[0]?.description ?? ''} />
			<Reactions comment={patch.revisions[0]?.discussions[0]} />
		</Card>
	</div>
	<div class="tabs">
		<button
			class={currentTab === 'activity' ? 'active' : ''}
			onclick={() => (currentTab = 'activity')}>Activity</button
		>
		<button
			class={currentTab === 'changes' ? 'active' : ''}
			onclick={() => (currentTab = 'changes')}>Changes</button
		>
	</div>
	{#if currentTab === 'activity'}
		<div class="flex flex-col">
			{#each patch.revisions as rev, index}
				<Card>
					<div class="flex flex-col gap-2">
						<div class="flex items-center gap-2 text-muted-foreground">
							<div class="font-bold">{rev.author.alias ?? rev.author.id}</div>
							<div class="text-sm">
								{timeAgo(new Date(rev.timestamp * 1000))} ago
							</div>
						</div>
						<div>
							<span class="font-mono">{rev.id}</span>
						</div>
						{#if index > 0}
							<Markdown md={rev.description} />
						{/if}
						<div>
							<button
								onclick={() => {
									if (expandedRevisions.has(rev.id)) {
										expandedRevisions.delete(rev.id);
									} else {
										expandedRevisions.add(rev.id);
									}
									expandedRevisions = new Set(expandedRevisions);
								}}
								>{expandedRevisions.has(rev.id) ? 'Hide' : 'Show'} Commits</button
							>
						</div>
						{#if expandedRevisions.has(rev.id)}
							{#each revisionDiffs.get(rev.id)?.commits ?? [] as commit}
								<div class="flex gap-2">
									{commit.id.slice(0, 7)}: {commit.summary} by {commit.author
										.name}
									{timeAgo(new Date(commit.committer.time * 1000))} ago (+{commitDetails
										.get(rev.id)
										?.get(commit.id)?.diff.stats.insertions ?? 0} -{commitDetails
										.get(rev.id)
										?.get(commit.id)?.diff.stats.deletions ?? 0})
								</div>
							{/each}
						{/if}
					</div>
				</Card>
				<DiscussionThread discussion={rev.discussions} />
			{/each}
		</div>

		{#each patch.merges as merge}
			<div>
				<div>
					{merge.author.alias ?? merge.author.id} merged {timeAgo(
						new Date(merge.timestamp * 1000)
					)} ago
				</div>
			</div>
		{/each}
	{:else if currentTab === 'changes'}
		<h2>Changes</h2>
		{#if diff}
			{#each diff.diff.files as file}
				{@const status = file.status}
				{@const displayPath =
					'path' in file
						? file.path
						: `${file.oldPath ?? ''} -> ${file.newPath ?? ''}`}
				{@const commentPath =
					'path' in file ? file.path : (file.newPath ?? file.oldPath ?? '')}
				<div>
					<h3>{status} {displayPath}</h3>
					{#if 'diff' in file && file.diff.type === 'plain'}
						<div class="flex flex-col gap-4">
							{#each file.diff.hunks as hunk}
								<div>
									<pre>{hunk.header}</pre>
									<table>
										<tbody>
											{#each hunk.lines as line}
												<tr class={line.type}>
													<td>{getOldLineDisplay(line)}</td>
													<td>{getNewLineDisplay(line)}</td>
													<td
														>{line.type === 'addition'
															? '+'
															: line.type === 'deletion'
																? '-'
																: ' '}</td
													>
													<td><pre>{line.line ?? ''}</pre></td>
												</tr>
												{@const newLineNo = getNewLineNo(line)}
												{@const lineComments =
													newLineNo !== undefined
														? (inlineComments
																.get(commentPath)
																?.get(newLineNo) ?? [])
														: []}
												{#each lineComments as comment}
													<tr>
														<td colspan="4">
															<div>
																{comment.author.alias ?? comment.author.id}
															</div>
															<Markdown md={comment.body} />
														</td>
													</tr>
												{/each}
											{/each}
										</tbody>
									</table>
								</div>
							{/each}
						</div>
					{:else if 'diff' in file && file.diff.type === 'binary'}
						<p>Binary file changed.</p>
					{:else if 'diff' in file}
						<p>Empty file.</p>
					{:else}
						<p>File {status} without content changes.</p>
					{/if}
				</div>
			{/each}
		{:else}
			<div>Loading diff...</div>
		{/if}
	{/if}
{:else}
	<div>Loading...</div>
{/if}

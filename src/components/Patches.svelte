<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import type { Issue, Patch } from '$lib/http-client';
	import type { Repo } from '$lib/http-client/lib/repo';
	import { httpdApi } from '$lib/httpdApi';
	import { cn, timeAgo } from '$lib/utils';

	import Icon from './Icon.svelte';

	let { repo }: { repo: Repo } = $props();

	let patchFilter: 'open' | 'merged' = $state('open');
	let openPatches: Patch[] = $state([]);
	let closedPatches: Patch[] = $state([]);
	let openPage = $state(0);
	let closedPage = $state(0);
	let currentPatches = $derived(
		patchFilter === 'open' ? openPatches : closedPatches
	);

	async function loadMore(rid: string, filter: 'open' | 'merged') {
		if (filter === 'open') {
			openPatches = [
				...openPatches,
				...(await httpdApi.getAllPatches(rid, {
					page: openPage,
					perPage: 10,
					status: 'open'
				}))
			];
			openPage++;
		} else {
			closedPatches = [
				...closedPatches,
				...(await httpdApi.getAllPatches(rid, {
					page: closedPage,
					perPage: 10,
					status: 'merged'
				}))
			];
			closedPage++;
		}
	}

	onMount(async () => {
		await loadMore(repo.rid, patchFilter);
	});
</script>

<Card variant="outline">
	<div class="flex flex-col gap-2">
		<div class="text-2xl font-bold">Patches</div>

		<div class="flex items-center gap-2">
			<Button
				variant="outline"
				onclick={async () => {
					patchFilter = 'open';
					if (openPatches.length === 0) await loadMore(repo.rid, patchFilter);
				}}
				class={cn(patchFilter === 'open' && 'bg-accent')}
			>
				<div class="text-success-foreground">
					<Icon name="patch" />
				</div>
				<span class="flex items-center gap-4">
					Open <span class="text-muted-foreground"
						>{repo.payloads['xyz.radicle.project'].meta.patches.open}</span
					></span
				>
			</Button>
			<Button
				variant="outline"
				onclick={async () => {
					patchFilter = 'merged';
					if (closedPatches.length === 0) await loadMore(repo.rid, patchFilter);
				}}
				class={cn(patchFilter === 'merged' && 'bg-accent')}
			>
				<div class="text-merged">
					<Icon name="patch-merged" />
				</div>
				<span class="flex items-center gap-4">
					Merged <span class="text-muted-foreground"
						>{repo.payloads['xyz.radicle.project'].meta.patches.merged}</span
					></span
				>
			</Button>
		</div>

		{#if currentPatches.length === 0}
			<div class="text-muted-foreground">No patches found</div>
		{/if}
		{#each currentPatches as patch}
			<Card
				variant="navigable"
				class="flex flex-col gap-2"
				onclick={() => {
					// TODO: Develop our own patch viewer instead of linking out
					// goto(`patches/${patch.id}?rid=${repo.rid}`);
					window.open(
						`https://app.radicle.xyz/nodes/ash.radicle.garden/${repo.rid}/patches/${patch.id}`,
						'_blank'
					);
				}}
			>
				<div class="flex items-center justify-between gap-2">
					<div class="flex items-center gap-2">
						{#if patch.state.status === 'open'}
							<div class="text-success-foreground">
								<Icon name="patch" />
							</div>
						{:else}
							<div class="text-merged">
								<Icon name="patch-merged" />
							</div>
						{/if}
						{patch.title}
					</div>
					<div class="flex items-center gap-2">
						{#if patch.revisions.reduce((acc, r) => acc + r.discussions.length, 0) > 1}
							{patch.revisions.reduce(
								(acc, r) => acc + r.discussions.length,
								0
							) - 1}
							<Icon name="comment" />
						{/if}
					</div>
				</div>
				<div class="flex items-center justify-between gap-2">
					<div class="text-sm text-muted-foreground">
						Opened by <span class="font-bold">{patch.author.alias}</span> –
						{timeAgo(new Date(patch.revisions[0].timestamp * 1000))} ago
					</div>
				</div>
			</Card>
		{/each}
		{#if currentPatches.length < (patchFilter === 'open' ? repo.payloads['xyz.radicle.project'].meta.patches.open : repo.payloads['xyz.radicle.project'].meta.patches.merged)}
			<Button variant="outline" onclick={() => loadMore(repo.rid, patchFilter)}>
				Load more
			</Button>
		{/if}
	</div>
</Card>

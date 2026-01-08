<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';

	import type { User } from '$types/app';
	import type { PageData } from './$types';

	import { api } from '$lib/api';
	import { Badge } from '$lib/components/ui/badge';
	import { Card } from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import {
		parseNodeStatus,
		timeAgo,
		truncateDid,
		truncateText,
		unescapeHtml
	} from '$lib/utils';

	import Avatar from '$components/Avatar.svelte';
	import CopyableText from '$components/CopyableText.svelte';
	import Icon from '$components/Icon.svelte';
	import ImageWithFallback from '$components/ImageWithFallback.svelte';
	import Markdown from '$components/Markdown.svelte';
	import PinnedRadicleRepositories from '$components/PinnedRadicleRepositories.svelte';
	import RepositoriesWithFilter from '$components/RepositoriesWithFilter.svelte';

	// Server-loaded data
	let { data }: { data: PageData } = $props();

	// Derived from server data
	let profile = $derived(data.profile as User);
	let isMe = $derived(data.isMe);
	let seededRepositories = $derived(data.seededRepositories);

	// Client-side state
	let pinnedRepositories: Record<string, string[]> = $state({});
	let nodeStatuses: Record<
		string,
		{
			isRunning: boolean;
			peers: number;
			sinceSeconds: number;
		}
	> = $state({});
	let unescapedDescription = $state('');

	// Load node statuses client-side (they're dynamic)
	$effect(() => {
		if (profile?.nodes) {
			loadNodeStatuses();
		}
	});

	$effect(() => {
		unescapedDescription = unescapeHtml(profile?.description ?? '');
	});

	async function loadNodeStatuses() {
		for (const node of profile.nodes) {
			try {
				const { content: status } = await api.getNodeStatus(node.node_id);
				const { isRunning, peers, sinceSeconds } = parseNodeStatus(status);
				nodeStatuses[node.node_id] = {
					isRunning,
					peers,
					sinceSeconds: sinceSeconds ?? 0
				};
			} catch (error) {
				nodeStatuses[node.node_id] = {
					isRunning: false,
					peers: 0,
					sinceSeconds: 0
				};
			}
		}
	}

	async function refresh() {
		await invalidateAll();
	}

	function handleCreateRepository(rid: string) {
		toast.promise(api.addSeededRepository(profile.nodes[0].node_id, rid), {
			loading: 'Seeding repository...',
			success: () => {
				rid = '';
				return 'Repository seeded';
			},
			error: 'Failed to seed repository',
			finally: async () => {
				await refresh();
			}
		});
	}
</script>

{#if profile}
	<div class="flex h-80 w-full items-center overflow-hidden object-cover">
		<ImageWithFallback
			src={profile.banner_img}
			alt="Banner"
			fallbackSrc="/img/default-banner.png"
			class="absolute top-0 left-0 h-80 w-full object-cover"
		/>
	</div>
	<div class="grid w-full grid-cols-12 gap-4">
		<div
			class="col-span-12 flex w-full flex-col items-start justify-start gap-2 lg:col-span-2"
		>
			<div class="relative">
				<div class="absolute -top-20 h-32 w-32">
					<Avatar
						src={profile.avatar_img}
						alt="Avatar"
						fallbackText={profile.handle.slice(0, 2)}
						border={true}
					/>
				</div>
			</div>
			<div class="flex flex-col gap-1 pt-12">
				<div class="flex flex-col">
					<span class="text-2xl font-semibold">{profile.handle}</span>
					<!-- NOTE: SQL does datetime(now) which is UTC, but it fails to
					     save an ISO-format string, so we do a not very neat cludge here
					     to turn it into an ISO-format string. -->
					<span class="text-sm font-light text-muted-foreground"
						>Gardening for {timeAgo(
							new Date(profile.created_at.replace(' ', 'T') + 'Z')
						)}</span
					>
				</div>
				{#each profile.nodes as node}
					<div class="flex items-center gap-2">
						<CopyableText text={node.did}>{truncateText(node.did)}</CopyableText>
						{#if isMe && !node.external && nodeStatuses[node.node_id]}
							<Dialog.Root>
								<Dialog.Trigger>
									{#if nodeStatuses[node.node_id].isRunning}
										<span class="text-green-500">
											<Icon name="seedling-filled" />
										</span>
									{:else if nodeStatuses[node.node_id].isRunning === false}
										<span class="text-red-500">
											<Icon name="seedling" />
										</span>
									{:else}
										<span class="text-muted">
											<Icon name="clock" />Checking...
										</span>
									{/if}
								</Dialog.Trigger>
								<Dialog.Content>
									<Dialog.Header>
										<Dialog.Title>Your Radicle Garden Node</Dialog.Title>
										<Dialog.Description>
											{#if nodeStatuses[node.node_id].isRunning}
												<Badge variant="success">
													<Icon name="seedling-filled" />
													Online
												</Badge>
											{:else}
												<Badge variant="destructive">
													<Icon name="seedling" />
													Offline
												</Badge>
											{/if}
											<p>This node is managed by Radicle Garden.</p>
											<div>
												To force a connection to this node, you can run
												<div class="inline-block">
													<CopyableText
														text={`rad node connect ${node.node_id}@${node.connect_address}`}
														>rad node connect {truncateDid(
															`${node.node_id}@${node.connect_address}`
														)}</CopyableText
													>
												</div>
												in a shell where a radicle node is running.
											</div>
										</Dialog.Description>
									</Dialog.Header>
								</Dialog.Content>
							</Dialog.Root>
						{:else if node.external}
							<Badge variant="outline">{node.alias}</Badge>
						{/if}
					</div>
				{/each}
			</div>
		</div>
		<div class="col-span-12 flex w-full flex-col gap-8 pt-8 lg:col-span-8">
			<PinnedRadicleRepositories
				{pinnedRepositories}
				showEditDialog={isMe}
				gardenNode={profile.nodes[0]}
				namespace={profile.handle}
				{refresh}
			/>
			<Card class="px-4 py-2">
				<div class="markdown">
					<Markdown
						md={unescapedDescription ||
							'Welcome to my profile!'}
					/>
				</div>
			</Card>
			<RepositoriesWithFilter
				namespace={profile.handle}
				repositories={Object.values(seededRepositories).flat().filter((r) => r != null) as any[]}
				showCreateDialog={isMe}
				onCreate={handleCreateRepository}
			/>
		</div>
		<!-- <div class="col-span-12 flex flex-col gap-2 pt-8 lg:col-span-2">
			<Card variant="outline">
				<span class="text-xl font-medium">Organisations</span>
			</Card>
			<div>
				<CreateOrganisationDialog
					trigger={createOrganisationTrigger}
					onCreate={handleCreateOrganisation}
				/>
			</div>
		</div> -->
	</div>
{:else}
	<div>Loading...</div>
{/if}

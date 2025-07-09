<script lang="ts">
	import { page } from '$app/state';
	import emoji from 'remark-emoji';
	import Markdown, { type Plugin } from 'svelte-exmarkdown';
	import { gfmPlugin } from 'svelte-exmarkdown/gfm';
	import { toast } from 'svelte-sonner';

	import type { User } from '$types/app';

	import { api } from '$lib/api';
	import { initialiseUser } from '$lib/auth';
	import * as Alert from '$lib/components/ui/alert';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { user } from '$lib/state';
	import {
		cn,
		createFormValidator,
		hasFormErrors,
		parseNodeId,
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
	import PinnedRadicleRepositories from '$components/PinnedRadicleRepositories.svelte';

	const { handle } = $derived(page.params);

	let profile: User | null = $state(null);
	let isMe = $derived(handle === $user?.handle);
	let pinnedRepositories: Record<string, string[]> = $state({});
	let editing = $state(false);
	let nodeStatuses: Record<
		string,
		{
			isRunning: boolean;
			peers: number;
			sinceSeconds: number;
		}
	> = $state({});
	let addingNode = $state(false);
	let removingNode = $state(false);
	let unescapedDescription = $state('');
	let newNode = $state({
		alias: '',
		nid: ''
	});
	let errors = $state<Record<string, string>>({});

	let emojiPlugin = { remarkPlugin: [emoji, { emoticon: true }] } as Plugin;
	let markdownPlugins = [gfmPlugin(), emojiPlugin];

	$effect(() => {
		if (isMe) {
			user.subscribe((user) => (profile = user));
		}
		loadProfile(handle);
	});

	$effect(() => {
		unescapedDescription = unescapeHtml(profile?.description ?? '');
	});

	const validateNewNode = createFormValidator({
		nid: (value: string) => {
			if (!value) return 'Node ID is required';
			if (!parseNodeId(value)) return 'Invalid Node ID';
			if (profile?.nodes.some((node) => node.node_id === value))
				return 'Node ID already added';
			return null;
		},
		alias: (value: string) => {
			if (!value) return 'Alias is required';
			return null;
		}
	});

	function resetNewNode() {
		newNode = {
			alias: '',
			nid: ''
		};
	}

	async function loadProfile(handle: string) {
		const { content } = await api.getProfile(handle);
		profile = content;
		for (const node of profile.nodes) {
			const { content } = await api.getPinnedRepositories(node.node_id);
			pinnedRepositories[node.node_id] = content;
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

	async function saveProfile(profile: User) {
		editing = false;
		await api.putMyProfile({
			description: unescapedDescription,
			avatar_img: profile.avatar_img,
			banner_img: profile.banner_img
		});
		await initialiseUser();
	}

	function addNode(alias: string, nid: string) {
		errors = validateNewNode({ nid, alias });
		if (hasFormErrors(errors)) {
			return;
		}
		const parsedNodeId = parseNodeId(nid);
		addingNode = false;
		// Note ! here because we know that the node id is valid
		toast.promise(api.addExternalNode(alias, parsedNodeId!.pubkey), {
			loading: `Adding ${alias}...`,
			success: `Added ${alias}`,
			error: `Failed to add ${alias}`,
			finally: () => {
				initialiseUser();
				resetNewNode();
			}
		});
	}

	function removeNode(alias: string, nid: string) {
		removingNode = false;
		toast.promise(api.removeExternalNode(nid), {
			loading: `Removing ${alias}...`,
			success: `Removed ${alias}`,
			error: `Failed to remove ${alias}`,
			finally: () => {
				initialiseUser();
			}
		});
	}

	function handleClickAvatar() {
		const avatarInput = document.getElementById(
			'avatar-input'
		) as HTMLInputElement;
		avatarInput.click();
	}

	async function handleChangeAvatar(event: Event) {
		const file = (event.target as HTMLInputElement).files?.[0];
		if (!file) return;
		toast.promise(
			new Promise(async (resolve) => {
				const { fileUrl } = await api.uploadFileToS3(file, 'avatar');
				await api.putAvatar(fileUrl);
				resolve(true);
			}),
			{
				loading: 'Updating avatar...',
				success: 'Avatar updated',
				error: 'Failed to update avatar',
				finally: () => {
					initialiseUser();
				}
			}
		);
	}

	function handleClickBanner() {
		const bannerInput = document.getElementById(
			'banner-input'
		) as HTMLInputElement;
		bannerInput.click();
	}

	async function handleChangeBanner(event: Event) {
		const file = (event.target as HTMLInputElement).files?.[0];
		if (!file) return;
		toast.promise(
			new Promise(async (resolve) => {
				const { fileUrl } = await api.uploadFileToS3(file, 'banner');
				await api.putBanner(fileUrl);
				resolve(true);
			}),
			{
				loading: 'Updating banner...',
				success: 'Banner updated',
				error: 'Failed to update banner',
				finally: () => {
					initialiseUser();
				}
			}
		);
	}
</script>

{#if profile}
	<div class="mx-auto flex w-full flex-col items-start justify-center gap-4">
		<div class="flex w-full w-full flex-col items-start justify-start gap-2">
			<Tooltip.Provider disabled={!isMe}>
				<Tooltip.Root delayDuration={0}>
					<Tooltip.Trigger
						class={cn(
							isMe && 'cursor-pointer',
							'flex h-80 w-full items-center overflow-hidden object-cover'
						)}
						onclick={handleClickBanner}
						disabled={!isMe}
					>
						<ImageWithFallback
							src={profile.banner_img}
							alt="Banner"
							fallbackSrc="/img/default-banner.png"
							class="h-full w-full object-cover"
						/>
						<input
							id="banner-input"
							type="file"
							class="hidden"
							onchange={handleChangeBanner}
							tabindex={-1}
						/>
					</Tooltip.Trigger>
					<Tooltip.Content>
						<p>Change Banner</p>
					</Tooltip.Content>
				</Tooltip.Root>
			</Tooltip.Provider>
			<div class="relative">
				<div class="absolute -top-15">
					<Tooltip.Provider disabled={!isMe}>
						<Tooltip.Root delayDuration={0}>
							<Tooltip.Trigger
								class={cn(isMe && 'cursor-pointer', 'h-24 w-24')}
								onclick={handleClickAvatar}
								disabled={!isMe}
							>
								<Avatar
									src={profile.avatar_img}
									alt="Avatar"
									fallbackText={profile.handle.slice(0, 2)}
									border={true}
								/>
								<input
									id="avatar-input"
									type="file"
									class="hidden"
									onchange={handleChangeAvatar}
									tabindex={-1}
								/>
							</Tooltip.Trigger>
							<Tooltip.Content>
								<p>Change Avatar</p>
							</Tooltip.Content>
						</Tooltip.Root>
					</Tooltip.Provider>
				</div>
			</div>
			<div class="flex flex-col gap-1 pt-8">
				<span class="text-2xl font-bold">{profile.handle}</span>
				{#each profile.nodes as node}
					<div class="flex items-center gap-2">
						<CopyableText text={node.did}>{truncateText(node.did)}</CopyableText
						>
						{#if isMe}
							{#if !node.external && nodeStatuses[node.node_id]}
								{#if nodeStatuses[node.node_id].isRunning}
									<Badge variant="success"
										><Icon name="checkmark" />Node online</Badge
									>
								{:else if nodeStatuses[node.node_id].isRunning === false}
									<Badge variant="destructive"
										><Icon name="cross" />Node offline</Badge
									>
								{:else}
									<Badge variant="outline"
										><Icon name="clock" />Checking...</Badge
									>
								{/if}
								<Dialog.Root>
									<Dialog.Trigger>
										<Icon name="info" />
									</Dialog.Trigger>
									<Dialog.Content>
										<Dialog.Header>
											<Dialog.Title>Your Radicle Garden Node</Dialog.Title>
											<Dialog.Description>
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
								<Dialog.Root bind:open={removingNode}>
									<Dialog.Trigger>
										<Button variant="ghost">
											<Icon name="cross" />
										</Button>
									</Dialog.Trigger>
									<Dialog.Content>
										<Dialog.Header>
											<Dialog.Title>Remove External Node</Dialog.Title>
											<Dialog.Description>
												<p>
													Are you sure you want to remove {node.alias}?
												</p>
												<Alert.Root variant="destructive">
													<Alert.Description>
														You will not be able to add this node back to your
														profile.
													</Alert.Description>
												</Alert.Root>
											</Dialog.Description>
										</Dialog.Header>
										<Dialog.Footer>
											<Button
												variant="outline"
												onclick={() => (removingNode = false)}>Cancel</Button
											>
											<Button
												variant="destructive"
												onclick={() => removeNode(node.alias, node.node_id)}
												>Remove</Button
											>
										</Dialog.Footer>
									</Dialog.Content>
								</Dialog.Root>
							{/if}
						{/if}
					</div>
				{/each}
				{#if isMe}
					<div class="flex flex-col items-start">
						<Dialog.Root
							bind:open={addingNode}
							onOpenChange={() =>
								// Wait for animation to finish before resetting the form
								setTimeout(() => {
									errors = {};
									resetNewNode();
								}, 500)}
						>
							<Dialog.Trigger>
								<Button variant="outline"><Icon name="plus" />Add Node</Button>
							</Dialog.Trigger>
							<Dialog.Content>
								<Dialog.Header>
									<Dialog.Title>Add External Node</Dialog.Title>
									<Dialog.Description>
										Add an external node to your profile. This could be a node
										you run on your laptop, or some other machine.
									</Dialog.Description>
									<Dialog.Description>
										You can find your node id by running
										<div class="inline-block">
											<CopyableText text={'rad self'}>rad self</CopyableText>
										</div>
										in a shell where a radicle node is running.
									</Dialog.Description>
								</Dialog.Header>
								<div class="grid gap-4 py-4 w-full">
									<div class="grid grid-cols-4 items-center gap-4">
										<Label for="nid">Node ID</Label>
										<Input
											type="text"
											name="nid"
											class={cn(
												'col-span-3',
												errors.nid && 'border-destructive'
											)}
											bind:value={newNode.nid}
										/>
										{#if errors.nid}
											<div
												class="col-span-4 text-right text-sm text-destructive"
											>
												{errors.nid}
											</div>
										{/if}
									</div>
									<div class="grid grid-cols-4 items-center gap-4">
										<Label for="alias">Alias</Label>
										<Input
											type="text"
											name="alias"
											class={cn(
												'col-span-3',
												errors.alias && 'border-destructive'
											)}
											bind:value={newNode.alias}
										/>
										{#if errors.alias}
											<div
												class="col-span-4 text-right text-sm text-destructive"
											>
												{errors.alias}
											</div>
										{/if}
									</div>
								</div>
								<Dialog.Footer>
									<Button
										disabled={hasFormErrors(errors)}
										type="submit"
										variant="outline"
										onclick={() => addNode(newNode.alias, newNode.nid)}
										><Icon name="checkmark" />Save</Button
									>
								</Dialog.Footer>
							</Dialog.Content>
						</Dialog.Root>
					</div>
				{/if}
				<span class="text-muted-foreground"
					>Joined {timeAgo(new Date(profile.created_at))} ago</span
				>
			</div>

			{#if editing}
				<Textarea bind:value={unescapedDescription} />
			{:else}
				<div class="markdown">
					<Markdown md={unescapedDescription} plugins={markdownPlugins} />
				</div>
			{/if}

			{#if isMe}
				{#if editing}
					<Button onclick={() => saveProfile(profile!)}>Save</Button>
				{:else}
					<Button onclick={() => (editing = true)}
						><Icon name="pen" />Edit</Button
					>
				{/if}
			{/if}
		</div>
		<div class="flex w-full flex-col gap-2">
			<PinnedRadicleRepositories {pinnedRepositories} showEditLink={isMe} />
		</div>
	</div>
{:else}
	<div>Loading...</div>
{/if}

<style>
	@reference '../../app.css';

	.markdown :global(h1) {
		@apply text-2xl font-bold;
	}
	.markdown :global(h2) {
		@apply text-xl font-bold;
	}
	.markdown :global(h3) {
		@apply text-lg font-bold;
	}
	.markdown :global(pre),
	.markdown :global(code) {
		@apply bg-muted rounded-xs p-2;
	}
	.markdown :global(pre) {
		@apply my-4 overflow-x-auto;
	}
	.markdown :global(ul li) {
		@apply list-inside list-disc;
	}
	.markdown :global(ol li) {
		@apply list-inside list-decimal;
	}
	.markdown :global(blockquote) {
		@apply border-muted-foreground border-l-4 pl-2;
	}
	.markdown :global(table) {
		@apply w-full;
	}
	.markdown :global(table th) {
		@apply bg-muted p-2;
	}
	.markdown :global(table td) {
		@apply border-border border p-2;
	}
	.markdown :global(.footnotes ol li) {
		@apply list-none;
	}
	.markdown :global(.contains-task-list li) {
		@apply list-none;
	}
	.markdown :global(.contains-task-list .task-list-item) {
		@apply flex items-center gap-2;
	}
</style>

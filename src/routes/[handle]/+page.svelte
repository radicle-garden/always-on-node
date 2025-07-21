<script lang="ts">
	import { page } from '$app/state';
	import { toast } from 'svelte-sonner';

	import type { SeededRadicleRepository, User } from '$types/app';

	import { api } from '$lib/api';
	import { initialiseUser } from '$lib/auth';
	import * as Alert from '$lib/components/ui/alert';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
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
	import CreateOrganisationDialog from '$components/CreateOrganisationDialog.svelte';
	import Icon from '$components/Icon.svelte';
	import ImageWithFallback from '$components/ImageWithFallback.svelte';
	import Markdown from '$components/Markdown.svelte';
	import PinnedRadicleRepositories from '$components/PinnedRadicleRepositories.svelte';
	import RepositoriesWithFilter from '$components/RepositoriesWithFilter.svelte';

	const { handle } = $derived(page.params);

	let profile: User | null = $state(null);
	let isMe = $derived(handle === $user?.handle);
	let pinnedRepositories: Record<string, string[]> = $state({});
	let seededRepositories: Record<string, SeededRadicleRepository[]> = $state(
		{}
	);
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
			await loadRepositories(node.node_id);

			// Then parse the node status from the node status api
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

	function handleCreateOrganisation(name: string, invitees: string[]) {
		console.log(name, invitees);
	}

	function handleCreateRepository(rid: string) {
		toast.promise(api.addSeededRepository(profile!.nodes[0].node_id, rid), {
			loading: 'Seeding repository...',
			success: () => {
				rid = '';
				return 'Repository seeded';
			},
			error: 'Failed to seed repository',
			finally: () => {
				loadRepositories(profile!.nodes[0].node_id);
			}
		});
	}
</script>

{#snippet createOrganisationTrigger()}
	<Button><Icon name="plus" />New Organisation</Button>
{/snippet}

{#if profile}
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
					class="absolute top-0 left-0 h-80 w-full object-cover"
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
	<div class="grid w-full grid-cols-12 gap-4">
		<div
			class="col-span-12 flex w-full flex-col items-start justify-start gap-2 lg:col-span-2"
		>
			<div class="relative">
				<div class="absolute -top-20">
					<Tooltip.Provider disabled={!isMe}>
						<Tooltip.Root delayDuration={0}>
							<Tooltip.Trigger
								class={cn(isMe && 'cursor-pointer', 'h-32 w-32')}
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
			<div class="flex flex-col gap-1 pt-12">
				<div class="flex flex-col">
					<span class="text-2xl font-semibold">{profile.handle}</span>
					<span class="text-sm font-light text-muted-foreground"
						>Gardening for {timeAgo(new Date(profile.created_at))}</span
					>
				</div>
				{#each profile.nodes as node}
					<div class="flex items-center gap-2">
						<CopyableText text={node.did}>{truncateText(node.did)}</CopyableText
						>
						{#if isMe}
							{#if !node.external && nodeStatuses[node.node_id]}
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
											<span class="text-muted"
												><Icon name="clock" />Checking...</span
											>
										{/if}
									</Dialog.Trigger>
									<Dialog.Content>
										<Dialog.Header>
											<Dialog.Title>Your Radicle Garden Node</Dialog.Title>
											<Dialog.Description>
												<!-- TODO: Add node status here -->
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
								<Button><Icon name="plus" />Add Node</Button>
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
								<div class="grid w-full gap-4 py-4">
									<div class="grid grid-cols-4 items-center gap-4">
										<Label for="nid">Node ID</Label>
										<Input
											type="text"
											name="nid"
											placeholder="z..."
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
											placeholder="My Laptop"
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
			</div>
		</div>
		<div class="col-span-12 flex w-full flex-col gap-8 pt-8 lg:col-span-8">
			<PinnedRadicleRepositories
				{pinnedRepositories}
				showEditDialog={isMe}
				gardenNode={profile.nodes[0]}
				refresh={() => loadProfile(handle)}
			/>
			<div class="flex flex-col gap-1">
				{#if editing}
					<Textarea bind:value={unescapedDescription} />
				{:else}
					<Card class="px-4 py-2">
						<div class="markdown">
							<Markdown md={unescapedDescription} />
						</div>
					</Card>
				{/if}
				{#if isMe}
					<div class="flex w-full justify-end">
						{#if editing}
							<Button onclick={() => saveProfile(profile!)}>Save</Button>
						{:else}
							<Button onclick={() => (editing = true)}
								><Icon name="pen" />Edit</Button
							>
						{/if}
					</div>
				{/if}
			</div>
			<RepositoriesWithFilter
				namespace={profile.handle}
				repositories={Object.values(seededRepositories).flat()}
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

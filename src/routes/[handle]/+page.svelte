<script lang="ts">
	import { page } from '$app/state';
	import emoji from 'remark-emoji';
	import Markdown, { type Plugin } from 'svelte-exmarkdown';
	import { gfmPlugin } from 'svelte-exmarkdown/gfm';
	import { toast } from 'svelte-sonner';

	import type { User } from '$types/app';

	import { api } from '$lib/api';
	import { initialiseUser } from '$lib/auth';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { user } from '$lib/state';
	import {
		cn,
		parseNodeStatus,
		timeAgo,
		truncateId,
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
	let unescapedDescription = $state('');

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

	async function loadProfile(handle: string) {
		const { content } = await api.getProfile(handle);
		profile = content;
		for (const node of profile.nodes) {
			const { content } = await api.getPinnedRepositories(node.node_id);
			pinnedRepositories[node.node_id] = content;
			try {
				const { content: status } = await api.getNodeStatus(node.node_id);
				const { isRunning, peers, sinceSeconds } = parseNodeStatus(status);
				node.is_running = isRunning;
				node.peers = peers;
				node.since_seconds = sinceSeconds;
			} catch (error) {
				node.is_running = false;
				node.peers = 0;
				node.since_seconds = 0;
			}
		}
	}

	const saveProfile = async (profile: User) => {
		editing = false;
		await api.putMyProfile({
			description: unescapedDescription,
			avatar_img: profile.avatar_img,
			banner_img: profile.banner_img
		});
		await initialiseUser();
	};

	const handleClickAvatar = () => {
		const avatarInput = document.getElementById(
			'avatar-input'
		) as HTMLInputElement;
		avatarInput.click();
	};

	const handleChangeAvatar = async (event: Event) => {
		const file = (event.target as HTMLInputElement).files?.[0];
		if (file) {
			try {
				toast.loading('Updating avatar...');
				const { fileUrl } = await api.uploadFileToS3(file, 'avatar');
				await api.putAvatar(fileUrl);
				toast.success('Avatar uploaded successfully');
				await initialiseUser();
			} catch (error) {
				console.error(error);
				toast.error('Failed to upload avatar');
			}
		}
	};

	const handleClickBanner = () => {
		const bannerInput = document.getElementById(
			'banner-input'
		) as HTMLInputElement;
		bannerInput.click();
	};

	const handleChangeBanner = async (event: Event) => {
		const file = (event.target as HTMLInputElement).files?.[0];
		if (file) {
			try {
				toast.loading('Updating banner...');
				const { fileUrl } = await api.uploadFileToS3(file, 'banner');
				await api.putBanner(fileUrl);
				toast.success('Banner uploaded successfully');
				await initialiseUser();
			} catch (error) {
				console.error(error);
				toast.error('Failed to upload banner');
			}
		}
	};
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
						<CopyableText text={node.did}>{truncateId(node.did)}</CopyableText>
						{#if isMe}
							{#if node.is_running}
								<Badge variant="success"
									><Icon name="checkmark" />Node online</Badge
								>
							{:else if node.is_running === false}
								<Badge variant="destructive"
									><Icon name="cross" />Node offline</Badge
								>
							{:else}
								<Badge variant="outline"><Icon name="clock" />Checking...</Badge
								>
							{/if}
						{/if}
					</div>
				{/each}
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

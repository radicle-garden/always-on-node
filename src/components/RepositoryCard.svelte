<script lang="ts">
	import { fade } from 'svelte/transition';

	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { truncateText } from '$lib/utils';

	import CopyableText from './CopyableText.svelte';
	import Icon from './Icon.svelte';
	import RemoveRepositoryDialog from './RemoveRepositoryDialog.svelte';

	let helpDialogOpen = $state(false);

	let {
		name,
		description,
		repositoryId,
		nodeId,
		nodeConnectAddress,
		seedingStart,
		onRemove
	}: {
		name: string;
		description: string;
		repositoryId: string;
		nodeId: string;
		nodeConnectAddress: string;
		seedingStart?: Date;
		onRemove?: (repositoryId: string, nodeId: string) => void;
	} = $props();
</script>

<div in:fade class="h-full">
	<Card.Root class="flex h-full w-full flex-col justify-between">
		<Card.Header class="flex flex-col gap-2">
			<div class="flex w-full items-center justify-between">
				<Card.Title>
					<div class="max-w-80 md:max-w-60 lg:max-w-80 truncate">
						{name}
					</div>
				</Card.Title>
				<Card.Action>
					<RemoveRepositoryDialog
						title={`Are you sure you want to remove ${name}?`}
						description={`You can add the repository back later.`}
						onRemove={() => onRemove?.(repositoryId, nodeId)}
					/>
				</Card.Action>
			</div>
			<Card.Description>
				{description}
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="flex flex-col gap-2">
				<div class="flex items-center gap-2">
					Repository ID: <CopyableText text={repositoryId}
						>{truncateText(repositoryId)}</CopyableText
					>
				</div>
				<div class="flex items-center gap-2">
					Node ID: <CopyableText text={nodeId}
						>{truncateText(nodeId)}</CopyableText
					>
				</div>
				<div class="flex items-center gap-2">
					Clone with: <CopyableText text={`rad clone ${repositoryId}`}
						>rad clone {truncateText(repositoryId)}</CopyableText
					>
				</div>
			</div>
		</Card.Content>
		<Card.Footer>
			<div class="flex w-full justify-between items-center">
				<Dialog.Root bind:open={helpDialogOpen}>
					<Dialog.Trigger>
						<Button
							variant="ghost"
							onclick={() => (helpDialogOpen = true)}
							tabindex={-1}
						>
							<Icon name="info" />
						</Button>
					</Dialog.Trigger>
					<Dialog.Content>
						<Dialog.Header>
							<Dialog.Title>How to clone this repository</Dialog.Title>
							<Dialog.Description>
								If you're having trouble cloning this repository with the
								Radicle CLI, try the following steps:
							</Dialog.Description>
							<Dialog.Description class="text-foreground flex flex-col gap-2">
								<div>
									First, check your node is running:
									<CopyableText text={`rad node start`}
										>rad node start</CopyableText
									>
								</div>
								<div>
									Next, connect to the seeding node:
									<CopyableText
										text={`rad node connect ${nodeId}@${nodeConnectAddress}`}
										>rad node connect {truncateText(
											`${nodeId}@${nodeConnectAddress}`
										)}</CopyableText
									>
								</div>
								<div>
									Finally, clone the repository:
									<CopyableText text={`rad clone ${repositoryId}`}
										>rad clone {truncateText(repositoryId)}</CopyableText
									>
								</div>
							</Dialog.Description>
						</Dialog.Header>
					</Dialog.Content>
				</Dialog.Root>
				<div class="flex items-center gap-2">
					{#if seedingStart}
						<div class="text-muted-foreground text-sm">
							Seeding since {seedingStart.toLocaleDateString()}
						</div>
					{/if}
					<Button
						variant="outline"
						onclick={() => {
							window.open(
								`https://app.radicle.xyz/nodes/ash.radicle.garden/${repositoryId}`,
								'_blank'
							);
						}}
					>
						Browse code <Icon name="open-external" />
					</Button>
				</div>
			</div>
		</Card.Footer>
	</Card.Root>
</div>

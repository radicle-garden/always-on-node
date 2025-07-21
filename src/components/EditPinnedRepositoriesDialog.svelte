<script lang="ts">
	import { toast } from 'svelte-sonner';

	import { api } from '$lib/api';
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { findRespositoryByRid } from '$lib/state';
	import { cn, truncateText } from '$lib/utils';

	import DraggableList from './DraggableList.svelte';
	import Icon from './Icon.svelte';
	import RepositorySearchBar from './RepositorySearchBar.svelte';

	let {
		nodeId,
		originalPinned,
		onSaved
	}: {
		nodeId: string;
		originalPinned: string[];
		onSaved: () => void;
	} = $props();

	let open = $state(false);
	let currentPinned = $state<string[]>(originalPinned);
	let newRid = $state('');
	let previousOpen = $state(false);

	// Reset the local state when the dialog opens (not just when it's open)
	$effect(() => {
		if (open && !previousOpen) {
			currentPinned = [...originalPinned];
		}
		previousOpen = open;
	});

	function remove(index: number) {
		currentPinned = currentPinned.filter((_, i) => i !== index);
	}

	async function save() {
		const toRemove = originalPinned.filter((r) => !currentPinned.includes(r));
		const toAdd = currentPinned.filter((r) => !originalPinned.includes(r));

		try {
			// Step 1: Delete removed items (those that were removed by user)
			if (toRemove.length > 0) {
				await Promise.all(
					toRemove.map((rid) => api.deletePinnedRepository(nodeId, rid))
				);
			}

			// Step 2: Add new items (those that were added by user)
			if (toAdd.length > 0) {
				await Promise.all(
					toAdd.map((rid) => api.addPinnedRepository(nodeId, rid))
				);
			}

			// Step 3: Handle reordering only if order has changed
			const hasOrderChanged =
				originalPinned.length === currentPinned.length &&
				originalPinned.some((rid, index) => rid !== currentPinned[index]);

			if (hasOrderChanged && toRemove.length === 0 && toAdd.length === 0) {
				// Only reorder if no items were added/removed
				// First ensure all items are removed, then re-add in correct order
				// We do this sequentially to avoid race conditions
				for (const rid of originalPinned) {
					await api.deletePinnedRepository(nodeId, rid);
				}
				for (const rid of currentPinned) {
					await api.addPinnedRepository(nodeId, rid);
				}
			}

			onSaved();
			toast.success('Pinned repositories updated');
		} catch (e) {
			console.error('Error saving pinned repositories:', e);
			toast.error('Failed to update pinned repositories');
			// Restore the original state in the UI
			currentPinned = [...originalPinned];
		} finally {
			open = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger
		class="cursor-pointer text-sm text-muted-foreground hover:underline"
		>edit</Dialog.Trigger
	>
	<Dialog.Content class="min-w-[800px]">
		<Dialog.Header>
			<Dialog.Title>Edit Pinned Repositories</Dialog.Title>
			<Dialog.Description class="flex flex-col gap-4">
				<div>You can pin a maximum of 6 repositories to your profile page.</div>

				<!-- Here we want to add the input which allows pinnning new repos -->
				<div class="flex flex-col gap-2">
					<RepositorySearchBar bind:rid={newRid} />
					<div>
						<Button
							class={cn(
								(!newRid ||
									currentPinned.includes(newRid) ||
									currentPinned.length >= 6) &&
									'!pointer-events-auto !cursor-not-allowed'
							)}
							disabled={!newRid ||
								currentPinned.includes(newRid) ||
								currentPinned.length >= 6}
							onclick={() => {
								if (newRid) {
									currentPinned.push(newRid);
									newRid = '';
								}
							}}
						>
							<Icon name="pin" />
							Add
						</Button>
					</div>
				</div>

				<div>Drag and drop to reorder repositories.</div>
			</Dialog.Description>
		</Dialog.Header>
		<div class="grid grid-cols-3 gap-4">
			<DraggableList bind:items={currentPinned} key={(rid: string) => rid}>
				{#snippet children({
					item,
					index,
					draggedIndex,
					dropTargetIndex
				}: {
					item: string;
					index: number;
					draggedIndex: number | null;
					dropTargetIndex: number | null;
				})}
					<Card
						class={cn(
							'col-span-1 flex h-full cursor-grab flex-col gap-2',
							dropTargetIndex === index && 'bg-radicle-blue/50',
							draggedIndex === index && 'bg-radicle-blue/10'
						)}
					>
						<div class="flex items-center justify-between">
							<div class="truncate font-bold">
								{findRespositoryByRid(item)?.name ?? truncateText(item, 6)}
							</div>
							<Button
								variant="ghost"
								class="cursor-pointer"
								onclick={(e) => {
									e.preventDefault();
									remove(index);
								}}
							>
								<Icon name="cross" />
							</Button>
						</div>
						<div class="line-clamp-3 text-xs text-muted-foreground">
							{findRespositoryByRid(item)?.desc ?? ''}
						</div>
					</Card>
				{/snippet}
			</DraggableList>
		</div>
		<Dialog.Footer>
			<Button onclick={save}>Save changes</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';

	import Icon from './Icon.svelte';
	import RepositorySearchBar from './RepositorySearchBar.svelte';

	let rid = $state('');

	let { onSave }: { onSave: (rid: string) => void } = $props();

	let open = $state(false);
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger>
		<Button variant="outline">
			<Icon name="add" />
			Seed Repository
		</Button>
	</Dialog.Trigger>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Seed Repository</Dialog.Title>
		</Dialog.Header>
		<Dialog.Description>
			<div class="py-2 text-sm text-muted-foreground">
				Adding a repository here will seed it from your node and make it more
				available to other users on Radicle.
			</div>
			<RepositorySearchBar bind:rid />
		</Dialog.Description>
		<Dialog.Footer>
			<div class="flex w-full items-center justify-between">
				<div>
					<Button variant="outline" onclick={() => (open = false)}
						>Cancel</Button
					>
				</div>
				<div>
					<Button
						variant="outline"
						onclick={() => {
							onSave(rid);
							open = false;
							rid = '';
						}}>Add</Button
					>
				</div>
			</div>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

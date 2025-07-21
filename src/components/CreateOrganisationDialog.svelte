<script lang="ts">
	import type { Snippet } from 'svelte';

	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';

	import Icon from './Icon.svelte';

	let name = $state('');
	let inviteeCount = $state(1);
	let invitees = $state<string[]>([]);

	let {
		trigger,
		onCreate
	}: {
		trigger: Snippet;
		onCreate: (name: string, invitees: string[]) => void;
	} = $props();
</script>

<Dialog.Root>
	<Dialog.Trigger>
		{@render trigger()}
	</Dialog.Trigger>
	<Dialog.Content>
		<Dialog.Title>Create an Organisation</Dialog.Title>
		<Dialog.Description>
			<div>
				Organisations are an easy way to manage permissions for multiple Radicle
				Repositories.
			</div>
			<div class="flex flex-col gap-4">
				<div>
					<div>
						Names must be unique and can contain only alphanumeric characters
						and hyphens.
					</div>
					<Input
						id="organisation-name"
						placeholder="Organisation Name"
						bind:value={name}
						class="text-white"
					/>
				</div>
				<div>
					<div class="text-lg font-medium text-white">Invite Other Users</div>
					<div>
						Invited users will receive an email with a link to join the
						Organisation.
					</div>
					<div>
						You can manage their permissions after creating the Organisation.
					</div>
					<div class="flex flex-col gap-2">
						{#each Array.from({ length: inviteeCount }) as _, index}
							<Input
								id={`invitee-${index}`}
								placeholder="Invitee Email"
								bind:value={invitees[index]}
								class="text-white"
							/>
						{/each}
						<div>
							<Button onclick={() => inviteeCount++}
								><Icon name="plus" />Invite Another User</Button
							>
						</div>
					</div>
				</div>
			</div>
		</Dialog.Description>
		<Dialog.Footer>
			<Button onclick={() => onCreate(name, invitees)}
				>Create Organisation</Button
			>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

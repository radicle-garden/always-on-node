<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { getContext, onMount } from 'svelte';
	import { toast } from 'svelte-sonner';

	import { api } from '$lib/api';
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import type { Repo } from '$lib/http-client';
	import { user } from '$lib/state';

	import Breadcrumbs from '$components/Breadcrumbs.svelte';
	import DeleteRepositoryDialog from '$components/DeleteRepositoryDialog.svelte';
	import Icon from '$components/Icon.svelte';

	const { repository } = getContext<{ repository: Promise<Repo> }>('repo');

	let webhooks = $state([
		{
			location: 'https://example.com/webhook',
			triggers: [
				{
					event: 'Branch Updated',
					branch: 'master'
				}
			]
		}
	]);

	function addWebhook() {
		webhooks = [
			...webhooks,
			{ location: '', triggers: [{ event: '', branch: '' }] }
		];
	}

	function addTrigger(webhookIndex: number) {
		webhooks = webhooks.map((wh, i) => {
			if (i === webhookIndex) {
				return {
					...wh,
					triggers: [...wh.triggers, { event: '', branch: '' }]
				};
			}
			return wh;
		});
	}

	function removeTrigger(webhookIndex: number, triggerIndex: number) {
		webhooks = webhooks.map((wh, i) => {
			if (i === webhookIndex) {
				return {
					...wh,
					triggers: wh.triggers.filter((_, j) => j !== triggerIndex)
				};
			}
			return wh;
		});
	}

	function removeWebhook(index: number) {
		webhooks = webhooks.filter((_, i) => i !== index);
	}
</script>

{#await repository}
	<div>Loading...</div>
{:then repo}
	<div class="flex flex-col gap-4">
		<Breadcrumbs
			items={[
				{
					label: repo.payloads['xyz.radicle.project'].data.name,
					href: `/${page.params.namespace}/${page.params.name}?rid=${repo.rid}`
				},
				{ label: 'Settings' }
			]}
		/>

		<Card variant="outline">
			<div class="flex flex-col gap-2">
				<div class="flex items-center justify-between">
					<div class="text-2xl font-bold">CI Settings</div>
					<Button
						variant="ghost"
						onclick={() => {
							window.open(
								'https://radicle-ci.liw.fi/radicle-ci-broker/userguide.html#ci-events',
								'_blank'
							);
						}}
					>
						<Icon name="info" />
						Docs
					</Button>
				</div>
				<div>
					Here you can configure webhooks for {repo.payloads[
						'xyz.radicle.project'
					].data.name}. This can be used to trigger CI, for example.
				</div>
				{#each webhooks as webhook, i}
					<Card variant="outline" class="p-4">
						<div class="flex w-full flex-col gap-4">
							<div class="flex items-center gap-4">
								<div class="w-1/4">Webhook URL</div>
								<Input
									id={`location-${i}`}
									bind:value={webhook.location}
									placeholder="https://example.com/webhook"
								/>
								{#if webhooks.length > 1}
									<Button variant="ghost" onclick={() => removeWebhook(i)}
										><Icon name="cross" /></Button
									>
								{/if}
							</div>
							{#each webhook.triggers as trigger, j}
								<div class="flex items-center gap-4">
									<Select.Root
										type="single"
										onValueChange={(s) => (trigger.event = s || '')}
									>
										<Select.Trigger id={`event-${i}-${j}`}>
											{trigger.event || 'Select Event'}
										</Select.Trigger>
										<Select.Content>
											<Select.Item value="Patch Created"
												>Patch Created</Select.Item
											>
											<Select.Item value="Patch Updated"
												>Patch Updated</Select.Item
											>
											<Select.Item value="Branch Updated"
												>Branch Updated</Select.Item
											>
											<Select.Item value="Branch Deleted"
												>Branch Deleted</Select.Item
											>
											<Select.Item value="Tag Created">Tag Created</Select.Item>
											<Select.Item value="Tag Updated">Tag Updated</Select.Item>
											<Select.Item value="Tag Deleted">Tag Deleted</Select.Item>
										</Select.Content>
									</Select.Root>
									{#if trigger.event.includes('Branch')}
										<div class="flex items-center gap-1">
											<span>branch name</span>
											<Input
												bind:value={trigger.branch}
												class="w-32"
												placeholder="master"
											/>
										</div>
									{/if}
									{#if webhook.triggers.length > 1}
										<Button variant="ghost" onclick={() => removeTrigger(i, j)}
											><Icon name="cross" /></Button
										>
									{/if}
								</div>
							{/each}
							<div>
								<Button variant="ghost" onclick={() => addTrigger(i)}
									><Icon name="add" /> Add Trigger</Button
								>
							</div>
						</div>
					</Card>
				{/each}
				<div class="flex justify-between">
					<div>
						<Button variant="ghost" onclick={addWebhook}
							><Icon name="add" /> Add Webhook</Button
						>
					</div>
					<div>
						<Button variant="outline"><Icon name="checkmark" />Save</Button>
					</div>
				</div>
			</div>
		</Card>
		<Card variant="outline">
			<div class="flex flex-col gap-2">
				<div class="text-2xl font-bold">Delete Repository</div>
				<div>
					Remove {repo.payloads['xyz.radicle.project'].data.name} from your node.
				</div>
				<div>
					<!-- FIXME: The link is wrong -->
					This does not guarantee deletion of the repository from the Radicle Network.
					<a
						href="https://docs.radicle.xyz/docs/radicle-network/how-to-delete-a-repository"
						>Why not?</a
					>
				</div>
				<div class="flex self-end">
					<DeleteRepositoryDialog
						nid={$user!.nodes[0].node_id}
						rid={repo.rid}
						onDelete={() => {
							toast.promise(
								api.deleteSeededRepository($user!.nodes[0].node_id, repo.rid),
								{
									loading: 'Deleting repository...',
									success: () => {
										goto('/');
										return 'Repository deleted';
									},
									error: 'Failed to delete repository'
								}
							);
						}}
					/>
				</div>
			</div>
		</Card>
	</div>
{/await}

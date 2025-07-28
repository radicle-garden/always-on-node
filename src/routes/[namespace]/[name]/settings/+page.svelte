<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { getContext, onMount } from 'svelte';
	import { toast } from 'svelte-sonner';

	import {
		WebhookTriggerEvent,
		type RepositoryWebhookSettings,
		type SavedRepositoryWebhookSettings
	} from '$types/app';

	import { api } from '$lib/api';
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import type { Repo } from '$lib/http-client';
	import { user } from '$lib/state';
	import { createFormValidator, hasFormErrors, timeAgo } from '$lib/utils';

	import Breadcrumbs from '$components/Breadcrumbs.svelte';
	import DeleteRepositoryDialog from '$components/DeleteRepositoryDialog.svelte';
	import Icon from '$components/Icon.svelte';

	const { repository } = getContext<{ repository: Promise<Repo> }>('repo');

	const defaultWebhook: RepositoryWebhookSettings = {
		location: '',
		secret: '',
		triggers: [{ event: WebhookTriggerEvent.BRANCH_UPDATED, branch: 'master' }]
	};

	let webhooks: RepositoryWebhookSettings[] = $state<
		RepositoryWebhookSettings[]
	>([defaultWebhook]);

	let existingWebhooks: SavedRepositoryWebhookSettings[] = $state([]);
	let formErrors: Record<string, string>[] = $state([]);

	let rid: string = $state('');

	async function refreshWebhooks() {
		const { content: whks } = await api.getWebhooks(rid);
		existingWebhooks = whks;
		console.log({ existingWebhooks });
	}

	onMount(async () => {
		repository.then(async (repo) => {
			rid = repo.rid;
			refreshWebhooks();
		});
	});

	function addTrigger(webhookIndex: number) {
		webhooks = webhooks.map((wh, i) => {
			if (i === webhookIndex) {
				return {
					...wh,
					triggers: [
						...wh.triggers,
						{ event: WebhookTriggerEvent.BRANCH_UPDATED, branch: '' }
					]
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

	function removeWebhook(uuid: string) {
		toast.promise(api.deleteWebhook(rid, uuid), {
			loading: 'Deleting webhook...',
			success: () => {
				existingWebhooks = existingWebhooks.filter((wh) => wh.uuid !== uuid);
				return 'Webhook deleted';
			},
			finally: async () => {
				// Reload existing webhooks
				const { content: whks } = await api.getWebhooks(rid);
				existingWebhooks = whks;
			}
		});
	}

	async function save(rid: string, newWebhook: RepositoryWebhookSettings[]) {
		formErrors = [];

		for (const wh of newWebhook) {
			const errors = formValidator({
				location: wh.location,
				secret: wh.secret,
				triggers: wh.triggers
			});
			if (hasFormErrors(errors)) {
				formErrors.push(errors);
			}
		}

		if (formErrors.length > 0) {
			return;
		}

		toast.promise(api.saveWebhooks(rid, newWebhook), {
			loading: 'Updating settings...',
			success: () => {
				webhooks = [defaultWebhook];
				formErrors = [];

				return 'Settings updated';
			},
			error: 'Failed to update settings',
			finally: () => {
				refreshWebhooks();
			}
		});
	}

	const formValidator = createFormValidator({
		location: (value) => {
			if (!value) {
				return 'Webhook URL is required';
			}
			return null;
		},
		secret: (value) => {
			if (!value) {
				return 'Secret is required';
			}
			return null;
		},
		triggers: (value) => {
			if (!value) {
				return 'At least one trigger is required';
			}
			if (value.length === 0) {
				return 'At least one trigger is required';
			}
			if (
				value.some(
					(t: RepositoryWebhookSettings['triggers'][number]) => !t.event
				)
			) {
				return 'All triggers must have an event';
			}
			if (
				value.some(
					(t: RepositoryWebhookSettings['triggers'][number]) =>
						t.event === WebhookTriggerEvent.BRANCH_UPDATED && !t.branch
				)
			) {
				return 'Branch name is required for branch updated event';
			}
			return null;
		}
	});
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

		<form onsubmit={() => save(repo.rid, webhooks)} class="w-full">
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
					{#if existingWebhooks.length > 0}
						<div>
							<div class="text-lg font-bold">Existing webhooks</div>
							<div class="flex flex-col gap-2">
								{#each existingWebhooks as wh}
									<Card variant="outline" class="p-4">
										<div class="flex flex-col gap-2">
											<div class="flex justify-between">
												<div>URL: {wh.url}</div>
												<Button
													variant="ghost"
													onclick={() => removeWebhook(wh.uuid)}
													><Icon name="cross" /></Button
												>
											</div>
											<div>
												Triggers:
												<ul>
													{#each JSON.parse(wh.triggers) as t}
														<li>
															{t.event}
															{#if t.event === WebhookTriggerEvent.BRANCH_UPDATED}
																<span>
																	– {t.branch}
																</span>
															{/if}
														</li>
													{/each}
												</ul>
											</div>
											<div>
												Created: {timeAgo(new Date(wh.created_date))} ago
											</div>
										</div>
									</Card>
								{/each}
							</div>
						</div>
					{/if}
					<div>
						<div class="text-lg font-bold">New webhook</div>
						<div class="flex flex-col gap-2">
							{#each webhooks as webhook, i}
								<Card variant="outline" class="p-4">
									<div class="flex w-full flex-col gap-4">
										<div class="flex items-center gap-4">
											<div class="w-1/4">Webhook URL</div>
											<Input
												id={`location-${i}`}
												bind:value={webhook.location}
												aria-invalid={!!formErrors[i]?.location}
												placeholder="https://example.com/webhook"
												required
											/>
											{#if formErrors[i]?.location}
												<p class="text-sm text-destructive">
													{formErrors[i].location}
												</p>
											{/if}
										</div>
										<div class="flex items-center gap-4">
											<div class="w-1/4">Secret</div>
											<Input
												id={`secret-${i}`}
												bind:value={webhook.secret}
												placeholder="secret"
												aria-invalid={!!formErrors[i]?.secret}
												required
											/>
											{#if formErrors[i]?.secret}
												<p class="text-sm text-destructive">
													{formErrors[i].secret}
												</p>
											{/if}
										</div>
										{#each webhook.triggers as trigger, j}
											<div class="flex items-center gap-4">
												<Select.Root
													type="single"
													onValueChange={(s) =>
														(trigger.event = s as WebhookTriggerEvent)}
												>
													<Select.Trigger id={`event-${i}-${j}`}>
														{trigger.event || 'Select Event'}
													</Select.Trigger>
													<Select.Content>
														<Select.Item
															value={WebhookTriggerEvent.PATCH_CREATED}
															label="Patch Created">Patch Created</Select.Item
														>
														<Select.Item
															value={WebhookTriggerEvent.PATCH_UPDATED}
															label="Patch Updated">Patch Updated</Select.Item
														>
														<Select.Item
															value={WebhookTriggerEvent.BRANCH_UPDATED}
															label="Branch Updated">Branch Updated</Select.Item
														>
														<Select.Item
															value={WebhookTriggerEvent.BRANCH_DELETED}
															label="Branch Deleted">Branch Deleted</Select.Item
														>
														<Select.Item
															value={WebhookTriggerEvent.TAG_CREATED}
															label="Tag Created">Tag Created</Select.Item
														>
														<Select.Item
															value={WebhookTriggerEvent.TAG_UPDATED}
															label="Tag Updated">Tag Updated</Select.Item
														>
														<Select.Item
															value={WebhookTriggerEvent.TAG_DELETED}
															label="Tag Deleted">Tag Deleted</Select.Item
														>
													</Select.Content>
												</Select.Root>
												{#if trigger.event === WebhookTriggerEvent.BRANCH_UPDATED}
													<div class="flex items-center gap-1">
														<span>branch name</span>
														<Input
															bind:value={trigger.branch}
															class="w-32"
															placeholder="master"
															aria-invalid={!!formErrors[i]?.triggers}
															required
														/>
													</div>
												{/if}
												{#if formErrors[i]?.triggers}
													<p class="text-sm text-destructive">
														{formErrors[i].triggers}
													</p>
												{/if}
												{#if webhook.triggers.length > 1}
													<Button
														variant="ghost"
														onclick={() => removeTrigger(i, j)}
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
							<div class="flex justify-end">
								<Button variant="outline" type="submit"
									><Icon name="checkmark" />Save</Button
								>
							</div>
						</div>
					</div>
				</div>
			</Card>
		</form>
		<Card variant="outline">
			<div class="flex flex-col gap-2">
				<div class="text-2xl font-bold">Delete Repository</div>
				<div>
					Remove {repo.payloads['xyz.radicle.project'].data.name} from your node.
				</div>
				<div>
					This does not guarantee deletion of the repository from the Radicle
					Network.
					<!-- FIXME: The link is wrong -->
					<!-- <a
						href="https://docs.radicle.xyz/docs/radicle-network/how-to-delete-a-repository"
						>Why not?</a
					> -->
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

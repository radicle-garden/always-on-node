<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { getContext } from 'svelte';
	import { toast } from 'svelte-sonner';

	import { api } from '$lib/api';
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import type { Repo } from '$lib/http-client';
	import { user } from '$lib/state';

	import Breadcrumbs from '$components/Breadcrumbs.svelte';
	import DeleteRepositoryDialog from '$components/DeleteRepositoryDialog.svelte';
	import Icon from '$components/Icon.svelte';

	const { repository } = getContext<{ repository: Promise<Repo> }>('repo');

	let rules = [
		{
			adapter: 'CircleCI',
			location: 'https://circleci.com/radicle-garden/token',
			event: 'On Push',
			branch: 'master'
		}
	];
	function addRule() {
		rules = [...rules, { adapter: '', location: '', event: '', branch: '' }];
	}
	function removeRule(index: number) {
		rules = rules.filter((_, i) => i !== index);
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
							// FIXME
							alert('Coming soon');
						}}
					>
						<Icon name="info" />
						Docs
					</Button>
				</div>
				<div>
					Here you can configure CI for {repo.payloads['xyz.radicle.project']
						.data.name}.
				</div>
				{#each rules as rule, i}
					<Card variant="outline" class="p-4">
						<div class="flex items-center justify-between">
							<div class="flex flex-col gap-1">
								<div class="flex flex-col gap-1">
									<div class="flex items-center gap-4">
										<div>Select CI Adapter</div>
										<Select.Root
											type="single"
											onValueChange={(s) => (rule.adapter = s || '')}
										>
											<Select.Trigger id={`adapter-${i}`}>
												{rule.adapter || 'CircleCI'}
											</Select.Trigger>
											<Select.Content>
												<Select.Item value="CircleCI">CircleCI</Select.Item>
												<Select.Item value="Ambient">Ambient</Select.Item>
												<Select.Item value="Woodpecker">Woodpecker</Select.Item>
											</Select.Content>
										</Select.Root>
									</div>
									<div class="flex items-center gap-4">
										<div>CI Location (URL)</div>
										<Input
											id={`location-${i}`}
											bind:value={rule.location}
											placeholder="https://circleci.com/radicle-garden/token"
										/>
									</div>
								</div>
								<div class="flex flex-col gap-1">
									<div>When should CI run?</div>
									<div class="flex items-center gap-4">
										<Select.Root
											type="single"
											onValueChange={(s) => (rule.event = s || '')}
										>
											<Select.Trigger id={`event-${i}`}>
												{rule.event || 'On Push'}
											</Select.Trigger>
											<Select.Content>
												<Select.Item value="Patch created"
													>Patch created</Select.Item
												>
												<Select.Item value="Patch updated"
													>Patch updated</Select.Item
												>
												<Select.Item value="Patch deleted"
													>Patch deleted</Select.Item
												>
												<Select.Item value="Branch created"
													>Branch created</Select.Item
												>
												<Select.Item value="Branch updated"
													>Branch updated</Select.Item
												>
												<Select.Item value="Branch deleted"
													>Branch deleted</Select.Item
												>
												<Select.Item value="Manual">Manual</Select.Item>
												<Select.Item value="On push">On push</Select.Item>
											</Select.Content>
										</Select.Root>
										{#if rule.event.includes('Patch') || rule.event === 'On push'}
											<div class="flex items-center gap-1 pb-1">
												<span>to</span>
												<Input
													bind:value={rule.branch}
													class="w-32"
													placeholder="master"
												/>
											</div>
										{/if}
									</div>
								</div>
							</div>
							{#if rules.length > 1}
								<Button variant="ghost" onclick={() => removeRule(i)}
									><Icon name="cross" /></Button
								>
							{/if}
						</div>
					</Card>
				{/each}
				<div class="flex justify-between">
					<div>
						<Button variant="ghost" onclick={addRule}
							><Icon name="add" /> Add Rule</Button
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
					This does not guarantee deletion of the repository from the Radicle
					Network. <a
						href="https://docs.radicle.xyz/docs/radicle-network/how-to-delete-a-repository"
						>Why not?</a
					>
					<!-- FIXME: The link is wrong -->
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

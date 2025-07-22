<script lang="ts">
	import { getContext } from 'svelte';

	import { Card } from '$lib/components/ui/card';
	import type { Repo } from '$lib/http-client';
	import { httpdApi } from '$lib/httpdApi';

	import Icon from '$components/Icon.svelte';
	import Loading from '$components/Loading.svelte';
	import Markdown from '$components/Markdown.svelte';

	const { repository } = getContext<{ repository: Promise<Repo> }>('repo');
</script>

{#await repository}
	<Loading />
{:then repo}
	{#await httpdApi.getReadme(repo.rid, repo.payloads['xyz.radicle.project'].meta.head)}
		<Loading />
	{:then blob}
		<Card>
			<Markdown md={blob.content ?? ''} />
		</Card>
	{:catch error}
		<Card variant="outline">
			<div class="flex min-h-[50vh] items-center justify-center">
				<div class="text-center">
					<div class="flex items-center justify-center">
						<Icon name="eye-closed" size="32" />
					</div>
					<p class="mb-4 text-lg font-semibold">README.md not found</p>
				</div>
			</div>
		</Card>
	{/await}
{:catch error}
	<div>Error: {error}</div>
{/await}

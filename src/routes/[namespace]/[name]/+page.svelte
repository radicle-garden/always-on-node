<script lang="ts">
	import { page } from '$app/stores';
	import { getContext } from 'svelte';

	import { Card } from '$lib/components/ui/card';
	import type { Repo } from '$lib/http-client';
	import { httpdApi } from '$lib/httpdApi';

	import Breadcrumbs from '$components/Breadcrumbs.svelte';
	import Markdown from '$components/Markdown.svelte';

	const { repository } = getContext<{ repository: Promise<Repo> }>('repo');
</script>

{#await repository}
	<div>Loading...</div>
{:then repo}
	<Card>
		{#await httpdApi.getReadme(repo.rid, repo.payloads['xyz.radicle.project'].meta.head)}
			<div>Loading README...</div>
		{:then blob}
			<Markdown md={blob.content ?? ''} />
		{:catch error}
			<div>Error loading README: {error}</div>
		{/await}
	</Card>
{:catch error}
	<div>Error: {error}</div>
{/await}

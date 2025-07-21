<script lang="ts">
	import { page } from '$app/state';
	import { getContext } from 'svelte';

	import type { Repo } from '$lib/http-client';

	import Breadcrumbs from '$components/Breadcrumbs.svelte';
	import Issues from '$components/Issues.svelte';

	const { repository } = getContext<{ repository: Promise<Repo> }>('repo');
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
				{ label: 'Issues' }
			]}
		/>
		<Issues {repo} />
	</div>
{:catch error}
	<div>Error: {error}</div>
{/await}

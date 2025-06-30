<script>
	import '../app.css';
	import { onMount } from 'svelte';

	import { initialiseUser, initializeRadicleRepositoryList } from '$lib/auth';
	import { Toaster } from '$lib/components/ui/sonner';

	import Header from '$components/Header.svelte';
	import Icon from '$components/Icon.svelte';

	let { children } = $props();

	let initialised = $state(false);

	onMount(async () => {
		await initialiseUser();
		await initializeRadicleRepositoryList();
		initialised = true;
	});
</script>

<Toaster />

<div class="layout px-2 py-1">
	<header class="w-full xl:w-2/3 px-2">
		<Header />
	</header>
	<main class="w-full xl:w-2/3 px-2">
		{#if initialised}
			{@render children()}
		{:else}
			<div class="flex h-full w-full items-center justify-center">
				<Icon name="seedling" />
			</div>
		{/if}
	</main>
	<footer class="txt-small px-2">
		&copy; {new Date().getFullYear()} Radicle <Icon name="seedling" />
	</footer>
</div>

<style>
	.layout {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	main {
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		overflow: scroll;
		scrollbar-width: none;
		-ms-overflow-style: none;
		&::-webkit-scrollbar {
			display: none;
		}
	}

	footer {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		text-align: center;
		margin-top: auto;
		padding: 1rem 0;
		color: var(--color-foreground-dim);
	}
</style>

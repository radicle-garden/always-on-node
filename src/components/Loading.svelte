<script lang="ts">
	import { onMount } from 'svelte';

	import Icon from './Icon.svelte';

	let interval: number;
	let flipBit = 0;
	let numSeedlings = 0;

	function redraw() {
		if (numSeedlings === 9) {
			numSeedlings = 0;
			flipBit = 1;
		} else {
			numSeedlings++;
		}
	}

	onMount(() => {
		interval = setInterval(redraw, 500);
		return () => clearInterval(interval);
	});
</script>

<div class="loading-grid">
	{#each Array(numSeedlings) as _, index}
		<Icon
			name={index % 2 === flipBit ? 'seedling-filled' : 'seedling'}
			size="32"
		/>
	{/each}
</div>

<style>
	.loading-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		grid-template-rows: repeat(3, 1fr);
		gap: 0.5rem;
		width: fit-content;
		height: fit-content;
		align-items: center;
		justify-items: center;
	}
</style>

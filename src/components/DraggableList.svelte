<script lang="ts" generics="T">
	import { flip } from 'svelte/animate';

	import { cn } from '$lib/utils.js';

	let {
		items = $bindable<T[]>([]),
		key,
		children,
		// Expose state as bindable props for external styling control
		draggedIndex = $bindable<number | null>(null),
		dropTargetIndex = $bindable<number | null>(null),
		// Animation duration
		flipDuration = 200
	} = $props();

	let originalOrder = $state<T[]>([]);
	let isDropped = $state(false);

	// Debounce dragenter events to prevent rapid firing
	let dragEnterTimeout: number | null = null;

	function handleDragEnter(targetIndex: number) {
		// Clear any existing timeout
		if (dragEnterTimeout) {
			clearTimeout(dragEnterTimeout);
		}

		// Debounce the dragenter event
		dragEnterTimeout = setTimeout(() => {
			if (draggedIndex !== null && draggedIndex !== targetIndex) {
				dropTargetIndex = targetIndex;
			}
		}, 50) as unknown as number;
	}

	function performReorder() {
		if (
			draggedIndex !== null &&
			dropTargetIndex !== null &&
			draggedIndex !== dropTargetIndex
		) {
			const newOrder = [...items];
			const [moved] = newOrder.splice(draggedIndex, 1);
			newOrder.splice(dropTargetIndex, 0, moved);
			items = newOrder;
			return true;
		}
		return false;
	}

	function cleanup() {
		if (dragEnterTimeout) {
			clearTimeout(dragEnterTimeout);
			dragEnterTimeout = null;
		}
		draggedIndex = null;
		dropTargetIndex = null;
		isDropped = false;
	}
</script>

{#each items as item, index (key(item))}
	<div
		animate:flip={{ duration: flipDuration }}
		draggable="true"
		role="option"
		tabindex={0}
		aria-selected={true}
		class="h-full w-full cursor-grab"
		ondragstart={(e) => {
			e.dataTransfer?.setData('text/plain', index.toString());
			e.dataTransfer!.effectAllowed = 'move';
			draggedIndex = index;
			dropTargetIndex = null;
			originalOrder = [...items];
			isDropped = false;
		}}
		ondragenter={(e) => {
			e.preventDefault();

			// Don't process if dragging over self
			if (draggedIndex === index) return;

			handleDragEnter(index);
		}}
		ondragover={(e) => {
			e.preventDefault();
			e.dataTransfer!.dropEffect = 'move';
		}}
		ondrop={(e) => {
			e.preventDefault();
			isDropped = true;

			// Perform the actual reorder on drop
			const reordered = performReorder();
			if (!reordered && !isDropped) {
				// Restore original order if drop failed
				items = originalOrder;
			}
		}}
		ondragend={() => {
			// Clean up and restore original order if not properly dropped
			if (!isDropped) {
				items = originalOrder;
			}
			cleanup();
		}}
		ondragleave={(e) => {
			// Only reset drop target if we're leaving for a non-child element
			const rect = e.currentTarget.getBoundingClientRect();
			const x = e.clientX;
			const y = e.clientY;

			// Check if we're actually leaving the element bounds
			if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
				// Small delay to prevent flickering when moving between child elements
				setTimeout(() => {
					if (dropTargetIndex === index) {
						dropTargetIndex = null;
					}
				}, 100);
			}
		}}
	>
		{@render children?.({ item, index, draggedIndex, dropTargetIndex })}
	</div>
{/each}

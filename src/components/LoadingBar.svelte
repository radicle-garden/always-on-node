<script lang="ts">
  import { navigating } from "$app/state";

  let isNavigating = $derived(navigating.to !== null);
</script>

<div
  role="progressbar"
  aria-label="Page loading"
  class="loading-bar"
  class:visible={isNavigating}>
</div>

<style>
  .loading-bar {
    height: 0.125rem;
    background-color: var(--color-surface-brand-primary);
    width: 0%;
    opacity: 0;
    position: fixed;
    top: 0;
    left: 0;
    z-index: 10;
    transition: width 2s ease;
  }

  .visible {
    opacity: 1;
    width: 100%;
  }
</style>

<script lang="ts">
  let { color }: { color?: string } = $props();
</script>

<div
  class="throb h-2 w-2 rounded-xs"
  style:--throbber-color={color ?? "var(--color-badge-success-base)"}>
</div>

<style>
  @keyframes throb {
    0% {
      transform: scale(1);
      box-shadow: 0 0 rgb(from var(--throbber-color) r g b / 0.5);
    }

    70% {
      transform: scale(1.25);
      box-shadow: 0 0 0 2.5px transparent;
    }
    100% {
      transform: scale(1);
      box-shadow: 0 0 transparent;
    }
  }
  .throb {
    animation: throb 1.5s infinite;
    background-color: var(--throbber-color);
  }
</style>

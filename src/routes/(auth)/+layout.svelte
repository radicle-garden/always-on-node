<script lang="ts">
  let { children } = $props();
</script>

<div
  class="flex min-h-screen flex-col items-center justify-center text-text-primary">
  <img
    src="/img/bg/auth.png"
    alt="Background"
    class="absolute top-0 left-0 h-screen w-screen object-cover" />
  <div class="relative z-10">
    {@render children()}
  </div>
</div>

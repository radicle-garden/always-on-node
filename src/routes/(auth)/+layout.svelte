<script lang="ts">
  let { children } = $props();
</script>

<div
  class="mx-2 flex min-h-screen flex-col items-center justify-center text-text-primary sm:mx-0">
  <img
    src="/img/bg/auth.png"
    alt="Background"
    class="absolute top-0 left-0 h-screen w-screen object-cover" />
  <div class="relative z-10 w-full sm:mx-0 sm:w-auto">
    {@render children()}
  </div>
</div>

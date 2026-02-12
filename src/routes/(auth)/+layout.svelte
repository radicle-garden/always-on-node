<script lang="ts">
  let { children } = $props();
</script>

<div
  class="flex min-h-screen flex-col items-center justify-center bg-[url('/img/bg/auth.png')] bg-cover bg-center p-2 text-text-primary">
  <div class="w-full sm:w-auto">
    {@render children()}
  </div>
</div>

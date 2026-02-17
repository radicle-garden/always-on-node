<script lang="ts">
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import Footer from "$components/Footer.svelte";
  import LogoText from "$components/LogoText.svelte";
  import { Button } from "$lib/components/ui/button";

  let { children } = $props();
  let authlessRoutes = ["/privacy", "/terms"];
  let isAuthless = authlessRoutes.includes(page.url.pathname) && page.data.user;
</script>

<div
  class="flex w-full flex-col items-center justify-center px-4 pb-12 sm:px-16">
  <div class="flex w-full max-w-285 flex-col items-center">
    <div class="mb-24 flex w-full items-center py-4">
      <a href={resolve("/")}>
        <LogoText />
      </a>
      <div class="ml-auto flex items-center gap-4" class:hidden={isAuthless}>
        <Button href={resolve("/login")} variant="outline">Log in</Button>
        <Button href={resolve("/register")} variant="primary">
          Get started
        </Button>
      </div>
    </div>
    <div class="w-full">
      {@render children()}
    </div>
    <Footer />
  </div>
</div>

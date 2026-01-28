<script lang="ts">
  import { page } from "$app/state";
  import Header from "$components/Header.svelte";
  import Icon from "$components/Icon.svelte";
  import Throbber from "$components/Throbber.svelte";
  import { Toaster } from "$lib/components/ui/sonner";

  let { children, data } = $props();

  const breadcrumbs = $derived.by(() => {
    const path = page.url.pathname;
    switch (path) {
      case "/settings":
        return [
          {
            label: "Settings",
            href: "/settings",
          },
        ];
      case "/help":
        return [
          {
            label: "Help",
            href: "/help",
          },
        ];
      default:
        return [
          {
            label: "Dashboard",
            href: "/",
          },
        ];
    }
  });
</script>

{#snippet toasterLoadingIcon()}<Throbber />{/snippet}
{#snippet toasterSuccessIcon()}<Icon name="checkmark" />{/snippet}
{#snippet toasterErrorIcon()}<Icon name="cross" />{/snippet}

<Toaster
  toastOptions={{
    style: "border-radius: var(--radius-sm);",
  }}
  loadingIcon={toasterLoadingIcon}
  successIcon={toasterSuccessIcon}
  errorIcon={toasterErrorIcon} />

<div class="flex min-h-screen flex-col items-center bg-surface-base">
  <header class="min-h-16 w-full px-4 py-2">
    <Header user={data.user} {breadcrumbs} />
  </header>
  <main
    class="relative flex w-full items-center justify-center overflow-y-auto p-6 text-text-primary md:p-0">
    <div class="w-full max-w-[700px]">
      {@render children()}
    </div>
  </main>
</div>

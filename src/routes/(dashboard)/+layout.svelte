<script lang="ts">
  import { page } from "$app/state";
  import Header from "$components/Header.svelte";
  import Icon from "$components/Icon.svelte";
  import LoadingBar from "$components/LoadingBar.svelte";
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

<LoadingBar />

<div class="flex min-h-screen flex-col items-center bg-surface-base pb-8">
  <header
    class="mb-0 min-h-11 w-full border-b border-border-subtle px-4 py-2 sm:mb-20">
    <Header user={data.user} {breadcrumbs} fqdn={data.fqdn} />
  </header>
  <main
    class="relative flex w-full items-center justify-center overflow-y-auto p-6 text-text-primary md:p-0">
    <div class="w-full max-w-[700px]">
      {@render children()}
    </div>
  </main>
</div>

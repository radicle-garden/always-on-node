<script lang="ts">
  import Icon from "$components/Icon.svelte";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { Button } from "$lib/components/ui/button";
  import * as ToggleGroup from "$lib/components/ui/toggle-group";

  import { setMode, userPrefersMode } from "mode-watcher";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  let subscriptionStatus = $derived(data.subscriptionStatus);
  let stripePriceId = $derived(data.stripePriceId);

  let mounted = $state(false);
  let themeValue = $state<"light" | "dark" | "system">("system");

  $effect(() => {
    mounted = true;
    if (userPrefersMode.current) {
      themeValue = userPrefersMode.current;
    }
  });

  function handleThemeChange(value: string | undefined) {
    if (value) {
      themeValue = value as "light" | "dark" | "system";
      setMode(value as "light" | "dark" | "system");
    } else {
      themeValue = userPrefersMode.current ?? "system";
    }
  }

  async function handlePortal() {
    try {
      const response = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create portal session");
      }

      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      console.error(e);
    }
  }

  async function handleCheckout() {
    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: stripePriceId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      window.location.href = data.url;
    } catch (e) {
      console.error(e);
    }
  }
</script>

<div class="flex flex-col gap-8" class:invisible={!mounted}>
  <div class="flex flex-col gap-2">
    <div class="txt-heading-m">Plan</div>
    <div
      class="flex w-full flex-col items-start gap-4 border border-border-subtle bg-surface-canvas p-6 sm:flex-row">
      <div class="flex flex-col gap-2">
        <div class="txt-heading-xl">Garden</div>
        <div class="txt-body-m-regular text-text-secondary">Always on node</div>
      </div>
      <div class="ml-auto">
        {#if subscriptionStatus?.hasSubscription}
          <Button onclick={handlePortal}>
            Manage subscription
            <Icon name="open-external" />
          </Button>
        {:else}
          <Button onclick={handleCheckout}>
            Start your free trial
            <Icon name="open-external" />
          </Button>
        {/if}
      </div>
    </div>
  </div>
  <div class="divider"></div>
  <div class="flex items-center">
    <div class="txt-heading-m">Theme</div>
    <div class="ml-auto flex gap-2">
      <ToggleGroup.Root
        type="single"
        onValueChange={handleThemeChange}
        class="txt-body-m-regular gap-4"
        bind:value={themeValue}>
        <ToggleGroup.Item value="light" aria-label="Light theme">
          Light
        </ToggleGroup.Item>
        <ToggleGroup.Item value="dark" aria-label="Dark theme">
          Dark
        </ToggleGroup.Item>
        <ToggleGroup.Item value="system" aria-label="System theme">
          System
        </ToggleGroup.Item>
      </ToggleGroup.Root>
    </div>
  </div>
  <div class="divider"></div>
  <div class="flex flex-col gap-4">
    <div class="txt-heading-m">Account</div>
    <div class="flex flex-col items-start gap-4 sm:flex-row">
      <div class="flex flex-col gap-2">
        <div class="txt-body-m-semibold">Delete account</div>
        <div class="txt-body-m-regular text-text-secondary">
          Permanently delete your account and all data.
        </div>
      </div>
      <div class="ml-auto">
        <AlertDialog.Root>
          <AlertDialog.Trigger>
            <Button variant="destructiveSecondary">Delete account</Button>
          </AlertDialog.Trigger>
          <AlertDialog.Content>
            <AlertDialog.Title>Not implemented</AlertDialog.Title>
            <AlertDialog.Description>
              This feature is not yet available.
            </AlertDialog.Description>
            <AlertDialog.Footer>
              <AlertDialog.Cancel>Ok</AlertDialog.Cancel>
            </AlertDialog.Footer>
          </AlertDialog.Content>
        </AlertDialog.Root>
      </div>
    </div>
  </div>
</div>

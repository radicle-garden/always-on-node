<script lang="ts">
  import { enhance } from "$app/forms";
  import Icon from "$components/Icon.svelte";
  import { Button } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import * as ToggleGroup from "$lib/components/ui/toggle-group";

  import { setMode, userPrefersMode } from "mode-watcher";

  import type { ActionData, PageData } from "./$types";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let subscriptionStatus = $derived(data.subscriptionStatus);
  let stripePriceId = $derived(data.stripePriceId);
  let canDeleteAccount = $derived(data.canDeleteAccount);

  let deletePassword = $state("");
  let isDeleting = $state(false);
  let deleteDialogOpen = $state(false);

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
          <Button onclick={handleCheckout} variant="primary">
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
        <Dialog.Root bind:open={deleteDialogOpen}>
          <Dialog.Trigger
            onclick={e => {
              e.stopPropagation();
              e.preventDefault();
              if (canDeleteAccount.canDelete) {
                deleteDialogOpen = true;
              } else {
                deleteDialogOpen = false;
              }
            }}
            title={canDeleteAccount.reason}>
            <Button
              variant="destructiveSecondary"
              disabled={!canDeleteAccount.canDelete}>
              Delete account
            </Button>
          </Dialog.Trigger>
          <Dialog.Content class="flex flex-col gap-4">
            <div class="txt-body-l-semibold">Delete your account?</div>
            <div>
              This will permanently delete your account. Enter your password to
              confirm.
            </div>
            <form
              method="POST"
              action="?/deleteAccount"
              use:enhance={() => {
                isDeleting = true;
                return async ({ update }) => {
                  await update();
                  isDeleting = false;
                };
              }}
              class="mt-4 flex flex-col gap-4">
              <div class="grid gap-2">
                <Label for="delete-password">Password</Label>
                <Input
                  id="delete-password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  bind:value={deletePassword}
                  required />
              </div>
              {#if form?.deleteError}
                <div class="text-sm text-feedback-error-text">
                  {form.deleteError}
                </div>
              {/if}
              <Dialog.Footer class="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  onclick={() => {
                    deleteDialogOpen = false;
                    deletePassword = "";
                  }}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={isDeleting || !deletePassword}>
                  {isDeleting ? "Deleting..." : "Delete account"}
                </Button>
              </Dialog.Footer>
            </form>
          </Dialog.Content>
        </Dialog.Root>
      </div>
    </div>
  </div>
</div>

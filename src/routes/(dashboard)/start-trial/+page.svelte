<script lang="ts">
  import Icon from "$components/Icon.svelte";
  import { Button } from "$lib/components/ui/button";

  import type { PageData } from "./$types";

  const { data }: { data: PageData } = $props();

  let loading = $state(false);

  async function handleCheckout() {
    loading = true;

    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: data.stripePriceId }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(
          responseData.error || "Failed to create checkout session",
        );
      }

      window.location.href = responseData.url;
    } catch {
      loading = false;
    }
  }
</script>

<div
  class="flex min-h-[calc(100vh-15.5rem)] items-center justify-center bg-surface-base">
  <div
    class="flex w-full flex-col gap-4 bg-surface-canvas p-3 sm:w-175 sm:flex-row">
    <div class="flex flex-col">
      <div>
        <div class="txt-heading-m">Get started with Garden</div>
        <div class="txt-body-m-regular">
          You need to start a free trial to begin
        </div>
      </div>
      <div class="mt-4 sm:mt-auto">
        <Button variant="primary" onclick={handleCheckout} disabled={loading}>
          {#if loading}
            Loading…
          {:else}
            Start your 7 day free trial <Icon name="arrow-right" />
          {/if}
        </Button>
      </div>
    </div>
    <img
      src="/img/bg/trial.png"
      class="h-75 w-full object-cover sm:ml-auto sm:w-75"
      alt="Trial" />
  </div>
</div>

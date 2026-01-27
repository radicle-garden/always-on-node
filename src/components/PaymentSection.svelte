<script lang="ts">
  import Icon from "./Icon.svelte";

  interface Props {
    subscriptionStatus: {
      hasSubscription: boolean;
      status: string | null;
      trialEnd: Date | null;
      currentPeriodEnd: Date | null;
      cancelAtPeriodEnd: boolean;
      cancelAt: Date | null;
    } | null;
    stripePriceId: string;
  }

  let { subscriptionStatus, stripePriceId }: Props = $props();

  let loading = $state(false);

  async function handleCheckout() {
    loading = true;

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
    } catch {
      loading = false;
    }
  }

  function formatDate(date: Date | null): string {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
</script>

{#snippet title()}
  {#if !subscriptionStatus?.hasSubscription}
    Free trial
  {:else if subscriptionStatus?.status === "past_due"}
    Payment overdue
  {:else if subscriptionStatus?.status === "canceled"}
    Subscription canceled
  {:else if subscriptionStatus?.trialEnd}
    Free trial
  {/if}
{/snippet}

{#snippet description()}
  {#if !subscriptionStatus?.hasSubscription}
    Get 7 days free to try out Radicle Garden.
  {:else if subscriptionStatus?.status === "past_due"}
    Your payment has failed and your node has been stopped. Please update your
    payment method to reactivate your subscription.
  {:else if subscriptionStatus?.status === "canceled"}
    Your subscription has been canceled and your node has been stopped. Your
    data is preserved if you choose to resubscribe.
  {:else if subscriptionStatus?.trialEnd}
    Your free trial ends on {formatDate(subscriptionStatus.trialEnd)}.
  {/if}
{/snippet}

<div class="flex rounded-md bg-brand-hover p-3 text-text-on-brand">
  <div class="flex flex-col p-1">
    <div class="flex flex-col">
      <div class="txt-heading-m">
        {@render title()}
      </div>
      <div class="txt-body-m-medium">
        {@render description()}
      </div>
    </div>
    {#if !subscriptionStatus?.hasSubscription}
      <a
        href="#top"
        class="txt-body-m-semibold mt-auto flex items-center gap-1"
        onclick={e => {
          e.stopPropagation();
          e.preventDefault();
          handleCheckout();
        }}>
        {#if loading}
          Loading…
        {:else}
          Start trial <Icon name="arrow-right" />
        {/if}
      </a>
    {/if}
  </div>
  <img
    src="/img/bg/trial.png"
    class="ml-auto h-24 w-24 object-cover"
    alt="Trial" />
</div>

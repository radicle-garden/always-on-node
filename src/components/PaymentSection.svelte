<script lang="ts">
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import { Card } from "$lib/components/ui/card";

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
  let error = $state<string | null>(null);

  async function handleCheckout() {
    loading = true;
    error = null;

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
      error = e instanceof Error ? e.message : "Something went wrong";
      loading = false;
    }
  }

  async function handlePortal() {
    loading = true;
    error = null;

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
      loading = false;
    } catch (e) {
      error = e instanceof Error ? e.message : "Something went wrong";
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

  function getStatusBadge(status: string | null, cancelAtPeriodEnd: boolean) {
    if (cancelAtPeriodEnd)
      return { variant: "secondary" as const, text: "Ending Soon" };
    if (status === "active")
      return { variant: "success" as const, text: "Active" };
    if (status === "trialing")
      return { variant: "default" as const, text: "Trial" };
    if (status === "past_due")
      return { variant: "destructive" as const, text: "Past Due" };
    if (status === "canceled")
      return { variant: "secondary" as const, text: "Canceled" };
    return { variant: "secondary" as const, text: status || "Unknown" };
  }
</script>

<Card class="px-4 py-4">
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold">Subscription</h3>
      {#if subscriptionStatus?.hasSubscription}
        {@const badge = getStatusBadge(
          subscriptionStatus.status,
          subscriptionStatus.cancelAtPeriodEnd,
        )}
        <Badge variant={badge.variant}>
          {badge.text}
        </Badge>
      {/if}
    </div>

    {#if error}
      <div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
        {error}
      </div>
    {/if}

    {#if !subscriptionStatus?.hasSubscription}
      <div class="flex flex-col gap-3">
        <p class="text-sm text-muted-foreground">
          Subscribe to activate your Radicle node and start seeding
          repositories.
        </p>
        <div class="flex flex-col gap-2 rounded-md bg-muted p-3">
          <div class="flex items-center justify-between">
            <span class="text-sm">Monthly subscription</span>
            <span class="font-semibold">€10/month</span>
          </div>
          <div class="flex items-center gap-2 text-sm text-muted-foreground">
            <span>7-day free trial</span>
          </div>
        </div>
        <Button onclick={handleCheckout} disabled={loading}>
          {loading ? "Loading..." : "Start Free Trial"}
        </Button>
      </div>
    {:else}
      <div class="flex flex-col gap-3">
        {#if subscriptionStatus.cancelAtPeriodEnd && subscriptionStatus.currentPeriodEnd && new Date(subscriptionStatus.currentPeriodEnd) > new Date()}
          <div class="rounded-md bg-amber-50 p-3 dark:bg-amber-950/30">
            <p class="text-sm font-medium text-amber-900 dark:text-amber-100">
              Subscription Ending Soon
            </p>
            <p class="mt-1 text-sm text-amber-800 dark:text-amber-200">
              {#if subscriptionStatus.status === "trialing" && subscriptionStatus.trialEnd}
                Your subscription will end when your trial expires on {formatDate(
                  subscriptionStatus.trialEnd,
                )}. Your node will be stopped at that time.
              {:else if subscriptionStatus.currentPeriodEnd}
                Your subscription will end on {formatDate(
                  subscriptionStatus.currentPeriodEnd,
                )}. Your node will be stopped at that time.
              {:else}
                Your subscription is set to cancel at the end of the current
                period.
              {/if}
            </p>
          </div>
        {:else if subscriptionStatus.status === "trialing" && subscriptionStatus.trialEnd}
          <p class="text-sm">
            Your trial ends on {formatDate(subscriptionStatus.trialEnd)}
          </p>
        {:else if subscriptionStatus.status === "active" && subscriptionStatus.currentPeriodEnd}
          <p class="text-sm">
            Next billing date: {formatDate(subscriptionStatus.currentPeriodEnd)}
          </p>
        {:else if subscriptionStatus.status === "past_due"}
          <div class="rounded-md bg-destructive/10 p-3">
            <p class="text-sm font-medium text-destructive">Payment Failed</p>
            <p class="mt-1 text-sm text-destructive/90">
              Your payment has failed. Your node has been stopped. Please update
              your payment method to reactivate your subscription.
            </p>
          </div>
        {:else if subscriptionStatus.status === "canceled"}
          <div class="rounded-md bg-muted p-3">
            <p class="text-sm font-medium">Subscription Canceled</p>
            <p class="mt-1 text-sm text-muted-foreground">
              Your subscription has been canceled and your node has been
              stopped. Your data is preserved if you choose to resubscribe.
            </p>
          </div>
        {/if}

        {#if subscriptionStatus.status === "canceled"}
          <Button onclick={handleCheckout} disabled={loading}>
            {loading ? "Loading..." : "Resubscribe"}
          </Button>
        {:else}
          <Button onclick={handlePortal} variant="outline" disabled={loading}>
            {loading ? "Loading..." : "Manage Subscription"}
          </Button>

          <p class="text-xs text-muted-foreground">
            Update payment method, view invoices, or cancel subscription
          </p>
        {/if}
      </div>
    {/if}
  </div>
</Card>

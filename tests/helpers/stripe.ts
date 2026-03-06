/**
 * Shared Stripe test factories used by both unit and e2e test suites.
 *
 * These are pure data builders with no framework dependencies.
 * Return types use Stripe SDK types so TypeScript catches schema drift
 * when the stripe package is updated.
 */
import type Stripe from "stripe";

/** Builds a StripeConfig that targets STRIPE_API_BASE when set (e.g. stripe-mock). */
export function buildStripeClientConfig(): Stripe.StripeConfig {
  const cfg: Stripe.StripeConfig = { apiVersion: "2026-01-28.clover" };
  const apiBase = process.env.STRIPE_API_BASE;
  if (apiBase) {
    const u = new URL(apiBase);
    cfg.host = u.hostname;
    cfg.port = parseInt(u.port, 10);
    cfg.protocol = u.protocol.replace(":", "") as "http" | "https";
  }
  return cfg;
}

/** Builds a Stripe Event-shaped object. */
export function buildStripeEvent(
  type: string,
  data: object,
  overrides?: { id?: string },
): Stripe.Event {
  return {
    id: overrides?.id ?? `evt_test_${Date.now()}`,
    object: "event",
    type,
    data: { object: data },
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 1,
    api_version: "2026-01-28.clover",
    request: null,
  } as Stripe.Event;
}

/** Builds a Stripe Subscription-shaped object. */
export function buildSubscriptionPayload(overrides: {
  id?: string;
  customerId?: string;
  userId?: string;
  status?: Stripe.Subscription.Status;
  priceId?: string;
  trialEnd?: number | null;
  cancelAtPeriodEnd?: boolean;
  cancelAt?: number | null;
  canceledAt?: number | null;
  trialStart?: number | null;
  currentPeriodStart?: number;
  currentPeriodEnd?: number;
  metadata?: Stripe.Metadata;
}): Stripe.Subscription {
  const now = Math.floor(Date.now() / 1000);
  return {
    id: overrides.id ?? "sub_test_123",
    object: "subscription",
    customer: overrides.customerId ?? "cus_test_456",
    status: overrides.status ?? "trialing",
    metadata: overrides.metadata ?? {
      user_id: overrides.userId ?? "42",
    },
    items: {
      object: "list",
      data: [
        {
          id: "si_test_123",
          object: "subscription_item",
          price: {
            id: overrides.priceId ?? "price_mock_test_id",
          } as Stripe.Price,
          current_period_start: overrides.currentPeriodStart ?? now,
          current_period_end:
            overrides.currentPeriodEnd ?? now + 30 * 24 * 60 * 60,
        } as Stripe.SubscriptionItem,
      ],
    } as Stripe.ApiList<Stripe.SubscriptionItem>,
    cancel_at_period_end: overrides.cancelAtPeriodEnd ?? false,
    cancel_at: overrides.cancelAt ?? null,
    canceled_at: overrides.canceledAt ?? null,
    trial_start:
      overrides.trialEnd != null
        ? (overrides.trialStart ?? now)
        : (overrides.trialStart ?? null),
    trial_end: overrides.trialEnd ?? null,
  } as Stripe.Subscription;
}

export const THIRTY_DAYS_IN_SECONDS = 30 * 24 * 60 * 60;
export const ONE_WEEK_IN_SECONDS = 7 * 24 * 60 * 60;
export const NOW_IN_SECONDS = Math.floor(Date.now() / 1000);
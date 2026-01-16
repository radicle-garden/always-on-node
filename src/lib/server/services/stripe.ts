import { and, eq } from "drizzle-orm";
import Stripe from "stripe";

import { config } from "../config";
import { getDb, schema } from "../db";
import type { User } from "../db/schema";

import { nodesService } from "./nodes";

interface ServiceResult<T> {
  success: boolean;
  content?: T;
  error?: string;
  message?: string;
  statusCode: number;
}

interface SubscriptionStatus {
  hasSubscription: boolean;
  status: string | null;
  trialEnd: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  cancelAt: Date | null;
}

// Initialize Stripe client
const stripe = new Stripe(config.stripeSecretKey, {
  apiVersion: "2025-12-15.clover",
});

async function getOrCreateStripeCustomer(
  user: User,
): Promise<ServiceResult<string>> {
  try {
    const db = await getDb();

    // Check if customer exists in DB
    const existingCustomer = await db.query.stripeCustomers.findFirst({
      where: eq(schema.stripeCustomers.user_id, user.id),
    });

    if (existingCustomer) {
      return {
        success: true,
        content: existingCustomer.stripe_customer_id,
        statusCode: 200,
      };
    }

    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.handle,
      metadata: {
        user_id: user.id.toString(),
      },
    });

    // Save to database
    await db.insert(schema.stripeCustomers).values({
      user_id: user.id,
      stripe_customer_id: customer.id,
    });

    console.log(`[Stripe] Created customer ${customer.id} for user ${user.id}`);

    return {
      success: true,
      content: customer.id,
      statusCode: 200,
    };
  } catch (error) {
    console.error("[Stripe] Failed to get or create customer:", error);
    return {
      success: false,
      error: "Failed to create customer",
      statusCode: 500,
    };
  }
}

async function createCheckoutSession(
  userId: number,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
): Promise<ServiceResult<string>> {
  try {
    const db = await getDb();

    // Get user
    const user = await db.query.users.findFirst({
      where: and(eq(schema.users.id, userId), eq(schema.users.deleted, false)),
    });

    if (!user) {
      return { success: false, error: "User not found", statusCode: 404 };
    }

    // Get or create Stripe customer
    const customerResult = await getOrCreateStripeCustomer(user);
    if (!customerResult.success || !customerResult.content) {
      return {
        success: false,
        error: "Failed to create customer",
        statusCode: 500,
      };
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerResult.content,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          user_id: userId.toString(),
        },
      },
      payment_method_collection: "always",
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    console.log(
      `[Stripe] Created checkout session ${session.id} for user ${userId}`,
    );

    return {
      success: true,
      content: session.url || "",
      statusCode: 200,
    };
  } catch (error) {
    console.error("[Stripe] Failed to create checkout session:", error);
    return {
      success: false,
      error: "Failed to create checkout session",
      statusCode: 500,
    };
  }
}

async function createCustomerPortalSession(
  userId: number,
  returnUrl: string,
): Promise<ServiceResult<string>> {
  try {
    const db = await getDb();

    // Get Stripe customer ID
    const customer = await db.query.stripeCustomers.findFirst({
      where: eq(schema.stripeCustomers.user_id, userId),
    });

    if (!customer) {
      return {
        success: false,
        error: "No Stripe customer found",
        statusCode: 404,
      };
    }

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.stripe_customer_id,
      return_url: returnUrl,
    });

    console.log(`[Stripe] Created portal session for user ${userId}`);

    return {
      success: true,
      content: session.url,
      statusCode: 200,
    };
  } catch (error) {
    console.error("[Stripe] Failed to create portal session:", error);
    return {
      success: false,
      error: "Failed to create portal session",
      statusCode: 500,
    };
  }
}

async function syncSubscriptionFromStripe(
  subscriptionId: string,
): Promise<void> {
  const db = await getDb();

  try {
    // Fetch subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Find customer in DB
    const customer = await db.query.stripeCustomers.findFirst({
      where: eq(
        schema.stripeCustomers.stripe_customer_id,
        subscription.customer as string,
      ),
    });

    if (!customer) {
      console.error(
        `[Stripe] Customer not found for subscription ${subscriptionId}`,
      );
      return;
    }

    // Check if subscription exists in DB
    const existingSubscription = await db.query.stripeSubscriptions.findFirst({
      where: eq(
        schema.stripeSubscriptions.stripe_subscription_id,
        subscriptionId,
      ),
    });

    // Access billing period from subscription items (Stripe moved these fields to item level)
    if (!subscription.items.data || subscription.items.data.length === 0) {
      console.error(
        `[Stripe] No items found in subscription ${subscriptionId}`,
      );
      return;
    }

    const firstItem = subscription.items.data[0];
    const subscriptionData = {
      stripe_customer_id: customer.id,
      stripe_subscription_id: subscription.id,
      stripe_price_id: firstItem.price.id,
      status: subscription.status,
      current_period_start: firstItem.current_period_start
        ? new Date(firstItem.current_period_start * 1000)
        : new Date(),
      current_period_end: firstItem.current_period_end
        ? new Date(firstItem.current_period_end * 1000)
        : new Date(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      cancel_at: subscription.cancel_at
        ? new Date(subscription.cancel_at * 1000)
        : null,
      canceled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000)
        : null,
      trial_start: subscription.trial_start
        ? new Date(subscription.trial_start * 1000)
        : null,
      trial_end: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null,
      updated_at: new Date(),
    };

    if (existingSubscription) {
      await db
        .update(schema.stripeSubscriptions)
        .set(subscriptionData)
        .where(eq(schema.stripeSubscriptions.id, existingSubscription.id));
    } else {
      await db.insert(schema.stripeSubscriptions).values(subscriptionData);
    }
  } catch (error) {
    console.error(
      `[Stripe] Failed to sync subscription ${subscriptionId}:`,
      error,
    );
  }
}

async function handleWebhookEvent(
  event: Stripe.Event,
): Promise<ServiceResult<void>> {
  const db = await getDb();

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await syncSubscriptionFromStripe(subscription.id);

        // Start containers if subscription is active or trialing
        if (
          subscription.status === "active" ||
          subscription.status === "trialing"
        ) {
          const userId = Number(subscription.metadata.user_id);
          if (!userId || isNaN(userId)) {
            console.error(
              `[Stripe] Invalid or missing user_id in subscription metadata: ${subscription.metadata.user_id}`,
            );
            break;
          }

          console.log(
            `[Stripe] Activating node for user ${userId} (subscription ${subscription.status})`,
          );
          const result = await nodesService.ensureNodeActiveForUser(userId);
          if (!result.success) {
            console.error(
              `[Stripe] Failed to activate node for user ${userId}: ${result.error}`,
            );
            // Note: We don't fail the webhook here because the subscription
            // has already been synced to the database. Returning 500 would
            // cause Stripe to retry, but the subscription state is correct.
            // Container failures should be handled through monitoring/alerts.
          }
        }

        // Stop containers if subscription is canceled or past_due
        if (
          subscription.status === "canceled" ||
          subscription.status === "past_due"
        ) {
          const userId = Number(subscription.metadata.user_id);
          if (!userId || isNaN(userId)) {
            console.error(
              `[Stripe] Invalid or missing user_id in subscription metadata: ${subscription.metadata.user_id}`,
            );
            break;
          }

          console.log(
            `[Stripe] Stopping containers for user ${userId} (subscription ${subscription.status})`,
          );
          const user = await db.query.users.findFirst({
            where: eq(schema.users.id, userId),
          });

          if (!user) {
            console.error(`[Stripe] User ${userId} not found`);
            break;
          }

          const result = await nodesService.stopContainers(user);
          if (!result.success) {
            console.error(
              `[Stripe] Failed to stop containers for user ${userId}: ${result.error}`,
            );
            // Note: Subscription state already synced - don't fail webhook
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await syncSubscriptionFromStripe(subscription.id);

        // Stop containers
        const userId = Number(subscription.metadata.user_id);
        if (!userId || isNaN(userId)) {
          console.error(
            `[Stripe] Invalid or missing user_id in subscription metadata: ${subscription.metadata.user_id}`,
          );
          break;
        }

        console.log(
          `[Stripe] Stopping containers for user ${userId} (subscription deleted)`,
        );
        const user = await db.query.users.findFirst({
          where: eq(schema.users.id, userId),
        });

        if (!user) {
          console.error(`[Stripe] User ${userId} not found`);
          break;
        }

        const result = await nodesService.stopContainers(user);
        if (!result.success) {
          console.error(
            `[Stripe] Failed to stop containers for user ${userId}: ${result.error}`,
          );
          // Note: Subscription state already synced - don't fail webhook
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.warn(
          `[Stripe] Payment failed for customer ${invoice.customer}`,
        );
        // Could send email notification here
        break;
      }

      case "customer.subscription.trial_will_end": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(
          `[Stripe] Trial ending soon for subscription ${subscription.id}`,
        );
        // Could send email notification here
        break;
      }

      default:
        console.log(`[Stripe] No handler implemented for event: ${event.type}`);
    }

    return { success: true, statusCode: 200 };
  } catch (error) {
    console.error(`[Stripe] Webhook handler error:`, error);
    return {
      success: false,
      error: "Webhook handler failed",
      statusCode: 500,
    };
  }
}

async function getSubscriptionStatus(
  userId: number,
): Promise<ServiceResult<SubscriptionStatus>> {
  try {
    const db = await getDb();

    // Get user's Stripe customer
    const customer = await db.query.stripeCustomers.findFirst({
      where: eq(schema.stripeCustomers.user_id, userId),
      with: {
        subscriptions: true,
      },
    });

    if (!customer || customer.subscriptions.length === 0) {
      return {
        success: true,
        content: {
          hasSubscription: false,
          status: null,
          trialEnd: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          cancelAt: null,
        },
        statusCode: 200,
      };
    }

    // Get the most recent subscription
    const subscription = customer.subscriptions.sort(
      (a, b) => b.created_at.getTime() - a.created_at.getTime(),
    )[0];

    return {
      success: true,
      content: {
        hasSubscription: true,
        status: subscription.status,
        trialEnd: subscription.trial_end,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd:
          subscription.cancel_at_period_end || !!subscription.cancel_at,
        cancelAt: subscription.cancel_at,
      },
      statusCode: 200,
    };
  } catch (error) {
    console.error("[Stripe] Failed to get subscription status:", error);
    return {
      success: false,
      error: "Failed to get subscription status",
      statusCode: 500,
    };
  }
}

export const stripeService = {
  getOrCreateStripeCustomer,
  createCheckoutSession,
  createCustomerPortalSession,
  handleWebhookEvent,
  getSubscriptionStatus,
  syncSubscriptionFromStripe,
};

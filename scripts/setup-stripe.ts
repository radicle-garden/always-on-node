#!/usr/bin/env -S node

import * as dotenv from "dotenv";
import * as path from "path";
import Stripe from "stripe";

dotenv.config({ path: path.join(process.cwd(), ".env"), quiet: true });

const stripe = new Stripe(process.env.STRIPE_SECRET_SERVER_SIDE_KEY || "", {
  apiVersion: "2026-01-28.clover",
});

const PRODUCT_NAME = "Radicle Garden";

interface SetupResult {
  productId: string;
  priceId: string;
  webhookEndpointId: string;
  webhookSecret: string;
}

async function setupStripe(): Promise<SetupResult> {
  console.log("🚀 Setting up Stripe...\n");

  const existingProducts = await stripe.products.search({
    query: `name:"${PRODUCT_NAME}"`,
  });

  let product: Stripe.Product;
  if (existingProducts.data.length > 0) {
    product = existingProducts.data[0];
    console.log(`✅ Found existing product: ${product.id}`);
  } else {
    product = await stripe.products.create({
      name: PRODUCT_NAME,
      description: `Monthly subscription for ${PRODUCT_NAME} with 7-day trial`,
      metadata: {
        environment: process.env.NODE_ENV || "development",
      },
    });
    console.log(`✅ Created product: ${product.id}`);
  }

  const existingPrices = await stripe.prices.list({
    product: product.id,
    active: true,
  });

  let price: Stripe.Price;
  if (existingPrices.data.length > 0) {
    price = existingPrices.data[0];
    console.log(`✅ Found existing price: ${price.id}`);
  } else {
    price = await stripe.prices.create({
      product: product.id,
      currency: "eur",
      recurring: {
        interval: "month",
        trial_period_days: 7,
      },
      unit_amount: 499, // 4.99 EUR in cents.
      metadata: {
        environment: process.env.NODE_ENV || "development",
      },
    });
    console.log(`✅ Created price: ${price.id} (€4.99/month with 7-day trial)`);
  }

  const webhookUrl =
    process.env.WEBHOOK_URL || "http://localhost:5173/api/stripe/webhook";
  const isLocalhost =
    webhookUrl.includes("localhost") || webhookUrl.includes("127.0.0.1");

  let webhook: Stripe.WebhookEndpoint | null = null;
  let webhookSecret = "";

  if (isLocalhost) {
    console.log(
      "🏠 Skipping webhook registration (localhost URL detected) 👉 for local development, use Stripe CLI to forward webhooks",
    );
  } else {
    const existingWebhooks = await stripe.webhookEndpoints.list();
    const matchingWebhook = existingWebhooks.data.find(
      wh => wh.url === webhookUrl,
    );

    if (matchingWebhook) {
      webhook = matchingWebhook;
      webhookSecret = webhook.secret || "";
      console.log(`✅ Found existing webhook: ${webhook.id}`);
    } else {
      webhook = await stripe.webhookEndpoints.create({
        url: webhookUrl,
        enabled_events: [
          "customer.subscription.created",
          "customer.subscription.updated",
          "customer.subscription.deleted",
          "invoice.payment_failed",
          "customer.subscription.trial_will_end",
        ],
        api_version: "2026-01-28.clover",
      });
      webhookSecret = webhook.secret || "";
      console.log(`✅ Created webhook: ${webhook.id}`);
    }
  }

  try {
    const portalConfigs = await stripe.billingPortal.configurations.list({
      limit: 1,
    });

    if (portalConfigs.data.length > 0) {
      const config = portalConfigs.data[0];
      await stripe.billingPortal.configurations.update(config.id, {
        features: {
          payment_method_update: {
            enabled: true,
          },
          subscription_cancel: {
            enabled: true,
            mode: "at_period_end",
          },
          invoice_history: {
            enabled: true,
          },
        },
      });
      console.log(`✅ Updated Customer Portal configuration: ${config.id}`);
    } else {
      const newConfig = await stripe.billingPortal.configurations.create({
        features: {
          payment_method_update: {
            enabled: true,
          },
          subscription_cancel: {
            enabled: true,
            mode: "at_period_end",
          },
          invoice_history: {
            enabled: true,
          },
        },
        business_profile: {
          headline: "Manage your Always-On Node subscription",
        },
      });
      console.log(`✅ Created Customer Portal configuration: ${newConfig.id}`);
    }
  } catch (error) {
    console.warn("⚠️ Failed to configure Customer Portal:", error);
    console.log(
      "  You may need to configure the Customer Portal manually in the Stripe Dashboard",
    );
  }

  return {
    productId: product.id,
    priceId: price.id,
    webhookEndpointId: webhook?.id || "",
    webhookSecret: webhookSecret,
  };
}

async function main() {
  try {
    if (!process.env.STRIPE_SECRET_SERVER_SIDE_KEY) {
      throw new Error("STRIPE_SECRET_SERVER_SIDE_KEY is not set in .env");
    }

    const result = await setupStripe();

    console.log("\n🎉 Setup complete!\n");
    console.log("Configuration:\n");
    console.log(`   Product ID: ${result.productId}`);
    console.log(`   Price ID: ${result.priceId}`);
    if (result.webhookEndpointId) {
      console.log(`  Webhook ID: ${result.webhookEndpointId}`);
    }

    console.log("\n📝 Add to your .env file:\n");
    console.log(`   STRIPE_PRICE_ID=${result.priceId}`);
    if (result.webhookSecret) {
      console.log(`   STRIPE_WEBHOOK_SECRET=${result.webhookSecret}`);
    }

    if (!result.webhookEndpointId) {
      console.log("\n💡 For local development:");
      console.log(
        "   Run: stripe listen --forward-to localhost:5173/api/stripe/webhook",
      );
      console.log(
        "   Copy the webhook signing secret to STRIPE_WEBHOOK_SECRET in .env",
      );
      console.log("\n💡 For PRODUCTION deployment:");
      console.log(
        "   Set WEBHOOK_URL to your public domain and re-run this script:",
      );
      console.log(
        "   WEBHOOK_URL=https://your-domain.com/api/stripe/webhook pnpm setup:stripe\n",
      );
    }
  } catch (error) {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  }
}

main();

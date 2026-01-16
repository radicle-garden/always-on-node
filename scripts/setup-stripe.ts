#!/usr/bin/env -S node

import * as dotenv from "dotenv";
import { existsSync, readFileSync, writeFileSync } from "fs";
import * as path from "path";
import Stripe from "stripe";

dotenv.config({ path: path.join(process.cwd(), ".env"), quiet: true });

const stripe = new Stripe(process.env.STRIPE_SECRET_SERVER_SIDE_KEY || "", {
  apiVersion: "2025-12-15.clover",
});

interface SetupResult {
  productId: string;
  priceId: string;
  webhookEndpointId: string;
  webhookSecret: string;
}

async function setupStripe(): Promise<SetupResult> {
  console.log("🚀 Setting up Stripe...\n");

  // 1. Check if product already exists.
  const existingProducts = await stripe.products.search({
    query: 'name:"Always-On Node Subscription"',
  });

  let product: Stripe.Product;
  if (existingProducts.data.length > 0) {
    product = existingProducts.data[0];
    console.log(`✅ Found existing product: ${product.id}`);
  } else {
    // Create product.
    product = await stripe.products.create({
      name: "Always-On Node Subscription",
      description: "Monthly subscription for hosted Radicle node",
      metadata: {
        environment: process.env.NODE_ENV || "development",
      },
    });
    console.log(`✅ Created product: ${product.id}`);
  }

  // 2. Check if price already exists.
  const existingPrices = await stripe.prices.list({
    product: product.id,
    active: true,
  });

  let price: Stripe.Price;
  if (existingPrices.data.length > 0) {
    price = existingPrices.data[0];
    console.log(`✅ Found existing price: ${price.id}`);
  } else {
    // Create price.
    price = await stripe.prices.create({
      product: product.id,
      currency: "eur",
      recurring: {
        interval: "month",
        trial_period_days: 7,
      },
      unit_amount: 1000, // 10 EUR in cents.
      metadata: {
        environment: process.env.NODE_ENV || "development",
      },
    });
    console.log(`✅ Created price: ${price.id} (€10/month with 7-day trial)`);
  }

  // 3. Setup webhook endpoint.
  const webhookUrl =
    process.env.WEBHOOK_URL || "http://localhost:5173/api/stripe/webhook";
  const isLocalhost =
    webhookUrl.includes("localhost") || webhookUrl.includes("127.0.0.1");

  let webhook: Stripe.WebhookEndpoint | null = null;
  let webhookSecret = "";

  if (isLocalhost) {
    console.log("⚠️  Skipping webhook registration (localhost URL detected)");
    console.log("   For local development, use Stripe CLI to forward webhooks");
  } else {
    // Check if webhook already exists.
    const existingWebhooks = await stripe.webhookEndpoints.list();
    const matchingWebhook = existingWebhooks.data.find(
      wh => wh.url === webhookUrl,
    );

    if (matchingWebhook) {
      webhook = matchingWebhook;
      webhookSecret = webhook.secret || "";
      console.log(`✅ Found existing webhook: ${webhook.id}`);
    } else {
      // Create webhook.
      webhook = await stripe.webhookEndpoints.create({
        url: webhookUrl,
        enabled_events: [
          "customer.subscription.created",
          "customer.subscription.updated",
          "customer.subscription.deleted",
          "invoice.payment_failed",
          "customer.subscription.trial_will_end",
        ],
        api_version: "2025-12-15.clover",
      });
      webhookSecret = webhook.secret || "";
      console.log(`✅ Created webhook: ${webhook.id}`);
    }
  }

  // 4. Configure Customer Portal.
  try {
    const portalConfigs = await stripe.billingPortal.configurations.list({
      limit: 1,
    });

    if (portalConfigs.data.length > 0) {
      // Update existing configuration.
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
      // Create new configuration.
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
    console.warn("⚠️  Failed to configure Customer Portal:", error);
    console.log(
      "   You may need to configure the Customer Portal manually in the Stripe Dashboard",
    );
  }

  // 5. Update .env file.
  const envUpdates: Record<string, string> = {
    STRIPE_PRICE_ID: price.id,
  };

  // Only update webhook secret if we have one (not localhost).
  if (webhookSecret) {
    envUpdates.STRIPE_WEBHOOK_SECRET = webhookSecret;
  }

  updateEnvFile(envUpdates);

  return {
    productId: product.id,
    priceId: price.id,
    webhookEndpointId: webhook?.id || "",
    webhookSecret: webhookSecret,
  };
}

function updateEnvFile(updates: Record<string, string>) {
  const envPath = path.join(process.cwd(), ".env");
  let envContent = "";

  try {
    if (existsSync(envPath)) {
      envContent = readFileSync(envPath, "utf-8");
    }

    // Create backup before modifying
    if (existsSync(envPath)) {
      const backupPath = `${envPath}.backup`;
      writeFileSync(backupPath, envContent);
      console.log(`\n📋 Created backup at ${backupPath}`);
    }

    // Apply updates
    for (const [key, value] of Object.entries(updates)) {
      // Escape special regex characters in the key
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`^${escapedKey}=.*$`, "m");

      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        // Append to end, ensuring there's a newline before if content exists
        if (envContent && !envContent.endsWith("\n")) {
          envContent += "\n";
        }
        envContent += `${key}=${value}\n`;
      }
    }

    // Normalize line endings and ensure single trailing newline
    envContent = envContent.replace(/\r\n/g, "\n").replace(/\n+$/, "\n");

    writeFileSync(envPath, envContent, "utf-8");
    console.log("✅ Updated .env file with Stripe configuration");
  } catch (error) {
    console.error("❌ Failed to update .env file:", error);
    console.error("   Please manually add the following to your .env file:");
    for (const [key, value] of Object.entries(updates)) {
      console.error(`   ${key}=${value}`);
    }
    throw error;
  }
}

async function main() {
  try {
    // Validate environment.
    if (!process.env.STRIPE_SECRET_SERVER_SIDE_KEY) {
      throw new Error("STRIPE_SECRET_SERVER_SIDE_KEY is not set in .env");
    }

    const result = await setupStripe();

    console.log("\n🎉 Setup complete!\n");
    console.log("Configuration:");
    console.log(`  Product ID: ${result.productId}`);
    console.log(`  Price ID: ${result.priceId}`);
    if (result.webhookEndpointId) {
      console.log(`  Webhook ID: ${result.webhookEndpointId}`);
    }

    if (!result.webhookEndpointId) {
      console.log("💡 For PRODUCTION deployment:");
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

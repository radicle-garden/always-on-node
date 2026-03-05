import { getDb } from "$lib/server/db";
import { stopContainers } from "$lib/server/services/nodes";

import Stripe from "stripe";

import { test as base, expect } from "@playwright/test";

import {
  deleteNodesByUserId,
  deleteStripeDataByUserId,
  getUserByEmail,
  insertStripeCustomer,
} from "../helpers/db";
import {
  buildStripeClientConfig,
  buildSubscriptionPayload,
} from "../helpers/stripe";

import type { TestUser } from "./fixtures";
import { it as baseIt } from "./fixtures";
import { isContainerRunning } from "./helpers/containers";
import { postWebhook } from "./helpers/webhook";

export { expect };
export const describe = base.describe;

interface SubscribedUserFixtures {
  subscribedUser: TestUser & { stripeCustomerId: string; userId: number };
}

export const it = baseIt.extend<SubscribedUserFixtures>({
  subscribedUser: async ({ verifiedUser }, use) => {
    const user = await getUserByEmail(await getDb(), verifiedUser.email);
    if (!user) throw new Error("User not found after registration");

    // Clean up any containers left over from a previous failed run so tests
    // that assert container state start from a known-clean state.
    await stopContainers(user);

    // Create a real customer in stripe-mock so checkout/portal session
    // endpoints can use the customer ID via the Stripe API.
    const stripeClient = new Stripe(
      process.env.STRIPE_SECRET_SERVER_SIDE_KEY!,
      buildStripeClientConfig(),
    );
    const customer = await stripeClient.customers.create({
      email: user.email,
      name: user.handle,
    });
    const stripeCustomerId = customer.id;
    await insertStripeCustomer(await getDb(), user.id, stripeCustomerId);

    await use({ ...verifiedUser, stripeCustomerId, userId: user.id });

    // Teardown: delete stripe data before parent fixture deletes user (FK constraint)
    await deleteStripeDataByUserId(await getDb(), user.id);
    await deleteNodesByUserId(await getDb(), user.id);
    await stopContainers(user);
  },
});

export async function startContainersViaWebhook(
  baseURL: string,
  subscribedUser: { stripeCustomerId: string; userId: number; handle: string },
) {
  await postWebhook(
    baseURL,
    "customer.subscription.created",
    buildSubscriptionPayload({
      customerId: subscribedUser.stripeCustomerId,
      userId: String(subscribedUser.userId),
      status: "trialing",
    }),
  );
  expect(await isContainerRunning(`${subscribedUser.handle}-node`)).toBe(true);
}

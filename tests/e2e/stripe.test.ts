import { getDb } from "$lib/server/db";
import { stopContainers } from "$lib/server/services/nodes";

import Stripe from "stripe";

import { getSubscriptionByUserId, getUserByEmail } from "../helpers/db";
import { buildSubscriptionPayload } from "../helpers/stripe";

import { isContainerRunning } from "./helpers/containers";
import { getCookieHeader } from "./helpers/page";
import { postWebhook } from "./helpers/webhook";
import {
  describe,
  expect,
  it,
  startContainersViaWebhook,
} from "./stripe.fixtures";

const ONE_WEEK_IN_SECONDS = 7 * 24 * 60 * 60;
const NOW_IN_SECONDS = Math.floor(Date.now() / 1000);

describe("POST /api/stripe/webhook", () => {
  describe("on customer.subscription.created", () => {
    it("inserts subscription row and starts containers", async ({
      subscribedUser,
      baseURL,
    }) => {
      const payload = buildSubscriptionPayload({
        customerId: subscribedUser.stripeCustomerId,
        userId: String(subscribedUser.userId),
        status: "trialing",
        trialEnd: NOW_IN_SECONDS + ONE_WEEK_IN_SECONDS,
      });

      const res = await postWebhook(
        baseURL!,
        "customer.subscription.created",
        payload,
      );

      expect(res.status).toBe(200);

      const customer = await getSubscriptionByUserId(
        await getDb(),
        subscribedUser.userId,
      );
      expect(customer?.subscriptions[0]?.status).toBe("trialing");

      expect(await isContainerRunning(`${subscribedUser.handle}-node`)).toBe(
        true,
      );
      expect(await isContainerRunning(`${subscribedUser.handle}-httpd`)).toBe(
        true,
      );
    });
  });

  describe("on customer.subscription.updated to active", () => {
    it("starts containers when they were stopped", async ({
      subscribedUser,
      baseURL,
    }) => {
      const user = await getUserByEmail(await getDb(), subscribedUser.email);
      if (!user) throw new Error("User not found");
      await stopContainers(user);

      const payload = buildSubscriptionPayload({
        customerId: subscribedUser.stripeCustomerId,
        userId: String(subscribedUser.userId),
        status: "active",
      });

      const res = await postWebhook(
        baseURL!,
        "customer.subscription.updated",
        payload,
      );
      expect(res.status).toBe(200);

      expect(await isContainerRunning(`${subscribedUser.handle}-node`)).toBe(
        true,
      );
      expect(await isContainerRunning(`${subscribedUser.handle}-httpd`)).toBe(
        true,
      );
    });

    it("keeps containers running when already running", async ({
      subscribedUser,
      baseURL,
    }) => {
      await startContainersViaWebhook(baseURL!, subscribedUser);

      // Fire the update
      const payload = buildSubscriptionPayload({
        customerId: subscribedUser.stripeCustomerId,
        userId: String(subscribedUser.userId),
        status: "active",
      });
      const res = await postWebhook(
        baseURL!,
        "customer.subscription.updated",
        payload,
      );
      expect(res.status).toBe(200);

      expect(await isContainerRunning(`${subscribedUser.handle}-node`)).toBe(
        true,
      );
      expect(await isContainerRunning(`${subscribedUser.handle}-httpd`)).toBe(
        true,
      );
    });
  });

  describe("on customer.subscription.updated to canceled", () => {
    it("stops containers", async ({ subscribedUser, baseURL }) => {
      await startContainersViaWebhook(baseURL!, subscribedUser);

      const payload = buildSubscriptionPayload({
        customerId: subscribedUser.stripeCustomerId,
        userId: String(subscribedUser.userId),
        status: "canceled",
      });
      const res = await postWebhook(
        baseURL!,
        "customer.subscription.updated",
        payload,
      );
      expect(res.status).toBe(200);

      expect(await isContainerRunning(`${subscribedUser.handle}-node`)).toBe(
        false,
      );
      expect(await isContainerRunning(`${subscribedUser.handle}-httpd`)).toBe(
        false,
      );
    });
  });

  describe("on customer.subscription.deleted", () => {
    it("stops containers", async ({ subscribedUser, baseURL }) => {
      await startContainersViaWebhook(baseURL!, subscribedUser);

      const payload = buildSubscriptionPayload({
        customerId: subscribedUser.stripeCustomerId,
        userId: String(subscribedUser.userId),
        status: "canceled",
      });
      const res = await postWebhook(
        baseURL!,
        "customer.subscription.deleted",
        payload,
      );
      expect(res.status).toBe(200);

      expect(await isContainerRunning(`${subscribedUser.handle}-node`)).toBe(
        false,
      );
      expect(await isContainerRunning(`${subscribedUser.handle}-httpd`)).toBe(
        false,
      );
    });
  });

  describe("on invoice.payment_failed", () => {
    it("returns 200 without side effects", async ({
      subscribedUser,
      baseURL,
    }) => {
      const res = await postWebhook(baseURL!, "invoice.payment_failed", {
        customer: subscribedUser.stripeCustomerId,
      });
      expect(res.status).toBe(200);
    });
  });

  describe("signature validation", () => {
    it("returns 400 when stripe-signature header is absent", async ({
      baseURL,
    }) => {
      const res = await fetch(`${baseURL}/api/stripe/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "customer.subscription.created" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 when payload is signed with wrong secret", async ({
      baseURL,
    }) => {
      const payload = JSON.stringify({ type: "customer.subscription.created" });
      // Use a fresh Stripe client with a wrong secret to generate a bad signature
      const wrongStripe = new Stripe("sk_test_wrong", {
        apiVersion: "2026-01-28.clover",
      });
      const wrongSignature = wrongStripe.webhooks.generateTestHeaderString({
        payload,
        secret: "whsec_wrong_secret",
        timestamp: NOW_IN_SECONDS,
      });
      const res = await fetch(`${baseURL}/api/stripe/webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "stripe-signature": wrongSignature,
        },
        body: payload,
      });
      expect(res.status).toBe(400);
    });
  });
});

describe("POST /api/stripe/create-checkout-session", () => {
  it("returns 401 when not authenticated", async ({ request }) => {
    const res = await request.post("/api/stripe/create-checkout-session", {
      data: { priceId: process.env.STRIPE_PRICE_ID },
    });
    expect(res.status()).toBe(401);
  });

  it("returns 400 when priceId is missing", async ({
    authenticatedPage,
    request,
  }) => {
    const res = await request.post("/api/stripe/create-checkout-session", {
      data: {},
      headers: { Cookie: await getCookieHeader(authenticatedPage) },
    });
    expect(res.status()).toBe(400);
  });

  it("returns 200 with a url when authenticated with valid priceId", async ({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    subscribedUser,
    authenticatedPage,
    request,
  }) => {
    const res = await request.post("/api/stripe/create-checkout-session", {
      data: { priceId: process.env.STRIPE_PRICE_ID },
      headers: { Cookie: await getCookieHeader(authenticatedPage) },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.url).toBe("string");
    expect(body.url.length).toBeGreaterThan(0);
  });
});

describe("POST /api/stripe/create-portal-session", () => {
  it("returns 401 when not authenticated", async ({ request }) => {
    const res = await request.post("/api/stripe/create-portal-session");
    expect(res.status()).toBe(401);
  });

  it("returns 404 when user has no stripe customer record", async ({
    authenticatedPage,
    request,
  }) => {
    const res = await request.post("/api/stripe/create-portal-session", {
      headers: { Cookie: await getCookieHeader(authenticatedPage) },
    });
    expect(res.status()).toBe(404);
  });

  it("returns 200 with a url when customer exists", async ({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    subscribedUser,
    authenticatedPage,
    request,
  }) => {
    const res = await request.post("/api/stripe/create-portal-session", {
      headers: { Cookie: await getCookieHeader(authenticatedPage) },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.url).toBe("string");
  });
});

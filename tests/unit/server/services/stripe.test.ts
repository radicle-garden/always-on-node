import { getDb } from "$lib/server/db";
import {
  ensureNodeActiveForUser,
  stopContainers,
} from "$lib/server/services/nodes";
import { stripeService } from "$lib/server/services/stripe";

import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ONE_WEEK_IN_SECONDS,
  THIRTY_DAYS_IN_SECONDS,
  buildStripeEvent,
  buildSubscriptionPayload,
} from "../../../helpers/stripe";

// ---------------------------------------------------------------------------
// Hoisted mocks — must be declared before any imports that resolve them
// ---------------------------------------------------------------------------

const mockSubscriptionsRetrieve = vi.hoisted(() => vi.fn());

vi.mock("stripe", () => ({
  default: vi.fn(function () {
    return {
      subscriptions: { retrieve: mockSubscriptionsRetrieve },
    };
  }),
}));

vi.mock("$lib/server/services/nodes", () => ({
  ensureNodeActiveForUser: vi
    .fn()
    .mockResolvedValue({ success: true, statusCode: 200 }),
  stopContainers: vi.fn().mockResolvedValue({ success: true, statusCode: 200 }),
}));

vi.mock("$lib/server/db", () => {
  const mockDb = {
    query: {
      stripeCustomers: { findFirst: vi.fn() },
      stripeSubscriptions: { findFirst: vi.fn() },
      users: { findFirst: vi.fn() },
    },
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  };
  return {
    getDb: vi.fn().mockResolvedValue(mockDb),
    schema: {
      stripeCustomers: {
        stripe_customer_id: "stripe_customer_id",
        user_id: "user_id",
      },
      stripeSubscriptions: {
        id: "id",
        stripe_subscription_id: "stripe_subscription_id",
        status: "status",
      },
      users: { id: "id", deleted: "deleted" },
    },
  };
});

vi.mock("$lib/server/logger", () => ({
  createServiceLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("$lib/server/config", () => ({
  config: {
    stripeSecretKey: "sk_test_mock",
    stripeWebhookSecret: "whsec_mock",
    stripeApiBase: undefined,
  },
}));

// ---------------------------------------------------------------------------
// Types and helpers
// ---------------------------------------------------------------------------

interface MockDb {
  query: {
    stripeCustomers: { findFirst: ReturnType<typeof vi.fn> };
    stripeSubscriptions: { findFirst: ReturnType<typeof vi.fn> };
    users: { findFirst: ReturnType<typeof vi.fn> };
  };
  insert: ReturnType<typeof vi.fn>;
  values: ReturnType<typeof vi.fn>;
  onConflictDoUpdate: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
}

const FAKE_NOW_IN_SECONDS = 1700000000;
/** Unit test defaults for subscription fields (stable timestamps, test price ID). */
const UNIT_SUB_DEFAULTS = {
  priceId: "price_test_789",
  trialStart: FAKE_NOW_IN_SECONDS,
  trialEnd: FAKE_NOW_IN_SECONDS + ONE_WEEK_IN_SECONDS,
  currentPeriodStart: FAKE_NOW_IN_SECONDS,
  currentPeriodEnd: FAKE_NOW_IN_SECONDS + THIRTY_DAYS_IN_SECONDS,
} as const;

function createMockSubscription(
  overrides: Parameters<typeof buildSubscriptionPayload>[0] = {},
): Stripe.Subscription {
  return buildSubscriptionPayload({
    ...UNIT_SUB_DEFAULTS,
    ...overrides,
  });
}

function createMockEvent(type: string, data: object): Stripe.Event {
  return buildStripeEvent(type, data);
}

// ---------------------------------------------------------------------------
// Shared setup — clears mocks and re-wires the DB chain for every test
// ---------------------------------------------------------------------------

let mockDb: MockDb;

beforeEach(async () => {
  vi.clearAllMocks();
  mockDb = (await getDb()) as unknown as MockDb;

  mockDb.insert.mockReturnThis();
  mockDb.values.mockReturnThis();
  mockDb.onConflictDoUpdate.mockResolvedValue(undefined);
  mockDb.update.mockReturnThis();
  mockDb.set.mockReturnThis();
  mockDb.where.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// syncSubscriptionFromStripe tests
// ---------------------------------------------------------------------------

describe("syncSubscriptionFromStripe", () => {
  it("upserts a subscription row via onConflictDoUpdate", async () => {
    const sub = createMockSubscription({ status: "trialing" });
    mockSubscriptionsRetrieve.mockResolvedValue(sub);
    mockDb.query.stripeCustomers.findFirst.mockResolvedValue({ id: 10 });

    await stripeService.syncSubscriptionFromStripe("sub_test_123");

    expect(mockDb.insert).toHaveBeenCalled();
    expect(mockDb.values).toHaveBeenCalledWith(
      expect.objectContaining({
        stripe_subscription_id: "sub_test_123",
        status: "trialing",
        stripe_customer_id: 10,
        stripe_price_id: "price_test_789",
      }),
    );
    expect(mockDb.onConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        target: "stripe_subscription_id",
      }),
    );
  });

  it("no subscription upsert, when no matching customer found", async () => {
    const sub = createMockSubscription();
    mockSubscriptionsRetrieve.mockResolvedValue(sub);
    mockDb.query.stripeCustomers.findFirst.mockResolvedValue(null);

    await stripeService.syncSubscriptionFromStripe("sub_test_123");

    expect(mockDb.insert).not.toHaveBeenCalled();
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it("maps trial_end timestamp from Unix epoch to JS Date", async () => {
    const trialEndEpoch = FAKE_NOW_IN_SECONDS + ONE_WEEK_IN_SECONDS;
    const sub = createMockSubscription({ trialEnd: trialEndEpoch });
    mockSubscriptionsRetrieve.mockResolvedValue(sub);
    mockDb.query.stripeCustomers.findFirst.mockResolvedValue({ id: 10 });

    await stripeService.syncSubscriptionFromStripe("sub_test_123");

    expect(mockDb.values).toHaveBeenCalledWith(
      expect.objectContaining({
        trial_end: new Date(trialEndEpoch * 1000),
      }),
    );
  });

  it("maps cancel_at and canceled_at timestamps from Unix epoch to JS Date", async () => {
    const cancelAtEpoch = FAKE_NOW_IN_SECONDS + ONE_WEEK_IN_SECONDS;
    const canceledAtEpoch = 1710691200;
    const sub = createMockSubscription({
      cancelAt: cancelAtEpoch,
      canceledAt: canceledAtEpoch,
    });
    mockSubscriptionsRetrieve.mockResolvedValue(sub);
    mockDb.query.stripeCustomers.findFirst.mockResolvedValue({ id: 10 });

    await stripeService.syncSubscriptionFromStripe("sub_test_123");

    expect(mockDb.values).toHaveBeenCalledWith(
      expect.objectContaining({
        cancel_at: new Date(cancelAtEpoch * 1000),
        canceled_at: new Date(canceledAtEpoch * 1000),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// handleWebhookEvent tests
// ---------------------------------------------------------------------------

describe("handleWebhookEvent", () => {
  beforeEach(() => {
    vi.mocked(ensureNodeActiveForUser).mockResolvedValue({
      success: true,
      statusCode: 200,
    });
    vi.mocked(stopContainers).mockResolvedValue({
      success: true,
      statusCode: 200,
    });
  });

  it("calls ensureNodeActiveForUser when subscription is created with status trialing", async () => {
    const sub = createMockSubscription({
      status: "trialing",
      userId: "42",
    });
    mockDb.query.stripeCustomers.findFirst.mockResolvedValue({ id: 10 });

    const result = await stripeService.handleWebhookEvent(
      createMockEvent("customer.subscription.created", sub),
    );

    expect(result.success).toBe(true);
    expect(ensureNodeActiveForUser).toHaveBeenCalledWith(42);
    expect(stopContainers).not.toHaveBeenCalled();
    expect(mockSubscriptionsRetrieve).not.toHaveBeenCalled();
  });

  it("calls ensureNodeActiveForUser when subscription is updated to active", async () => {
    const sub = createMockSubscription({
      status: "active",
      userId: "7",
    });
    mockDb.query.stripeCustomers.findFirst.mockResolvedValue({ id: 10 });

    const result = await stripeService.handleWebhookEvent(
      createMockEvent("customer.subscription.updated", sub),
    );

    expect(result.success).toBe(true);
    expect(ensureNodeActiveForUser).toHaveBeenCalledWith(7);
    expect(stopContainers).not.toHaveBeenCalled();
    expect(mockSubscriptionsRetrieve).not.toHaveBeenCalled();
  });

  it("does not call ensureNodeActiveForUser when user_id metadata is empty", async () => {
    const sub = createMockSubscription({
      status: "trialing",
      metadata: { user_id: "" },
    });
    mockDb.query.stripeCustomers.findFirst.mockResolvedValue({ id: 10 });

    const result = await stripeService.handleWebhookEvent(
      createMockEvent("customer.subscription.created", sub),
    );

    expect(result.success).toBe(true);
    expect(ensureNodeActiveForUser).not.toHaveBeenCalled();
    expect(mockSubscriptionsRetrieve).not.toHaveBeenCalled();
  });

  it("still returns success when ensureNodeActiveForUser fails", async () => {
    const sub = createMockSubscription({
      status: "active",
      userId: "42",
    });
    mockDb.query.stripeCustomers.findFirst.mockResolvedValue({ id: 10 });
    vi.mocked(ensureNodeActiveForUser).mockResolvedValue({
      success: false,
      error: "container error",
      statusCode: 500,
    });

    const result = await stripeService.handleWebhookEvent(
      createMockEvent("customer.subscription.created", sub),
    );

    expect(ensureNodeActiveForUser).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(mockSubscriptionsRetrieve).not.toHaveBeenCalled();
  });

  it.each<{
    eventType: string;
    status: Stripe.Subscription.Status;
    label: string;
  }>([
    {
      eventType: "customer.subscription.updated",
      status: "canceled",
      label: "updated to canceled",
    },
    {
      eventType: "customer.subscription.updated",
      status: "past_due",
      label: "updated to past_due",
    },
    {
      eventType: "customer.subscription.deleted",
      status: "canceled",
      label: "deleted",
    },
  ])(
    "calls stopContainers when subscription is $label",
    async ({ eventType, status }) => {
      const sub = createMockSubscription({ status, userId: "5" });
      mockDb.query.stripeCustomers.findFirst.mockResolvedValue({ id: 10 });
      mockDb.query.users.findFirst.mockResolvedValue({
        id: 5,
        handle: "testuser",
      });

      const result = await stripeService.handleWebhookEvent(
        createMockEvent(eventType, sub),
      );

      expect(result.success).toBe(true);
      expect(stopContainers).toHaveBeenCalledWith(
        expect.objectContaining({ id: 5 }),
      );
      expect(ensureNodeActiveForUser).not.toHaveBeenCalled();
      expect(mockSubscriptionsRetrieve).not.toHaveBeenCalled();
    },
  );

  it("returns success without side effects for invoice.payment_failed", async () => {
    const result = await stripeService.handleWebhookEvent(
      createMockEvent("invoice.payment_failed", { customer: "cus_test_123" }),
    );

    expect(result.success).toBe(true);
    expect(ensureNodeActiveForUser).not.toHaveBeenCalled();
    expect(stopContainers).not.toHaveBeenCalled();
    expect(mockSubscriptionsRetrieve).not.toHaveBeenCalled();
  });

  it("returns success without side effects for customer.subscription.trial_will_end", async () => {
    const sub = createMockSubscription({
      status: "trialing",
      userId: "42",
    });

    const result = await stripeService.handleWebhookEvent(
      createMockEvent("customer.subscription.trial_will_end", sub),
    );

    expect(result.success).toBe(true);
    expect(ensureNodeActiveForUser).not.toHaveBeenCalled();
    expect(stopContainers).not.toHaveBeenCalled();
    expect(mockSubscriptionsRetrieve).not.toHaveBeenCalled();
  });

  it("returns success for unknown event types", async () => {
    const result = await stripeService.handleWebhookEvent(
      createMockEvent("some.unknown.event", {}),
    );

    expect(result.success).toBe(true);
    expect(ensureNodeActiveForUser).not.toHaveBeenCalled();
    expect(stopContainers).not.toHaveBeenCalled();
    expect(mockSubscriptionsRetrieve).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// getSubscriptionStatus tests
// ---------------------------------------------------------------------------

describe("getSubscriptionStatus", () => {
  it("returns hasSubscription false when no customer record exists", async () => {
    mockDb.query.stripeCustomers.findFirst.mockResolvedValue(null);

    const result = await stripeService.getSubscriptionStatus(1);

    expect(result.success).toBe(true);
    expect(result.content?.hasSubscription).toBe(false);
    expect(result.content?.status).toBeNull();
  });

  it("returns correct status and dates for an active subscription", async () => {
    const periodEnd = new Date("2026-03-26T00:00:00.000Z");

    mockDb.query.stripeCustomers.findFirst.mockResolvedValue({
      id: 10,
      subscriptions: [
        {
          id: 1,
          status: "active",
          trial_end: null,
          current_period_end: periodEnd,
          cancel_at_period_end: false,
          cancel_at: null,
          created_at: new Date(),
        },
      ],
    });

    const result = await stripeService.getSubscriptionStatus(1);

    expect(result.content?.hasSubscription).toBe(true);
    expect(result.content?.status).toBe("active");
    expect(result.content?.currentPeriodEnd).toEqual(periodEnd);
  });

  it("returns cancelAtPeriodEnd true when cancel_at is set", async () => {
    const cancelAt = new Date("2026-04-01T00:00:00.000Z");

    mockDb.query.stripeCustomers.findFirst.mockResolvedValue({
      id: 10,
      subscriptions: [
        {
          id: 1,
          status: "active",
          trial_end: null,
          current_period_end: new Date("2026-04-01T00:00:00.000Z"),
          cancel_at_period_end: false,
          cancel_at: cancelAt,
          created_at: new Date(),
        },
      ],
    });

    const result = await stripeService.getSubscriptionStatus(1);

    expect(result.content?.cancelAtPeriodEnd).toBe(true);
    expect(result.content?.cancelAt).toEqual(cancelAt);
  });

  it("returns cancelAtPeriodEnd true when cancel_at_period_end flag is set", async () => {
    mockDb.query.stripeCustomers.findFirst.mockResolvedValue({
      id: 10,
      subscriptions: [
        {
          id: 1,
          status: "active",
          trial_end: null,
          current_period_end: new Date("2026-04-01T00:00:00.000Z"),
          cancel_at_period_end: true,
          cancel_at: null,
          created_at: new Date(),
        },
      ],
    });

    const result = await stripeService.getSubscriptionStatus(1);

    expect(result.content?.cancelAtPeriodEnd).toBe(true);
    expect(result.content?.cancelAt).toBeNull();
  });
});

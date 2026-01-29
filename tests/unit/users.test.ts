import { getDb } from "$lib/server/db";
import { setPassword, verifyPassword } from "$lib/server/entities";
import { stripeService } from "$lib/server/services/stripe";
import { canDeleteAccount, deleteUser } from "$lib/server/services/users";

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("$lib/server/services/stripe", () => ({
  stripeService: {
    getSubscriptionStatus: vi.fn(),
  },
}));

vi.mock("$lib/server/services/nodes", () => ({
  stopContainers: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("$lib/server/db", () => {
  const mockDb = {
    query: {
      users: {
        findFirst: vi.fn(),
      },
    },
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  };
  return {
    getDb: vi.fn().mockResolvedValue(mockDb),
    schema: {
      users: { id: "id", deleted: "deleted", user_id: "user_id" },
      nodes: { user_id: "user_id", deleted: "deleted" },
    },
  };
});

interface MockDb {
  query: { users: { findFirst: ReturnType<typeof vi.fn> } };
  update: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
}

describe("canDeleteAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns canDelete: true when user has no subscription", async () => {
    vi.mocked(stripeService.getSubscriptionStatus).mockResolvedValue({
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
    });

    const result = await canDeleteAccount(1);

    expect(result.success).toBe(true);
    expect(result.content?.canDelete).toBe(true);
    expect(result.content?.reason).toBeUndefined();
  });

  it("returns canDelete: false when user has active subscription", async () => {
    vi.mocked(stripeService.getSubscriptionStatus).mockResolvedValue({
      success: true,
      content: {
        hasSubscription: true,
        status: "active",
        trialEnd: null,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        cancelAtPeriodEnd: false,
        cancelAt: null,
      },
      statusCode: 200,
    });

    const result = await canDeleteAccount(1);

    expect(result.success).toBe(true);
    expect(result.content?.canDelete).toBe(false);
    expect(result.content?.reason).toContain("subscription is still active");
  });

  it("returns canDelete: false when user has trialing subscription", async () => {
    vi.mocked(stripeService.getSubscriptionStatus).mockResolvedValue({
      success: true,
      content: {
        hasSubscription: true,
        status: "trialing",
        trialEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: false,
        cancelAt: null,
      },
      statusCode: 200,
    });

    const result = await canDeleteAccount(1);

    expect(result.success).toBe(true);
    expect(result.content?.canDelete).toBe(false);
    expect(result.content?.reason).toContain("subscription is still active");
  });

  it("returns canDelete: false when subscription is canceled but period not ended", async () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    vi.mocked(stripeService.getSubscriptionStatus).mockResolvedValue({
      success: true,
      content: {
        hasSubscription: true,
        status: "canceled",
        trialEnd: null,
        currentPeriodEnd: futureDate,
        cancelAtPeriodEnd: true,
        cancelAt: futureDate,
      },
      statusCode: 200,
    });

    const result = await canDeleteAccount(1);

    expect(result.success).toBe(true);
    expect(result.content?.canDelete).toBe(false);
    expect(result.content?.reason).toContain("subscription ends on");
  });

  it("returns canDelete: true when subscription is canceled and period has ended", async () => {
    const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    vi.mocked(stripeService.getSubscriptionStatus).mockResolvedValue({
      success: true,
      content: {
        hasSubscription: true,
        status: "canceled",
        trialEnd: null,
        currentPeriodEnd: pastDate,
        cancelAtPeriodEnd: true,
        cancelAt: pastDate,
      },
      statusCode: 200,
    });

    const result = await canDeleteAccount(1);

    expect(result.success).toBe(true);
    expect(result.content?.canDelete).toBe(true);
  });

  it("returns error when stripe service fails", async () => {
    vi.mocked(stripeService.getSubscriptionStatus).mockResolvedValue({
      success: false,
      error: "Stripe error",
      statusCode: 500,
    });

    const result = await canDeleteAccount(1);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to check subscription status");
  });
});

describe("deleteUser", () => {
  let mockDb: MockDb;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockDb = (await getDb()) as unknown as MockDb;
  });

  it("returns error when user is not found", async () => {
    mockDb.query.users.findFirst.mockResolvedValue(null);

    const result = await deleteUser(1, "password123");

    expect(result.success).toBe(false);
    expect(result.error).toBe("User not found");
    expect(result.statusCode).toBe(404);
  });

  it("returns error when password is incorrect", async () => {
    mockDb.query.users.findFirst.mockResolvedValue({
      id: 1,
      email: "test@example.com",
      password_hash: setPassword("correctpassword"),
      deleted: false,
    });

    const result = await deleteUser(1, "wrongpassword");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Incorrect password");
    expect(result.statusCode).toBe(401);
  });

  it("returns error when user has active subscription", async () => {
    mockDb.query.users.findFirst.mockResolvedValue({
      id: 1,
      email: "test@example.com",
      password_hash: setPassword("password123"),
      deleted: false,
    });

    vi.mocked(stripeService.getSubscriptionStatus).mockResolvedValue({
      success: true,
      content: {
        hasSubscription: true,
        status: "active",
        trialEnd: null,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: false,
        cancelAt: null,
      },
      statusCode: 200,
    });

    const result = await deleteUser(1, "password123");

    expect(result.success).toBe(false);
    expect(result.error).toContain("subscription is still active");
    expect(result.statusCode).toBe(400);
  });

  it("successfully deletes user when password is correct and no active subscription", async () => {
    const passwordHash = setPassword("password123");
    mockDb.query.users.findFirst.mockResolvedValue({
      id: 1,
      email: "test@example.com",
      password_hash: passwordHash,
      deleted: false,
    });

    vi.mocked(stripeService.getSubscriptionStatus).mockResolvedValue({
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
    });

    const result = await deleteUser(1, "password123");

    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(mockDb.update).toHaveBeenCalled();
  });
});

describe("deleted user access prevention", () => {
  it("verifyPassword returns false for empty password hash (deleted user)", () => {
    const result = verifyPassword("anypassword", "");
    expect(result).toBe(false);
  });
});

import { count, eq } from "drizzle-orm";
import { type Server, createServer } from "node:http";
import { Gauge, Registry, collectDefaultMetrics } from "prom-client";

import { config } from "./config";
import { getDb, schema } from "./db";
import { createServiceLogger } from "./logger";

const log = createServiceLogger("Metrics");

export const nodejsRegister = new Registry();
collectDefaultMetrics({ register: nodejsRegister });

export const gardenRegister = new Registry();

new Gauge({
  name: "garden_users_total",
  help: "Total number of users",
  registers: [gardenRegister],
  async collect() {
    const db = await getDb();
    const [result] = await db
      .select({ count: count() })
      .from(schema.users)
      .where(eq(schema.users.deleted, false));
    this.set(result.count);
  },
});
new Gauge({
  name: "garden_deleted_users_total",
  help: "Total number of deleted users",
  registers: [gardenRegister],
  async collect() {
    const db = await getDb();
    const [result] = await db
      .select({ count: count() })
      .from(schema.users)
      .where(eq(schema.users.deleted, true));
    this.set(result.count);
  },
});
new Gauge({
  name: "garden_customers_total",
  help: "Total number of Stripe customers",
  registers: [gardenRegister],
  async collect() {
    const db = await getDb();
    const [result] = await db
      .select({ count: count() })
      .from(schema.stripeCustomers);
    this.set(result.count);
  },
});
new Gauge({
  name: "garden_customers_with_active_subscription",
  help: "Number of customers with an active subscription (not on trial)",
  registers: [gardenRegister],
  async collect() {
    const db = await getDb();
    const [result] = await db
      .select({ count: count() })
      .from(schema.stripeSubscriptions)
      .where(eq(schema.stripeSubscriptions.status, "active"));
    this.set(result.count);
  },
});
new Gauge({
  name: "garden_customers_on_trial",
  help: "Number of customers currently on a trial",
  registers: [gardenRegister],
  async collect() {
    const db = await getDb();
    const [result] = await db
      .select({ count: count() })
      .from(schema.stripeSubscriptions)
      .where(eq(schema.stripeSubscriptions.status, "trialing"));
    this.set(result.count);
  },
});
let server: Server | undefined;

export function startMetricsServer(): void {
  const port = config.metricsPort;
  if (!port) {
    log.info("METRICS_PORT not set, skipping metrics server");
    return;
  }

  server = createServer(async (req, res) => {
    if (req.url === "/metrics" && req.method === "GET") {
      res.setHeader("Content-Type", nodejsRegister.contentType);
      res.end(await nodejsRegister.metrics());
    } else if (req.url === "/metrics/garden" && req.method === "GET") {
      res.setHeader("Content-Type", gardenRegister.contentType);
      res.end(await gardenRegister.metrics());
    } else {
      res.statusCode = 404;
      res.end("Not Found");
    }
  });

  server.listen(port, () => {
    log.info(`Metrics server listening on port ${port}`);
  });
}

export function stopMetricsServer(): void {
  server?.close();
  server = undefined;
}

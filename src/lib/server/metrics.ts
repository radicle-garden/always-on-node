import { type Server, createServer } from "node:http";
import { Registry, collectDefaultMetrics } from "prom-client";

import { config } from "./config";
import { createServiceLogger } from "./logger";

const log = createServiceLogger("Metrics");

export const register = new Registry();

collectDefaultMetrics({ register });

let server: Server | undefined;

export function startMetricsServer(): void {
  const port = config.metricsPort;
  if (!port) {
    log.info("METRICS_PORT not set, skipping metrics server");
    return;
  }

  server = createServer(async (req, res) => {
    if (req.url === "/metrics" && req.method === "GET") {
      res.setHeader("Content-Type", register.contentType);
      res.end(await register.metrics());
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

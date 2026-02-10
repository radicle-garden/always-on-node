import * as dotenv from "dotenv";
import * as path from "path";

import configJson from "./config.json" with { type: "json" };

const __dirname = path.resolve();
dotenv.config({ path: path.join(__dirname, ".env"), quiet: true });

export interface AppConfig {
  appSecret: string;
  databaseUrl: string;
  profileStoragePath: string;
  radBinaryPath: string;
  resendApiKey: string | undefined;
  emailSenderAddress: string | undefined;
  jwtExpiresIn: string;
  frontendUrl: string;
  fqdn: string;
  httpdScheme: string;
  httpdPort: number;
  nodeEnv: string;
  dockerHost: string;
  radicleNodeContainer: string;
  radicleHttpdContainer: string;
  nodeBootingTimeoutMs: number;
  nodeStatusPollIntervalMs: number;
  nodeStatusMonitorTimeoutMs: number;
  sseMaxListeners: number;
  nodePreferredSeeds: string[];
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  stripePriceId: string;
  metricsPort?: number;
  stripeApiBase?: string;
  nodePortRangeStart: number;
  nodePortRangeEnd: number;
  public: {
    defaultHttpdApiHostname: string;
    defaultHttpdApiPort: number;
    defaultHttpdApiScheme: string;
    // Override this in production via PUBLIC_SERVICE_HOST_PORT to
    // radicle.garden or whatever domain we'll use.
    publicServiceHostPort: string;
    userMaxDiskUsageBytes: number;
  };
}

export function getConfig(): AppConfig {
  return {
    appSecret: process.env.APP_SECRET || "default_secret_change_me",
    resendApiKey: process.env.RESEND_API_KEY,
    emailSenderAddress: process.env.EMAIL_SENDER_ADDRESS,

    databaseUrl: process.env.DATABASE_URL || configJson.databaseUrl,
    profileStoragePath:
      process.env.PROFILE_STORAGE_PATH || configJson.profileStoragePath,
    radBinaryPath: process.env.RAD_BINARY_PATH || configJson.radBinaryPath,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || configJson.jwtExpiresIn,
    frontendUrl: process.env.FRONTEND_URL || configJson.frontendUrl,
    fqdn: process.env.FQDN || configJson.fqdn,
    httpdScheme: process.env.HTTPD_SCHEME || configJson.httpdScheme,
    httpdPort: Number(process.env.HTTPD_PORT) || configJson.httpdPort,
    nodeEnv: process.env.NODE_ENV || configJson.nodeEnv,
    dockerHost: process.env.DOCKER_HOST || configJson.dockerHost,
    radicleNodeContainer:
      process.env.RADICLE_NODE_CONTAINER || configJson.radicleNodeContainer,
    radicleHttpdContainer:
      process.env.RADICLE_HTTPD_CONTAINER || configJson.radicleHttpdContainer,
    nodeBootingTimeoutMs:
      Number(process.env.NODE_BOOTING_TIMEOUT_MS) ||
      configJson.nodeBootingTimeoutMs,
    nodeStatusPollIntervalMs:
      Number(process.env.NODE_STATUS_POLL_INTERVAL_MS) ||
      configJson.nodeStatusPollIntervalMs,
    nodeStatusMonitorTimeoutMs:
      Number(process.env.NODE_STATUS_MONITOR_TIMEOUT_MS) ||
      configJson.nodeStatusMonitorTimeoutMs,
    sseMaxListeners:
      Number(process.env.SSE_MAX_LISTENERS) || configJson.sseMaxListeners,
    nodePreferredSeeds:
      process.env.NODE_PREFERRED_SEEDS?.split(",") ||
      configJson.nodePreferredSeeds,
    stripeSecretKey: process.env.STRIPE_SECRET_SERVER_SIDE_KEY || "placeholder",
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
    stripePriceId: process.env.STRIPE_PRICE_ID || "",
    metricsPort: process.env.METRICS_PORT
      ? parseInt(process.env.METRICS_PORT)
      : undefined,
    stripeApiBase: process.env.STRIPE_API_BASE,
    nodePortRangeStart:
      Number(process.env.NODE_PORT_RANGE_START) ||
      configJson.nodePortRangeStart,
    nodePortRangeEnd:
      Number(process.env.NODE_PORT_RANGE_END) || configJson.nodePortRangeEnd,
    public: {
      defaultHttpdApiHostname:
        process.env.DEFAULT_HTTPD_API_HOSTNAME ||
        configJson.public.defaultHttpdApiHostname,
      defaultHttpdApiPort:
        Number(process.env.DEFAULT_HTTPD_API_PORT) ||
        configJson.public.defaultHttpdApiPort,
      defaultHttpdApiScheme:
        process.env.DEFAULT_HTTPD_API_SCHEME ||
        configJson.public.defaultHttpdApiScheme,
      publicServiceHostPort:
        process.env.PUBLIC_SERVICE_HOST_PORT ||
        configJson.public.publicServiceHostPort,
      userMaxDiskUsageBytes:
        Number(process.env.NODE_MAX_STORAGE_BYTES) ||
        configJson.public.userMaxDiskUsageBytes,
    },
  };
}

export const config = getConfig();

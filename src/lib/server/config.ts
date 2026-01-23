import { z } from "zod";

// Zod schema for environment variables
const envSchema = z.object({
  // Required secrets (must be provided via .env.local)
  APP_SECRET: z.string().min(1, "APP_SECRET is required and cannot be empty"),
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine(
      val => val.startsWith("postgres://") || val.startsWith("postgresql://"),
      {
        message: "DATABASE_URL must be a valid PostgreSQL connection string",
      },
    ),

  // Required Stripe configuration (must be provided via .env.local)
  STRIPE_SECRET_SERVER_SIDE_KEY: z
    .string()
    .min(1, "STRIPE_SECRET_SERVER_SIDE_KEY is required")
    .refine(val => val.startsWith("sk_"), {
      message: "STRIPE_SECRET_SERVER_SIDE_KEY must start with 'sk_'",
    }),
  STRIPE_WEBHOOK_SECRET: z
    .string()
    .min(1, "STRIPE_WEBHOOK_SECRET is required")
    .refine(val => val.startsWith("whsec_"), {
      message: "STRIPE_WEBHOOK_SECRET must start with 'whsec_'",
    }),
  STRIPE_PRICE_ID: z
    .string()
    .min(1, "STRIPE_PRICE_ID is required")
    .refine(val => val.startsWith("price_"), {
      message: "STRIPE_PRICE_ID must start with 'price_'",
    }),
  STRIPE_API_BASE: z
    .string()
    .min(1, "STRIPE_API_BASE is required")
    .refine(
      val => {
        try {
          new URL(val);
          return true;
        } catch {
          return false;
        }
      },
      { message: "STRIPE_API_BASE must be a valid URL" },
    ),

  // Optional email configuration
  RESEND_API_KEY: z.string().optional(),
  EMAIL_SENDER_ADDRESS: z
    .string()
    .refine(
      val => {
        if (val === "" || val === undefined) return true;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      },
      { message: "Invalid email address" },
    )
    .optional()
    .or(z.literal("")),

  // Required configuration (defaults provided in .env)
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PROFILE_STORAGE_PATH: z.string().min(1, "PROFILE_STORAGE_PATH is required"),
  RAD_BINARY_PATH: z.string().min(1, "RAD_BINARY_PATH is required"),
  JWT_EXPIRES_IN: z.string().min(1, "JWT_EXPIRES_IN is required"),
  FRONTEND_URL: z.string().min(1, "FRONTEND_URL is required"),
  FQDN: z.string().min(1, "FQDN is required"),
  HTTPD_SCHEME: z.enum(["http", "https"]),
  HTTPD_PORT: z.coerce.number().positive(),
  NODES_CONNECT_FQDN: z.string().min(1, "NODES_CONNECT_FQDN is required"),
  APP_PODMAN_SOCKET: z.string().default("unix:///var/run/docker.sock"),
  RADICLE_NODE_CONTAINER: z
    .string()
    .min(1, "RADICLE_NODE_CONTAINER is required"),
  RADICLE_HTTPD_CONTAINER: z
    .string()
    .min(1, "RADICLE_HTTPD_CONTAINER is required"),

  // Public configuration (defaults provided in .env)
  DEFAULT_HTTPD_API_HOSTNAME: z
    .string()
    .min(1, "DEFAULT_HTTPD_API_HOSTNAME is required"),
  DEFAULT_HTTPD_API_PORT: z.coerce.number().positive(),
  DEFAULT_HTTPD_API_SCHEME: z.enum(["http", "https"]),
  PUBLIC_SERVICE_HOST_PORT: z
    .string()
    .min(1, "PUBLIC_SERVICE_HOST_PORT is required"),
  NODE_MAX_STORAGE_BYTES: z.coerce.number().positive(),
});

// Infer TypeScript type from schema
type Env = z.infer<typeof envSchema>;

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
  nodesConnectFQDN: string;
  nodeEnv: string;
  appPodmanSocket: string;
  radicleNodeContainer: string;
  radicleHttpdContainer: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  stripePriceId: string;
  stripeApiBase: string;
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

let configInstance: AppConfig | null = null;

function loadEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Configuration validation failed:\n");
      error.issues.forEach(issue => {
        console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
      });
      console.error("\nPlease check your .env file or environment variables.");
      process.exit(1);
    }
    throw error;
  }
}

function getConfig(): AppConfig {
  if (configInstance) {
    return configInstance;
  }

  // Load and validate environment variables
  const env = loadEnv();

  // Build AppConfig from validated env
  configInstance = {
    appSecret: env.APP_SECRET,
    databaseUrl: env.DATABASE_URL,
    profileStoragePath: env.PROFILE_STORAGE_PATH,
    radBinaryPath: env.RAD_BINARY_PATH,
    resendApiKey: env.RESEND_API_KEY,
    emailSenderAddress: env.EMAIL_SENDER_ADDRESS,
    jwtExpiresIn: env.JWT_EXPIRES_IN,
    frontendUrl: env.FRONTEND_URL,
    fqdn: env.FQDN,
    httpdScheme: env.HTTPD_SCHEME,
    httpdPort: env.HTTPD_PORT,
    nodesConnectFQDN: env.NODES_CONNECT_FQDN,
    nodeEnv: env.NODE_ENV,
    appPodmanSocket: env.APP_PODMAN_SOCKET,
    radicleNodeContainer: env.RADICLE_NODE_CONTAINER,
    radicleHttpdContainer: env.RADICLE_HTTPD_CONTAINER,
    stripeSecretKey: env.STRIPE_SECRET_SERVER_SIDE_KEY,
    stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
    stripePriceId: env.STRIPE_PRICE_ID,
    stripeApiBase: env.STRIPE_API_BASE,
    public: {
      defaultHttpdApiHostname: env.DEFAULT_HTTPD_API_HOSTNAME,
      defaultHttpdApiPort: env.DEFAULT_HTTPD_API_PORT,
      defaultHttpdApiScheme: env.DEFAULT_HTTPD_API_SCHEME,
      publicServiceHostPort: env.PUBLIC_SERVICE_HOST_PORT,
      userMaxDiskUsageBytes: env.NODE_MAX_STORAGE_BYTES,
    },
  };

  return configInstance;
}

// Lazy singleton - only initializes when first accessed at runtime
export const config: AppConfig = new Proxy({} as AppConfig, {
  get(_target, prop: string) {
    return getConfig()[prop as keyof AppConfig];
  },
});

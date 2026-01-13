import * as dotenv from "dotenv";
import * as path from "path";

import configJson from "./config.json";

const __dirname = path.resolve();
dotenv.config({ path: path.join(__dirname, ".env") });

export interface AppConfig {
  appSecret: string;
  databaseStoragePath: string;
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
  dockerHost: string;
  radicleNodeContainer: string;
  radicleHttpdContainer: string;
  public: {
    defaultHttpdApiHostname: string;
    defaultHttpdApiPort: number;
    defaultHttpdApiScheme: string;
  };
}

export function getConfig(): AppConfig {
  return {
    appSecret: process.env.APP_SECRET || "default_secret_change_me",
    resendApiKey: process.env.RESEND_API_KEY,
    emailSenderAddress: process.env.EMAIL_SENDER_ADDRESS,

    databaseStoragePath:
      process.env.DATABASE_STORAGE_PATH || configJson.databaseStoragePath,
    profileStoragePath:
      process.env.PROFILE_STORAGE_PATH || configJson.profileStoragePath,
    radBinaryPath: process.env.RAD_BINARY_PATH || configJson.radBinaryPath,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || configJson.jwtExpiresIn,
    frontendUrl: process.env.FRONTEND_URL || configJson.frontendUrl,
    fqdn: process.env.FQDN || configJson.fqdn,
    httpdScheme: process.env.HTTPD_SCHEME || configJson.httpdScheme,
    httpdPort: Number(process.env.HTTPD_PORT) || configJson.httpdPort,
    nodesConnectFQDN:
      process.env.NODES_CONNECT_FQDN || configJson.nodesConnectFQDN,
    nodeEnv: process.env.NODE_ENV || configJson.nodeEnv,
    dockerHost: process.env.DOCKER_HOST || configJson.dockerHost,
    radicleNodeContainer:
      process.env.RADICLE_NODE_CONTAINER || configJson.radicleNodeContainer,
    radicleHttpdContainer:
      process.env.RADICLE_HTTPD_CONTAINER || configJson.radicleHttpdContainer,
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
    },
  };
}

export const config = getConfig();

import winston from "winston";

import { config } from "./config";

const isDev = config.nodeEnv === "development";

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

const devFormat = winston.format.combine(
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    const svc = service ? `[${service}]` : "";
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} ${level} ${svc} ${message}${metaStr}`;
  }),
);

export const logger = winston.createLogger({
  level: isDev ? "debug" : "info",
  format: isDev ? devFormat : jsonFormat,
  transports: [new winston.transports.Console()],
});

export function createServiceLogger(service: string) {
  return logger.child({ service });
}

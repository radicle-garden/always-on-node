import { Fetcher } from "./http-client/lib/fetcher";
import { Client } from "./http-client/lib/repo";
import { config } from "./server/config";

let httpdApiInstance: Client | null = null;

function getHttpdApi(): Client {
  if (httpdApiInstance) {
    return httpdApiInstance;
  }

  httpdApiInstance = new Client(
    new Fetcher({
      hostname: config.public.defaultHttpdApiHostname,
      port: config.public.defaultHttpdApiPort,
      scheme: config.public.defaultHttpdApiScheme,
    }),
  );

  return httpdApiInstance;
}

// Lazy singleton export for convenience
export const httpdApi = new Proxy({} as Client, {
  get(_target, prop: string) {
    return getHttpdApi()[prop as keyof Client];
  },
});

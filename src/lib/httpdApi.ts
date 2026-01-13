import { Fetcher } from "./http-client/lib/fetcher";
import { Client } from "./http-client/lib/repo";
import { config } from "./server/config";

export const httpdApi = new Client(
  new Fetcher({
    hostname: config.public.defaultHttpdApiHostname,
    port: config.public.defaultHttpdApiPort,
    scheme: config.public.defaultHttpdApiScheme,
  }),
);

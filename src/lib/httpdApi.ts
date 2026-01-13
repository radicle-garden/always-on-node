import { config } from './server/config';
import { Fetcher } from './http-client/lib/fetcher';
import { Client } from './http-client/lib/repo';

export const httpdApi = new Client(
	new Fetcher({
		hostname: config.public.defaultHttpdApiHostname,
		port: config.public.defaultHttpdApiPort,
		scheme: config.public.defaultHttpdApiScheme
	})
);
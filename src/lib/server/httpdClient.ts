import { Fetcher } from '$lib/http-client/lib/fetcher';
import { Client } from '$lib/http-client/lib/repo';
import { config } from './config';

export function createHttpdClient(handle: string) {
	const scheme = config.httpdScheme;
	const port = config.httpdPort;

	return new Client(
		new Fetcher({
			hostname: `${handle}.${config.fqdn}`,
			port,
			scheme
		})
	);
}

export type { Repo } from '$lib/http-client/lib/repo';

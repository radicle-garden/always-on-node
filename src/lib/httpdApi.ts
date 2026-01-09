import { env } from '$env/dynamic/public';
import { Fetcher } from './http-client/lib/fetcher';
import { Client } from './http-client/lib/repo';

const {
	PUBLIC_DEFAULT_HTTPD_API_HOSTNAME,
	PUBLIC_DEFAULT_HTTPD_API_PORT,
	PUBLIC_DEFAULT_HTTPD_API_SCHEME
} = env;

if (
	!PUBLIC_DEFAULT_HTTPD_API_HOSTNAME ||
	!PUBLIC_DEFAULT_HTTPD_API_PORT ||
	!PUBLIC_DEFAULT_HTTPD_API_SCHEME
) {
	throw new Error(
		'PUBLIC_DEFAULT_HTTPD_API_HOSTNAME, PUBLIC_DEFAULT_HTTPD_API_PORT, and PUBLIC_DEFAULT_HTTPD_API_SCHEME must be set'
	);
}

export const httpdApi = new Client(
	new Fetcher({
		hostname: PUBLIC_DEFAULT_HTTPD_API_HOSTNAME,
		port: Number(PUBLIC_DEFAULT_HTTPD_API_PORT),
		scheme: PUBLIC_DEFAULT_HTTPD_API_SCHEME
	})
);

// TODO: Use this in the future instead of just the default above
export const newHttpdApi = (hostname: string, port: number, scheme: string) => {
	return new Client(
		new Fetcher({
			hostname,
			port,
			scheme
		})
	);
};

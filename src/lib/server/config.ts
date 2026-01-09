import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
const __dirname = path.resolve();
dotenv.config({ path: path.join(__dirname, '.env') });

export interface AppConfig {
	appSecret: string;
	databaseStoragePath: string;
	profileStoragePath: string;
	radBinaryPath: string;
	resendApiKey: string | undefined;
	emailSenderAddress: string | undefined;
	jwtExpiresIn: string;
	frontendUrl: string | undefined;
	fqdn: string | undefined;
	httpdScheme: string;
	httpdPort: number;
	nodesConnectFQDN: string | undefined;
	nodeEnv: string;
	dockerHost: string;
	radicleNodeContainer: string;
	radicleHttpdContainer: string;
}

export function getConfig(): AppConfig {
	return {
		appSecret: process.env.APP_SECRET || 'default_secret_change_me',
		databaseStoragePath: process.env.DATABASE_STORAGE_PATH || './storage',
		profileStoragePath: process.env.PROFILE_STORAGE_PATH || './profiles',
		radBinaryPath: process.env.RAD_BINARY_PATH || 'rad',
		resendApiKey: process.env.RESEND_API_KEY,
		emailSenderAddress: process.env.EMAIL_SENDER_ADDRESS,
		jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
		frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
		fqdn: process.env.FQDN || 'localhost',
		httpdScheme: process.env.HTTPD_SCHEME || 'http',
		httpdPort: Number(process.env.HTTPD_PORT) || 80,
		nodesConnectFQDN: process.env.NODES_CONNECT_FQDN,
		nodeEnv: process.env.NODE_ENV || 'production',
		dockerHost: process.env.DOCKER_HOST || 'unix:///var/run/docker.sock',
		radicleNodeContainer:
			process.env.RADICLE_NODE_CONTAINER ||
			'quay.io/radicle_garden/radicle-node:1.5.0',
		radicleHttpdContainer:
			process.env.RADICLE_HTTPD_CONTAINER ||
			'quay.io/radicle_garden/radicle-httpd:0.22.0'
	};
}

export const config = getConfig();

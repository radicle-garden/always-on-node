import { defaultHttpdPort } from '@tests/support/fixtures';
import { describe, test } from 'vitest';

import { HttpdClient } from '$lib/http-client';

const api = new HttpdClient({
	hostname: '127.0.0.1',
	port: defaultHttpdPort,
	scheme: 'http'
});

describe('client', () => {
	test('#getNodeInfo()', async () => {
		await api.getNodeInfo();
	});

	test('#getStats()', async () => {
		await api.getStats();
	});

	test('#getNode()', async () => {
		await api.getNode();
	});
});

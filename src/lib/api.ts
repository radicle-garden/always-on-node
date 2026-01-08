import type {
	ApiResponse,
	SeededRadicleRepository,
	User
} from '$types/app';

// Use relative API paths - SvelteKit will handle them
const API_BASE = '/api';

export const api = {
	get: async (url: string) => {
		const response = await fetch(url, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			},
			credentials: 'include'
		});

		if (!response.ok) {
			const error = await response.json().catch(() => ({ error: 'Request failed' }));
			throw new Error(error.error || error.message || 'Failed to get');
		}

		return response.json();
	},

	post: async (url: string, body?: unknown) => {
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify(body || {})
		});

		if (!response.ok) {
			const error = await response.json().catch(() => ({ error: 'Request failed' }));
			if (error.message) {
				throw new Error(error.message);
			} else if (error.error) {
				throw new Error(error.error);
			} else {
				return error;
			}
		}

		return response.json();
	},

	put: async (url: string, body: unknown) => {
		const response = await fetch(url, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify(body || {})
		});

		if (!response.ok) {
			const error = await response.json().catch(() => ({ error: 'Request failed' }));
			throw new Error(error.error || error.message || 'Failed to put');
		}

		return response.json();
	},

	delete: async (url: string) => {
		const response = await fetch(url, {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json'
			},
			credentials: 'include'
		});

		if (!response.ok) {
			const error = await response.json().catch(() => ({ error: 'Request failed' }));
			throw new Error(error.error || error.message || 'Failed to delete');
		}

		return response.json();
	},

	login: async (email: string, password: string): Promise<ApiResponse<User>> => {
		return await api.post(`${API_BASE}/login/password`, {
			email,
			password
		});
	},

	signup: async (handle: string, email: string, password: string): Promise<ApiResponse<User>> => {
		return await api.post(`${API_BASE}/signup`, {
			handle,
			email,
			password
		});
	},

	getMyProfile: async (): Promise<ApiResponse<User>> => {
		return await api.get(`${API_BASE}/profile`);
	},

	logout: async () => {
		return await api.post(`${API_BASE}/logout`, {});
	},

	getSeededRepositories: async (nid: string): Promise<ApiResponse<SeededRadicleRepository[]>> => {
		return await api.get(`${API_BASE}/nodes/${nid}/seeded`);
	},

	addSeededRepository: async (nid: string, rid: string) => {
		return await api.post(`${API_BASE}/nodes/${nid}/seeded/${rid}`);
	},

	deleteSeededRepository: async (nid: string, rid: string) => {
		return await api.delete(`${API_BASE}/nodes/${nid}/seeded/${rid}`);
	},

	getNodeStatus: async (nid: string): Promise<ApiResponse<string>> => {
		return await api.get(`${API_BASE}/nodes/${nid}/status`);
	},

	getNodeConfig: async (nid: string): Promise<ApiResponse<string>> => {
		return await api.get(`${API_BASE}/nodes/${nid}/config`);
	}
};

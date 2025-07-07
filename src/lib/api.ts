import { env } from '$env/dynamic/public';
import type {
	ApiResponse,
	RadicleRepositoryListItem,
	SeededRadicleRepository,
	User
} from '$types/app';

const { PUBLIC_API_URL } = env;

export const api = {
	_getCsrfToken: async () => {
		const response = await fetch(`${PUBLIC_API_URL}/csrf-token`, {
			credentials: 'include'
		});

		if (!response.ok) {
			throw new Error('Failed to get CSRF token');
		}

		return response.json();
	},
	get: async (url: string) => {
		const response = await fetch(url, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			},
			credentials: 'include'
		});

		if (!response.ok) {
			throw new Error('Failed to get');
		}

		return response.json();
	},
	post: async (url: string, body?: any) => {
		const { csrfToken } = await api._getCsrfToken();

		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-CSRF-Token': csrfToken
			},
			credentials: 'include',
			body: JSON.stringify(body || {})
		});

		if (!response.ok) {
			const error = await response.json();
			if (error.message) {
				throw new Error(error.message);
			} else if (error.error) {
				throw new Error(error.error);
			} else {
				return error
			}
		}

		return response.json();
	},
	put: async (url: string, body: any) => {
		const { csrfToken } = await api._getCsrfToken();

		const response = await fetch(url, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				'X-CSRF-Token': csrfToken,
			},
			credentials: 'include',
			body: JSON.stringify(body || {})
		});

		if (!response.ok) {
			throw new Error('Failed to put');
		}

		return response.json();
	},
	delete: async (url: string) => {
		const { csrfToken } = await api._getCsrfToken();

		const response = await fetch(url, {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json',
				'X-CSRF-Token': csrfToken
			},
			credentials: 'include'
		});

		if (!response.ok) {
			throw new Error('Failed to delete');
		}

		return response.json();
	},
	login: async (
		email: string,
		password: string
	): Promise<ApiResponse<User>> => {
		return await api.post(`${PUBLIC_API_URL}/login/password`, {
			email,
			password
		});
	},
	signup: async (
		handle: string,
		email: string,
		password: string
	): Promise<ApiResponse<User>> => {
		return await api.post(`${PUBLIC_API_URL}/signup`, {
			handle,
			email,
			password
		});
	},
	verifyEmail: async (token: string): Promise<ApiResponse<User>> => {
		return await api.get(`${PUBLIC_API_URL}/signup/verify-email?token=${token}`);
	},
	getProfile: async (handle: string): Promise<ApiResponse<User>> => {
		return await api.get(`${PUBLIC_API_URL}/${handle}`);
	},
	getMyProfile: async (): Promise<ApiResponse<User>> => {
		return await api.get(`${PUBLIC_API_URL}/profile`);
	},
	putMyProfile: async (profile: any) => {
		return await api.put(`${PUBLIC_API_URL}/profile`, profile);
	},
	addExternalNode: async (alias: string, nid: string) => {
		return await api.post(`${PUBLIC_API_URL}/profile/externalNodes/${nid}`, {
			alias,
		});
	},
	removeExternalNode: async (nid: string) => {
		return await api.delete(`${PUBLIC_API_URL}/profile/externalNodes/${nid}`);
	},
	uploadFileToS3: async (file: File, imageType: 'avatar' | 'banner'): Promise<{ fileUrl: string }> => {
		const { content: { presignedUrl, fileUrl } } = await api.post(`${PUBLIC_API_URL}/profile/${imageType}/presigned`, {
			contentType: file.type
		});
		try {
			await fetch(presignedUrl, {
				method: 'PUT',
				body: file,
				headers: {
					'Content-Type': file.type
				}
			});
			return { fileUrl };
		} catch (error) {
			console.error(error);
			throw new Error('Failed to upload file to S3');
		}
	},
	putAvatar: async (fileUrl: string) => {
		return await api.put(`${PUBLIC_API_URL}/profile/avatar`, {
			fileUrl
		});
	},
	putBanner: async (fileUrl: string) => {
		return await api.put(`${PUBLIC_API_URL}/profile/banner`, {
			fileUrl
		});
	},
	logout: async () => {
		return await api.post(`${PUBLIC_API_URL}/logout`, {});
	},
	getSeededRepositories: async (
		nodeId: string
	): Promise<ApiResponse<SeededRadicleRepository[]>> => {
		return await api.get(`${PUBLIC_API_URL}/nodes/${nodeId}/seeded`);
	},
	addSeededRepository: async (nodeId: string, rid: string) => {
		return await api.post(`${PUBLIC_API_URL}/nodes/${nodeId}/seeded/${rid}`);
	},
	deleteSeededRepository: async (nodeId: string, rid: string) => {
		return await api.delete(`${PUBLIC_API_URL}/nodes/${nodeId}/seeded/${rid}`);
	},
	getPinnedRepositories: async (
		nodeId: string
	): Promise<ApiResponse<string[]>> => {
		return await api.get(`${PUBLIC_API_URL}/nodes/${nodeId}/pinned`);
	},
	addPinnedRepository: async (nodeId: string, rid: string) => {
		return await api.post(`${PUBLIC_API_URL}/nodes/${nodeId}/pinned/${rid}`);
	},
	deletePinnedRepository: async (nodeId: string, rid: string) => {
		return await api.delete(`${PUBLIC_API_URL}/nodes/${nodeId}/pinned/${rid}`);
	},
	getRadicleRepositoryList: async (): Promise<RadicleRepositoryListItem[]> => {
		const response = await fetch('https://search.radicle.xyz/repolist.txt');
		const text = await response.text();
		return text.split('\n').map((line) => {
			// Example line (it looks like there is a space as the first character on each line?)
			// wizadventure_v_1.1                                                rad:z4VEaMjKK7rZuzEVLGCpiAHrTk16P      Lil outdated idea of a text rendering engine, if this somehow ever gets found, leave an issue pls?
			// Split on 6 or more spaces
			const [name, rid, desc] = line.split(/\s{6,}/);
			return { name, rid, desc };
		});
	},
	getNodeStatus: async (nodeId: string): Promise<ApiResponse<string>> => {
		return await api.get(`${PUBLIC_API_URL}/nodes/${nodeId}/status`);
	},
	getNodeConfig: async (nodeId: string): Promise<ApiResponse<string>> => {
		return await api.get(`${PUBLIC_API_URL}/nodes/${nodeId}/config`);
	}
};

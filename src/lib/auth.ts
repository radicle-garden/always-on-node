import { goto } from '$app/navigation';
import { api } from './api';
import { setUser, clearUser, setRadicleRepositoryList } from './state';

export const login = async (email: string, password: string) => {
	try {
		const { content: user, error } = await api.login(email, password);
		setUser(user);
		return { success: true, user };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Login failed'
		};
	}
};

export const logout = async () => {
	try {
		await api.logout();
	} catch (error) {
		console.error('Error during logout:', error);
	} finally {
		clearUser();
	}
};

export const initialiseUser = async () => {
	try {
		const { content: user } = await api.getMyProfile();
		setUser(user);
		return true;
	} catch (error) {
		clearUser();
		return false;
	}
};

export const initializeRadicleRepositoryList = async () => {
	const list = await api.getRadicleRepositoryList();
	setRadicleRepositoryList(list);
};

export const checkAuth = async () => {
	try {
		const { content: user } = await api.getMyProfile();
		return { authenticated: true, user };
	} catch (error) {
		goto('/login');
	}
};

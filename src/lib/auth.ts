import { goto } from '$app/navigation';
import { api } from './api';
import { setUser, clearUser } from './state';

export const login = async (email: string, password: string) => {
	try {
		const { content: user } = await api.login(email, password);
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
		return user;
	} catch (error) {
		clearUser();
		return false;
	}
};

export const refreshUser = async () => {
	try {
		const { content: user } = await api.getMyProfile();
		setUser(user);
	} catch (error) {
		clearUser();
	}
}

export const checkAuth = async () => {
	try {
		const { content: user } = await api.getMyProfile();
		return { authenticated: true, user };
	} catch (error) {
		goto('/login');
	}
};
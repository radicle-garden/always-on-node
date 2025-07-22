import type { RadicleRepositoryListItem, User } from '$types/app';
import { derived, get, writable } from 'svelte/store';
import { api } from './api';

export const user = writable<User | null>(null);
export const isLoggedIn = derived(user, ($user) => $user !== null);
export const nodes = derived(user, ($user) => $user?.nodes);
export const gardenNode = derived(nodes, ($nodes) => $nodes?.[0]);

export const radicleRepositoryList = writable<RadicleRepositoryListItem[]>([]);

export const setUser = (u: User) => {
	user.set(u);
};

export const clearUser = () => {
	user.set(null);
};

export const setRadicleRepositoryList = (list: RadicleRepositoryListItem[]) => {
	radicleRepositoryList.set(list);
};

export const findRespositoryByRid = (rid: string) => {
	return get(radicleRepositoryList).find((repo) => repo.rid === rid);
};

export const findRepositoriesByFuzzyTerm = (term: string) => {
	return (
		get(radicleRepositoryList).filter((repo) => {
			const repoName = repo.name.toLowerCase();
			const repoDescription = repo.desc?.toLowerCase() ?? '';
			return repoName.includes(term) || repoDescription.includes(term);
		}) || []
	);
};

export const mySeededRepositories = derived(gardenNode, ($gardenNode) => {
	return api.getSeededRepositories($gardenNode!.node_id)
})
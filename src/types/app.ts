export type User = {
	id: number;
	email: string;
	handle: string;
	nodes: Node[];
	created_at: Date;
	github_account_id: number;
	deleted: boolean;
	description: string;
	avatar_img: string;
	banner_img: string;
};

export type Node = {
	id: number;
	did: string;
	alias: string;
	ssh_public_key: string;
	node_id: string;
	user: User;
	seededRepositories: SeededRadicleRepository[];
	pinnedRepositories: PinnedRadicleRepository[];
	created_at: Date;
	deleted: boolean;
	external: boolean;
	connect_address: string;

	// Frontend only
	is_running?: boolean;
	peers?: number;
	since_seconds?: number;
};

export type SeededRadicleRepository = {
	id: number;
	repository_id: string;
	seeding: boolean;
	seeding_start: Date;
	seeding_end: Date;
	node?: Node;
};

export type PinnedRadicleRepository = {
	id: number;
	repository_id: string;
	node?: Node;
};

export type RadicleRepositoryListItem = {
	name: string;
	rid: string;
	desc: string;
};

export type ApiResponse<T> = {
	content: T;
	success: boolean;
	statusCode: number;
	message?: string;
	error?: string | [];
};

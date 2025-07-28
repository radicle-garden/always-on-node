export type User = {
	id: number;
	email: string;
	handle: string;
	nodes: Node[];
	created_at: string;
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

export enum OrganisationUserRole {
	ADMIN = 'admin',
	MEMBER = 'member'
}

export type OrganisationUser = {
	handle: string;
	avatar_img: string;
	role: OrganisationUserRole;
};

export type Organisation = {
	name: string;
	members: OrganisationUser[];
	admins: OrganisationUser[];
	invited: string[]
};

export type ApiResponse<T> = {
	content: T;
	success: boolean;
	statusCode: number;
	message?: string;
	error?: string | [];
};

export type WeeklyActivity = {
	date: string;
	time: number;
	commits: number[];
	week: number;
};

export enum WebhookTriggerEvent {
	PATCH_CREATED = 'Patch Created',
	PATCH_UPDATED = 'Patch Updated',
	BRANCH_UPDATED = 'Branch Updated',
	BRANCH_DELETED = 'Branch Deleted',
	TAG_CREATED = 'Tag Created',
	TAG_UPDATED = 'Tag Updated',
	TAG_DELETED = 'Tag Deleted',
}

export type RepositoryWebhookSettings = {
	location: string;
	secret: string;
	triggers: {
		event: WebhookTriggerEvent;
		branch?: string;
	}[];
	createdAt?: string;
}

export type SavedRepositoryWebhookSettings = {
	uuid: string;
	content_type: string;
	created_date: string;
	repo_id: string;
	triggers: string;
	url: string;
}
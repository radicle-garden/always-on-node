CREATE TABLE "node" (
	"id" serial PRIMARY KEY NOT NULL,
	"did" text NOT NULL,
	"alias" text NOT NULL,
	"ssh_public_key" text NOT NULL,
	"node_id" text NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL,
	"connect_address" text,
	CONSTRAINT "node_node_id_unique" UNIQUE("node_id")
);
--> statement-breakpoint
CREATE TABLE "seeded_radicle_repository" (
	"id" serial PRIMARY KEY NOT NULL,
	"repository_id" text NOT NULL,
	"node_id" integer NOT NULL,
	"seeding" boolean NOT NULL,
	"seeding_start" timestamp with time zone NOT NULL,
	"seeding_end" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL,
	"handle" text NOT NULL,
	"description" text,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_handle_unique" UNIQUE("handle")
);
--> statement-breakpoint
ALTER TABLE "node" ADD CONSTRAINT "node_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seeded_radicle_repository" ADD CONSTRAINT "seeded_radicle_repository_node_id_node_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."node"("id") ON DELETE no action ON UPDATE no action;
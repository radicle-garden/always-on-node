CREATE TABLE "repo_commit_status" (
	"node_id" text NOT NULL,
	"repo_id" text NOT NULL,
	"sha" text NOT NULL,
	"state" text NOT NULL,
	"description" text,
	"target_url" text,
	"context" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "repo_commit_status_node_id_repo_id_sha_context_pk" PRIMARY KEY("node_id","repo_id","sha","context")
);
--> statement-breakpoint
CREATE TABLE "webhook_invocation" (
	"uuid" text PRIMARY KEY NOT NULL,
	"webhook_uuid" text NOT NULL,
	"response_status_code" integer,
	"response_headers" text,
	"response_payload" text,
	"error_message" text,
	"timestamp" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "webhook_repo_configuration" (
	"node_id" text NOT NULL,
	"repo_id" text NOT NULL,
	"url" text,
	"context" text NOT NULL,
	"content_type" text,
	"secret" text,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "webhook_trigger_event" (
	"uuid" text PRIMARY KEY NOT NULL,
	"event_type" text,
	"repo_id" text,
	"timestamp" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "webhook" (
	"uuid" text PRIMARY KEY NOT NULL,
	"event_uuid" text NOT NULL,
	"url" text,
	"name" text,
	"content_type" text,
	"request_headers" text,
	"request_payload" text
);
--> statement-breakpoint
ALTER TABLE "webhook_invocation" ADD CONSTRAINT "webhook_invocation_webhook_uuid_webhook_uuid_fk" FOREIGN KEY ("webhook_uuid") REFERENCES "public"."webhook"("uuid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook" ADD CONSTRAINT "webhook_event_uuid_webhook_trigger_event_uuid_fk" FOREIGN KEY ("event_uuid") REFERENCES "public"."webhook_trigger_event"("uuid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "webhook_invocation_webhook_uuid_idx" ON "webhook_invocation" USING btree ("webhook_uuid");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_repo_configuration_unique_idx" ON "webhook_repo_configuration" USING btree ("node_id","repo_id","context");--> statement-breakpoint
CREATE INDEX "webhook_event_uuid_idx" ON "webhook" USING btree ("event_uuid");
ALTER TABLE "user" DROP CONSTRAINT "user_email_unique";--> statement-breakpoint
ALTER TABLE "user" DROP CONSTRAINT "user_handle_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_unique_idx" ON "user" USING btree ("email") WHERE "user"."deleted" IS NOT TRUE;--> statement-breakpoint
CREATE UNIQUE INDEX "user_handle_unique_idx" ON "user" USING btree ("handle") WHERE "user"."deleted" IS NOT TRUE;
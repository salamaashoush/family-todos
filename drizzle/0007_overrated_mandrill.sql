CREATE TABLE "member_invite_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer NOT NULL,
	"family_id" integer NOT NULL,
	"email" varchar(320) NOT NULL,
	"token" varchar(64) NOT NULL,
	"role" varchar(20) DEFAULT 'admin' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "member_invite_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "families" DROP CONSTRAINT "families_slug_unique";--> statement-breakpoint
ALTER TABLE "families" ALTER COLUMN "share_token" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "linked_user_id" integer;--> statement-breakpoint
ALTER TABLE "member_invite_tokens" ADD CONSTRAINT "member_invite_tokens_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_invite_tokens" ADD CONSTRAINT "member_invite_tokens_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_member_invite_token" ON "member_invite_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_member_invite_member" ON "member_invite_tokens" USING btree ("member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_member_invite_email_family" ON "member_invite_tokens" USING btree ("email","family_id");--> statement-breakpoint
CREATE INDEX "idx_members_linked_user" ON "members" USING btree ("linked_user_id");
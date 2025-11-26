CREATE TABLE "admin_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(100) NOT NULL,
	"email" varchar(320),
	"password_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_login_at" timestamp,
	CONSTRAINT "admin_users_username_unique" UNIQUE("username"),
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_families" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"family_id" integer NOT NULL,
	"role" varchar(20) DEFAULT 'admin' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timeslot_completions" (
	"id" serial PRIMARY KEY NOT NULL,
	"timeslot_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"completion_date" date NOT NULL,
	"completed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "todo_completions" (
	"id" serial PRIMARY KEY NOT NULL,
	"todo_id" integer NOT NULL,
	"timeslot_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"completion_date" date NOT NULL,
	"completed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "families" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100),
	"subscription_tier" varchar(50) DEFAULT 'free',
	"is_onboarded" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "families_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" serial PRIMARY KEY NOT NULL,
	"family_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"avatar" text,
	"is_parent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timeslot_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"timeslot_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timeslots" (
	"id" serial PRIMARY KEY NOT NULL,
	"family_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"recurrence_type" varchar(20) DEFAULT 'daily' NOT NULL,
	"recurrence_days" varchar(50),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "todo_timeslots" (
	"id" serial PRIMARY KEY NOT NULL,
	"todo_id" integer NOT NULL,
	"timeslot_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "todos" (
	"id" serial PRIMARY KEY NOT NULL,
	"family_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"image_url" text,
	"symbol" varchar(50),
	"position" integer DEFAULT 0 NOT NULL,
	"points" integer DEFAULT 5 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "achievements" (
	"id" serial PRIMARY KEY NOT NULL,
	"family_id" integer,
	"name" varchar(255) NOT NULL,
	"description" text,
	"icon" varchar(100),
	"requirement_type" varchar(50) NOT NULL,
	"requirement_value" integer NOT NULL,
	"star_reward" integer DEFAULT 0 NOT NULL,
	"is_global" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_achievements" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer NOT NULL,
	"achievement_id" integer NOT NULL,
	"earned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer NOT NULL,
	"total_stars" integer DEFAULT 0 NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"total_tasks_completed" integer DEFAULT 0 NOT NULL,
	"total_timeslots_completed" integer DEFAULT 0 NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"last_completion_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "member_stats_member_id_unique" UNIQUE("member_id")
);
--> statement-breakpoint
CREATE TABLE "point_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"type" varchar(20) NOT NULL,
	"description" text,
	"todo_id" integer,
	"reward_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reward_redemptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer NOT NULL,
	"reward_id" integer NOT NULL,
	"points_spent" integer NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	"processed_by" integer,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "rewards" (
	"id" serial PRIMARY KEY NOT NULL,
	"family_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"icon" varchar(100),
	"point_cost" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "layout_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"family_id" integer NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_families" ADD CONSTRAINT "user_families_user_id_admin_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_families" ADD CONSTRAINT "user_families_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeslot_completions" ADD CONSTRAINT "timeslot_completions_timeslot_id_timeslots_id_fk" FOREIGN KEY ("timeslot_id") REFERENCES "public"."timeslots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeslot_completions" ADD CONSTRAINT "timeslot_completions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todo_completions" ADD CONSTRAINT "todo_completions_todo_id_todos_id_fk" FOREIGN KEY ("todo_id") REFERENCES "public"."todos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todo_completions" ADD CONSTRAINT "todo_completions_timeslot_id_timeslots_id_fk" FOREIGN KEY ("timeslot_id") REFERENCES "public"."timeslots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todo_completions" ADD CONSTRAINT "todo_completions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeslot_members" ADD CONSTRAINT "timeslot_members_timeslot_id_timeslots_id_fk" FOREIGN KEY ("timeslot_id") REFERENCES "public"."timeslots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeslot_members" ADD CONSTRAINT "timeslot_members_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeslots" ADD CONSTRAINT "timeslots_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todo_timeslots" ADD CONSTRAINT "todo_timeslots_todo_id_todos_id_fk" FOREIGN KEY ("todo_id") REFERENCES "public"."todos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todo_timeslots" ADD CONSTRAINT "todo_timeslots_timeslot_id_timeslots_id_fk" FOREIGN KEY ("timeslot_id") REFERENCES "public"."timeslots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todos" ADD CONSTRAINT "todos_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_achievements" ADD CONSTRAINT "member_achievements_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_achievements" ADD CONSTRAINT "member_achievements_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_stats" ADD CONSTRAINT "member_stats_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_todo_id_todos_id_fk" FOREIGN KEY ("todo_id") REFERENCES "public"."todos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_reward_id_rewards_id_fk" FOREIGN KEY ("reward_id") REFERENCES "public"."rewards"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_reward_id_rewards_id_fk" FOREIGN KEY ("reward_id") REFERENCES "public"."rewards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "layout_settings" ADD CONSTRAINT "layout_settings_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_admin_users_username" ON "admin_users" USING btree ("username");--> statement-breakpoint
CREATE INDEX "idx_admin_users_email" ON "admin_users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_family_unique" ON "user_families" USING btree ("user_id","family_id");--> statement-breakpoint
CREATE INDEX "idx_user_families_user" ON "user_families" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_families_family" ON "user_families" USING btree ("family_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_timeslot_completion_unique" ON "timeslot_completions" USING btree ("timeslot_id","member_id","completion_date");--> statement-breakpoint
CREATE INDEX "idx_timeslot_completions_date" ON "timeslot_completions" USING btree ("completion_date");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_todo_completion_unique" ON "todo_completions" USING btree ("todo_id","timeslot_id","member_id","completion_date");--> statement-breakpoint
CREATE INDEX "idx_todo_completions_date" ON "todo_completions" USING btree ("completion_date");--> statement-breakpoint
CREATE INDEX "idx_todo_completions_member_date" ON "todo_completions" USING btree ("member_id","completion_date");--> statement-breakpoint
CREATE INDEX "idx_members_family" ON "members" USING btree ("family_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_timeslot_member_unique" ON "timeslot_members" USING btree ("timeslot_id","member_id");--> statement-breakpoint
CREATE INDEX "idx_timeslot_members_timeslot" ON "timeslot_members" USING btree ("timeslot_id");--> statement-breakpoint
CREATE INDEX "idx_timeslot_members_member" ON "timeslot_members" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_timeslots_family" ON "timeslots" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "idx_timeslots_family_active" ON "timeslots" USING btree ("family_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_todo_timeslot_unique" ON "todo_timeslots" USING btree ("todo_id","timeslot_id");--> statement-breakpoint
CREATE INDEX "idx_todo_timeslots_todo" ON "todo_timeslots" USING btree ("todo_id");--> statement-breakpoint
CREATE INDEX "idx_todo_timeslots_timeslot" ON "todo_timeslots" USING btree ("timeslot_id");--> statement-breakpoint
CREATE INDEX "idx_todos_family" ON "todos" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "idx_todos_family_position" ON "todos" USING btree ("family_id","position");--> statement-breakpoint
CREATE INDEX "idx_achievements_family" ON "achievements" USING btree ("family_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_member_achievement_unique" ON "member_achievements" USING btree ("member_id","achievement_id");--> statement-breakpoint
CREATE INDEX "idx_member_achievements_member" ON "member_achievements" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_member_stats_member" ON "member_stats" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_point_transactions_member" ON "point_transactions" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_point_transactions_type" ON "point_transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_reward_redemptions_member" ON "reward_redemptions" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_reward_redemptions_status" ON "reward_redemptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_rewards_family" ON "rewards" USING btree ("family_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_layout_settings_family_key" ON "layout_settings" USING btree ("family_id","key");--> statement-breakpoint
CREATE INDEX "idx_layout_settings_family" ON "layout_settings" USING btree ("family_id");
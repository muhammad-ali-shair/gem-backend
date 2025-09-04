CREATE TABLE "accolades" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "accolades_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"accolade_type" text NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"multiplier" real DEFAULT 0 NOT NULL,
	"unlocked_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activities" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "activities_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"activity_type" text NOT NULL,
	"points" integer NOT NULL,
	"transaction_hash" text,
	"block_number" integer,
	"metadata" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blockchain_events" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "blockchain_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"event_type" text NOT NULL,
	"transaction_hash" text NOT NULL,
	"block_number" integer NOT NULL,
	"user_address" text NOT NULL,
	"metadata" text,
	"processed" boolean DEFAULT false NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "point_configs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "point_configs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"activity_type" text NOT NULL,
	"base_points" integer NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "point_configs_activity_type_unique" UNIQUE("activity_type")
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "referrals_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"referrer_id" integer NOT NULL,
	"referee_id" integer NOT NULL,
	"points_earned" integer DEFAULT 0 NOT NULL,
	"is_qualified" boolean DEFAULT false NOT NULL,
	"qualification_amount" real DEFAULT 0 NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_wallets" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_wallets_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"wallet_address" text NOT NULL,
	"label" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "user_wallets_wallet_address_unique" UNIQUE("wallet_address")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"wallet_address" text NOT NULL,
	"username" text,
	"display_name" text,
	"avatar" text,
	"bio" text,
	"twitter_handle" text,
	"telegram_handle" text,
	"discord_handle" text,
	"website_url" text,
	"custom_referral_code" text,
	"total_points" integer DEFAULT 0 NOT NULL,
	"referral_code" text,
	"referred_by" integer,
	"is_influencer" boolean DEFAULT false NOT NULL,
	"is_main_account" boolean DEFAULT true NOT NULL,
	"parent_user_id" integer,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "users_wallet_address_unique" UNIQUE("wallet_address"),
	CONSTRAINT "users_custom_referral_code_unique" UNIQUE("custom_referral_code"),
	CONSTRAINT "users_referral_code_unique" UNIQUE("referral_code")
);

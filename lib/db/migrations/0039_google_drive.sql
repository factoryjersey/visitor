CREATE TABLE IF NOT EXISTS "google_drive" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"email" text,
	"refresh_token" text NOT NULL,
	"folder_id" text,
	"connected_by" text,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "google_drive" ENABLE ROW LEVEL SECURITY;

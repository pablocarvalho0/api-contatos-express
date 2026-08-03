-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "contact_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"contact_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	CONSTRAINT "contact_groups_unique" UNIQUE("contact_id","group_id")
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"email" varchar(200) NOT NULL CONSTRAINT "contacts_email_key" UNIQUE,
	"phone" varchar(20),
	"active" boolean DEFAULT true,
	"obs" text DEFAULT 'no obs'
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL CONSTRAINT "groups_name_key" UNIQUE
);
--> statement-breakpoint
CREATE INDEX "idx_contact_groups_group_id" ON "contact_groups" ("group_id");--> statement-breakpoint
ALTER TABLE "contact_groups" ADD CONSTRAINT "contact_groups_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "contact_groups" ADD CONSTRAINT "contact_groups_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE;
*/
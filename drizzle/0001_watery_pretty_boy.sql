ALTER TABLE "admins" ADD COLUMN "whatsapp" varchar(20);--> statement-breakpoint
ALTER TABLE "admins" ADD COLUMN "reset_token" varchar(6);--> statement-breakpoint
ALTER TABLE "admins" ADD COLUMN "reset_expires" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_method" varchar(50) DEFAULT 'presencial' NOT NULL;--> statement-breakpoint
ALTER TABLE "admins" ADD CONSTRAINT "admins_email_unique" UNIQUE("email");--> statement-breakpoint
ALTER TABLE "admins" ADD CONSTRAINT "admins_whatsapp_unique" UNIQUE("whatsapp");
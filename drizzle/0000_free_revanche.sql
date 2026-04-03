CREATE TYPE "public"."admin_role" AS ENUM('admin', 'super_admin');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pedido-recebido', 'preparando', 'pronto', 'saiu-para-entrega', 'entregue', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."order_tipo" AS ENUM('entrega', 'retirada');--> statement-breakpoint
CREATE TYPE "public"."promotion_tipo" AS ENUM('percentual', 'fixo');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"senha_hash" varchar(255) NOT NULL,
	"role" "admin_role" DEFAULT 'admin' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"whatsapp" varchar(20) NOT NULL,
	"nome" varchar(255) NOT NULL,
	"apelido" varchar(100) NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"titulo" varchar(255) NOT NULL,
	"corpo" text NOT NULL,
	"tipo" varchar(50) NOT NULL,
	"destinatarios" jsonb,
	"enviado" integer DEFAULT 0 NOT NULL,
	"enviado_em" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"tipo" "order_tipo" NOT NULL,
	"localidade" varchar(100),
	"endereco" text,
	"horario_retirada" varchar(10),
	"observacoes" text,
	"items" jsonb NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"status" "order_status" DEFAULT 'pedido-recebido' NOT NULL,
	"mp_preference_id" varchar(255),
	"mp_payment_id" varchar(255),
	"payment_status" varchar(50) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotions" (
	"id" serial PRIMARY KEY NOT NULL,
	"titulo" varchar(255) NOT NULL,
	"descricao" text,
	"desconto" numeric(5, 2) NOT NULL,
	"tipo" "promotion_tipo" DEFAULT 'percentual' NOT NULL,
	"ativo" integer DEFAULT 1 NOT NULL,
	"data_inicio" timestamp,
	"data_fim" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"endpoint" text NOT NULL,
	"auth" varchar(255) NOT NULL,
	"p256dh" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" varchar(255) PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"open_id" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"login_method" varchar(64),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_signed_in" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "admins_email_unique" ON "admins" USING btree ("email");--> statement-breakpoint
CREATE INDEX "customers_whatsapp_unique" ON "customers" USING btree ("whatsapp");--> statement-breakpoint
CREATE INDEX "push_subscriptions_customer_id" ON "push_subscriptions" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "users_openId_unique" ON "users" USING btree ("open_id");
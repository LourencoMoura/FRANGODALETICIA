import { pgTable, pgEnum, serial, varchar, timestamp, text, jsonb, numeric, index, integer } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// Enums definition for PostgreSQL
export const adminRoleEnum = pgEnum('admin_role', ['admin', 'super_admin']);
export const orderTipoEnum = pgEnum('order_tipo', ['entrega', 'retirada']);
export const orderStatusEnum = pgEnum('order_status', ['pedido-recebido', 'preparando', 'pronto', 'saiu-para-entrega', 'entregue', 'cancelado']);
export const promotionTipoEnum = pgEnum('promotion_tipo', ['percentual', 'fixo']);
export const userRoleEnum = pgEnum('user_role', ['user', 'admin']);

export const admins = pgTable("admins", {
	id: serial("id").primaryKey().notNull(),
	email: varchar("email", { length: 255 }).notNull().unique(),
	senhaHash: varchar("senha_hash", { length: 255 }).notNull(),
	role: adminRoleEnum("role").default('admin').notNull(),
	whatsapp: varchar("whatsapp", { length: 20 }).unique(),
	resetToken: varchar("reset_token", { length: 6 }),
	resetExpires: timestamp("reset_expires", { mode: 'date' }),
	createdAt: timestamp("created_at", { mode: 'date' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'date' }).defaultNow().notNull(),
},
(table) => [
	index("admins_email_unique").on(table.email),
]);

export const customers = pgTable("customers", {
	id: serial("id").primaryKey().notNull(),
	whatsapp: varchar("whatsapp", { length: 20 }).notNull(),
	nome: varchar("nome", { length: 255 }).notNull(),
	apelido: varchar("apelido", { length: 100 }).notNull(),
	points: integer("points").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'date' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'date' }).defaultNow().notNull(),
},
(table) => [
	index("customers_whatsapp_unique").on(table.whatsapp),
]);

export const notifications = pgTable("notifications", {
	id: serial("id").primaryKey().notNull(),
	titulo: varchar("titulo", { length: 255 }).notNull(),
	corpo: text("corpo").notNull(),
	tipo: varchar("tipo", { length: 50 }).notNull(),
	destinatarios: jsonb("destinatarios"),
	enviado: integer("enviado").default(0).notNull(),
	enviadoEm: timestamp("enviado_em", { mode: 'date' }),
	createdAt: timestamp("created_at", { mode: 'date' }).defaultNow().notNull(),
});

export const orders = pgTable("orders", {
	id: serial("id").primaryKey().notNull(),
	customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
	tipo: orderTipoEnum("tipo").notNull(),
	localidade: varchar("localidade", { length: 100 }),
	endereco: text("endereco"),
	horarioRetirada: varchar("horario_retirada", { length: 10 }),
	observacoes: text("observacoes"),
	items: jsonb("items").notNull(),
	total: numeric("total", { precision: 10, scale: 2 }).notNull(),
	status: orderStatusEnum("status").default('pedido-recebido').notNull(),
	mpPreferenceId: varchar("mp_preference_id", { length: 255 }),
	mpPaymentId: varchar("mp_payment_id", { length: 255 }),
	paymentStatus: varchar("payment_status", { length: 50 }).default('pending').notNull(),
	paymentMethod: varchar("payment_method", { length: 50 }).default('presencial').notNull(),
	createdAt: timestamp("created_at", { mode: 'date' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'date' }).defaultNow().notNull(),
});

export const products = pgTable("products", {
	id: serial("id").primaryKey().notNull(),
	name: varchar("name", { length: 255 }).notNull(),
	price: numeric("price", { precision: 10, scale: 2 }).notNull(),
	description: text("description"),
	createdAt: timestamp("created_at", { mode: 'date' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'date' }).defaultNow().notNull(),
});

export const pushSubscriptions = pgTable("push_subscriptions", {
	id: serial("id").primaryKey().notNull(),
	customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
	endpoint: text("endpoint").notNull(),
	auth: varchar("auth", { length: 255 }).notNull(),
	p256dh: varchar("p256dh", { length: 255 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'date' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'date' }).defaultNow().notNull(),
},
(table) => [
	index("push_subscriptions_customer_id").on(table.customerId),
]);

export const promotions = pgTable("promotions", {
	id: serial("id").primaryKey().notNull(),
	titulo: varchar("titulo", { length: 255 }).notNull(),
	descricao: text("descricao"),
	desconto: numeric("desconto", { precision: 5, scale: 2 }).notNull(),
	tipo: promotionTipoEnum("tipo").default('percentual').notNull(),
	ativo: integer("ativo").default(1).notNull(),
	dataInicio: timestamp("data_inicio", { mode: 'date' }),
	dataFim: timestamp("data_fim", { mode: 'date' }),
	createdAt: timestamp("created_at", { mode: 'date' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'date' }).defaultNow().notNull(),
});

export const settings = pgTable("settings", {
	key: varchar("key", { length: 255 }).primaryKey().notNull(),
	value: text("value").notNull(),
	updatedAt: timestamp("updated_at", { mode: 'date' }).defaultNow().notNull(),
});

export const users = pgTable("users", {
	id: serial("id").primaryKey().notNull(),
	openId: varchar("open_id", { length: 64 }).notNull(),
	name: text("name"),
	email: varchar("email", { length: 320 }),
	loginMethod: varchar("login_method", { length: 64 }),
	role: userRoleEnum("role").default('user').notNull(),
	createdAt: timestamp("created_at", { mode: 'date' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'date' }).defaultNow().notNull(),
	lastSignedIn: timestamp("last_signed_in", { mode: 'date' }).defaultNow().notNull(),
},
(table) => [
	index("users_openId_unique").on(table.openId),
]);

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = typeof admins.$inferInsert;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
export type Promotion = typeof promotions.$inferSelect;
export type InsertPromotion = typeof promotions.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type InsertSetting = typeof settings.$inferInsert;

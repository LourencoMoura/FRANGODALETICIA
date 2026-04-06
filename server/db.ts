import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and, desc, sql } from "drizzle-orm";
import * as schema from "../drizzle/schema.js";
import {
  type InsertUser,
  users,
  orders,
  pushSubscriptions,
  customers,
  type Admin,
  type InsertAdmin,
  admins,
} from "../drizzle/schema.js";

export {
  type InsertUser,
  users,
  orders,
  pushSubscriptions,
  customers,
  type Admin,
  type InsertAdmin,
  admins,
};
import { ENV } from "./_core/env.js";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      console.log(
        `[Database] [Boot] Attempting connection to: ${process.env.DATABASE_URL.substring(0, 30)}...`
      );

      const client = postgres(process.env.DATABASE_URL, {
        prepare: false,
        ssl: "require",
        connect_timeout: 5, // Reduzi para 5s para não dar timeout no servidor Vercel
        max: 5, // Reduzi o pool para ser mais leve
        onnotice: () => {}, // Silenciar avisos que poluem o log
      });

      _db = drizzle(client, { schema });
      console.log("[Database] [Success] Drizzle core initialized.");
    } catch (error: any) {
      console.error(
        "[Database] [CRITICAL ERROR] Failed during initialization:",
        error.message
      );
      _db = null; // Garantir que não vamos tentar usar um cliente quebrado
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db
      .insert(users)
      .values(values)
      .onConflictDoUpdate({
        target: users.openId,
        set: updateSet as any,
      });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Create order with Drizzle ORM
export async function createOrder(orderData: {
  customerId: number;
  tipo: "entrega" | "retirada";
  localidade: string | null;
  endereco: string | null;
  horarioRetirada: string | null;
  observacoes: string | null;
  items: any[];
  total: number;
  paymentMethod: string;
}) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const result = await db
      .insert(orders)
      .values({
        customerId: orderData.customerId,
        tipo: orderData.tipo,
        localidade: orderData.localidade,
        endereco: orderData.endereco,
        horarioRetirada: orderData.horarioRetirada,
        observacoes: orderData.observacoes,
        items: orderData.items,
        total: orderData.total.toString(),
        status: "pedido-recebido",
        paymentMethod: orderData.paymentMethod,
      })
      .returning({ id: orders.id });

    return { insertId: result[0]?.id || 0 };
  } catch (error) {
    console.error("[Database] Failed to create order:", error);
    throw error;
  }
}

// Get order by ID
export async function getOrderById(orderId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const result = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("[Database] Failed to get order:", error);
    throw error;
  }
}

// Get orders by customer ID
export async function getOrdersByCustomerId(customerId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const result = await db
      .select()
      .from(orders)
      .where(eq(orders.customerId, customerId));
    return result;
  } catch (error) {
    console.error("[Database] Failed to get orders by customer:", error);
    throw error;
  }
}

// Get all orders
export async function getAllOrders() {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const result = await db.select().from(orders);
    return result;
  } catch (error) {
    console.error("[Database] Failed to get all orders:", error);
    throw error;
  }
}

// Push Subscription functions
export async function savePushSubscription(
  customerId: number,
  subscription: any
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    // Check if subscription already exists
    const existing = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, subscription.endpoint))
      .limit(1);

    if (existing && existing.length > 0) {
      // Update existing subscription
      await db
        .update(pushSubscriptions)
        .set({
          auth: subscription.keys.auth,
          p256dh: subscription.keys.p256dh,
          updatedAt: new Date(),
        })
        .where(eq(pushSubscriptions.endpoint, subscription.endpoint));
    } else {
      // Insert new subscription
      await db.insert(pushSubscriptions).values({
        customerId,
        endpoint: subscription.endpoint,
        auth: subscription.keys.auth,
        p256dh: subscription.keys.p256dh,
      });
    }
    return true;
  } catch (error) {
    console.error("[Database] Failed to save push subscription:", error);
    throw error;
  }
}

// Get push subscriptions for a customer
export async function getPushSubscriptions(customerId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const result = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.customerId, customerId));
    return result;
  } catch (error) {
    console.error("[Database] Failed to get push subscriptions:", error);
    throw error;
  }
}

// Get all push subscriptions
export async function getAllPushSubscriptions() {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const result = await db.select().from(pushSubscriptions);
    return result;
  } catch (error) {
    console.error("[Database] Failed to get all push subscriptions:", error);
    throw error;
  }
}

// Delete push subscription
export async function deletePushSubscription(endpoint: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    await db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint));
    return true;
  } catch (error) {
    console.error("[Database] Failed to delete push subscription:", error);
    throw error;
  }
}

// Admin Functions
export async function getAdminByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db
      .select()
      .from(admins)
      .where(eq(admins.email, email))
      .limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Failed to get admin by email:", error);
    return null;
  }
}

export async function getAdminById(id: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db
      .select()
      .from(admins)
      .where(eq(admins.id, id))
      .limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Failed to get admin by id:", error);
    return null;
  }
}

export async function updateAdminPassword(
  adminId: number,
  passwordHash: string
) {
  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .update(admins)
      .set({ senhaHash: passwordHash, updatedAt: new Date() })
      .where(eq(admins.id, adminId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to update admin password:", error);
    return false;
  }
}

export async function setAdminResetToken(
  email: string,
  token: string,
  expires: Date
) {
  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .update(admins)
      .set({ resetToken: token, resetExpires: expires, updatedAt: new Date() })
      .where(eq(admins.email, email));
    return true;
  } catch (error) {
    console.error("[Database] Failed to set admin reset token:", error);
    return false;
  }
}

export async function createAdmin(data: InsertAdmin) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db
      .insert(admins)
      .values(data)
      .returning({ id: admins.id });
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Failed to create admin:", error);
    return null;
  }
}

import { eq } from "drizzle-orm";
import { getDb } from "../db/config";
import { users, type User, type InsertUser } from "../db/schema";

/**
 * Repository para operações com usuários/operadores
 * Responsabilidade: Acesso a dados de usuários (Single Responsibility)
 */

/**
 * Busca todos os usuários
 */
export async function getAllUsers(): Promise<User[]> {
  const db = await getDb();
  return db.select().from(users);
}

/**
 * Busca usuário por email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const db = await getDb();
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  
  return result[0] || null;
}

/**
 * Busca usuário por ID
 */
export async function getUserById(id: number): Promise<User | null> {
  const db = await getDb();
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  
  return result[0] || null;
}

/**
 * Atualiza ou insere usuários (para sincronização)
 */
export async function upsertUsers(userList: InsertUser[]): Promise<void> {
  if (userList.length === 0) return;
  
  const db = await getDb();
  
  for (const user of userList) {
    const existing = await getUserById(user.id!);
    
    if (existing) {
      // Atualizar apenas nome, email e role - NUNCA a senha
      // A senha local pode ser diferente (texto plano para debug)
      await db
        .update(users)
        .set({
          name: user.name,
          email: user.email,
          role: user.role,
          // passwordHash mantém o valor local existente
        })
        .where(eq(users.id, user.id!));
    } else {
      await db.insert(users).values(user);
    }
  }
  
  console.log(`[Users Repository] Upserted ${userList.length} users`);
}

/**
 * Limpa todos os usuários (usado antes de sincronização completa)
 */
export async function clearAllUsers(): Promise<void> {
  const db = await getDb();
  await db.delete(users);
  console.log("[Users Repository] Cleared all users");
}

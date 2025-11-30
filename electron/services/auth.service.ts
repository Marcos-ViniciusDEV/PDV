import * as usersRepository from "../repositories/users.repository";

/**
 * Service de autenticação
 * Responsabilidade: Lógica de negócio de autenticação (Single Responsibility)
 * Depende de: users.repository (Dependency Inversion)
 */

/**
 * Valida credenciais de usuário
 */
import crypto from "crypto";

/**
 * Valida credenciais de usuário
 */
export async function validateUser(
  email: string,
  password: string
): Promise<{ id: number; name: string; email: string; role: string } | null> {
  console.log("[Auth Service] Validating user:", email);
  
  const user = await usersRepository.getUserByEmail(email);
  
  if (!user) {
    console.log("[Auth Service] User not found");
    return null;
  }
  
  // Verificar senha usando PBKDF2 (mesma lógica do backend)
  if (!user.passwordHash) {
    console.log("[Auth Service] User has no password hash");
    return null;
  }

  const isValid = verifyPassword(password, user.passwordHash);

  if (isValid) {
    console.log("[Auth Service] Password match");
    return {
      id: user.id,
      name: user.name || "Usuário",
      email: user.email,
      role: user.role,
    };
  }
  
  console.log("[Auth Service] Password mismatch");
  return null;
}

/**
 * Valida credenciais de usuário por ID ou Email
 */
export async function validateUserByIdOrEmail(
  identifier: string,
  password: string
): Promise<{ id: number; name: string; email: string; role: string } | null> {
  console.log("[Auth Service] Validating user by ID or Email:", identifier);
  
  let user = null;
  
  // Tentar como ID primeiro (se for número)
  if (/^\d+$/.test(identifier)) {
    const userId = parseInt(identifier, 10);
    console.log("[Auth Service] Trying as ID:", userId);
    user = await usersRepository.getUserById(userId);
  }
  
  // Se não encontrou por ID, tentar por email
  if (!user) {
    console.log("[Auth Service] Trying as email:", identifier);
    user = await usersRepository.getUserByEmail(identifier);
  }
  
  if (!user) {
    console.log("[Auth Service] User not found");
    return null;
  }
  
  // Verificar senha
  if (!user.passwordHash) {
    console.log("[Auth Service] User has no password hash");
    return null;
  }

  const isValid = verifyPassword(password, user.passwordHash);

  if (isValid) {
    console.log("[Auth Service] Password match");
    return {
      id: user.id,
      name: user.name || "Usuário",
      email: user.email,
      role: user.role,
    };
  }
  
  console.log("[Auth Service] Password mismatch");
  return null;
}


function verifyPassword(password: string, hash: string): boolean {
  // Fallback para texto plano (debug/migração)
  if (!hash.includes(":")) {
    console.log("[Auth Service] Checking plain text password");
    return password === hash;
  }

  try {
    const parts = hash.split(":");
    if (parts.length !== 2) return false;
    
    const [salt, originalHash] = parts;
    if (!salt || !originalHash) return false;

    const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha256").toString("hex");

    return verifyHash === originalHash;
  } catch (error) {
    console.error("[Auth Service] Error verifying password:", error);
    return false;
  }
}

/**
 * Busca todos os usuários (sem senha)
 */
export async function getAllUsers() {
  const users = await usersRepository.getAllUsers();
  
  // Remover hash de senha da resposta
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
  }));
}
export async function validateSupervisor(password: string): Promise<boolean> {
  console.log("[Auth Service] Validating supervisor password");
  
  // Fallback para desenvolvimento/teste
  if (password === "123456") {
    console.log("[Auth Service] Using dev supervisor password");
    return true;
  }

  const users = await usersRepository.getAllUsers();
  const supervisors = users.filter(u => u.role === 'ADMIN' || u.role === 'SUPERVISOR');
  
  for (const supervisor of supervisors) {
    if (supervisor.passwordHash && verifyPassword(password, supervisor.passwordHash)) {
      console.log(`[Auth Service] Valid supervisor password (matched user ${supervisor.id})`);
      return true;
    }
  }
  
  console.log("[Auth Service] No matching supervisor password found");
  return false;
}

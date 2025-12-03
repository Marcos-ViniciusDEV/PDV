import { getDb } from "./electron/db/config";
import { users } from "./electron/db/schema";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

function verifyPassword(password: string, hash: string): boolean {
  if (!hash.includes(":")) {
    console.log("[Debug] Checking plain text password");
    return password === hash;
  }

  try {
    const parts = hash.split(":");
    if (parts.length !== 2) {
        console.log("[Debug] Invalid hash format (parts length != 2)");
        return false;
    }
    
    const [salt, originalHash] = parts;
    if (!salt || !originalHash) {
        console.log("[Debug] Invalid hash format (missing salt or hash)");
        return false;
    }

    const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha256").toString("hex");
    
    console.log(`[Debug] Salt: ${salt}`);
    console.log(`[Debug] Stored Hash Length: ${originalHash.length}`);
    console.log(`[Debug] Stored Hash Start: ${originalHash.substring(0, 10)}`);
    console.log(`[Debug] Stored Hash End: ${originalHash.substring(originalHash.length - 10)}`);
    
    console.log(`[Debug] Calc Hash Length: ${verifyHash.length}`);
    console.log(`[Debug] Calc Hash Start: ${verifyHash.substring(0, 10)}`);
    console.log(`[Debug] Calc Hash End: ${verifyHash.substring(verifyHash.length - 10)}`);

    return verifyHash === originalHash;
  } catch (error) {
    console.error("[Debug] Error verifying password:", error);
    return false;
  }
}

async function debugHash() {
  try {
    const db = await getDb();
    const userResult = await db.select().from(users).where(eq(users.id, 137));
    const user = userResult[0];

    if (!user) {
        console.log("User 137 not found in PDV");
        process.exit(1);
    }

    console.log("User found:", user.name);
    console.log("Stored Password Hash:", user.passwordHash);

    if (user.passwordHash) {
        const isValid = verifyPassword("admin", user.passwordHash);
        console.log("Is Valid 'admin'?", isValid);
    } else {
        console.log("No password hash stored");
    }

  } catch (error) {
    console.error("Error checking PDV user:", error);
  }
  process.exit(0);
}

debugHash();

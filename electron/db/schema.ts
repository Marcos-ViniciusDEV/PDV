import {
  int,
  mysqlTable,
  varchar,
  timestamp,
  text,
  mysqlEnum,
  boolean,
  date,
} from "drizzle-orm/mysql-core";

/**
 * Produtos sincronizados da API Central
 */
export const products = mysqlTable("products", {
  id: int("id").primaryKey(), // Mesmo ID da API Central
  codigo: varchar("codigo", { length: 50 }).notNull(),
  codigoBarras: varchar("codigoBarras", { length: 50 }),
  descricao: text("descricao").notNull(),
  precoVenda: int("precoVenda").notNull(), // em centavos
  unidade: varchar("unidade", { length: 10 }).notNull(),
  estoque: int("estoque").notNull().default(0),
  ativo: int("ativo").notNull().default(1), // boolean as tinyint
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * Materiais (Insumos) para Produção
 */
export const materials = mysqlTable("materials", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  unidade: varchar("unidade", { length: 10 }).notNull(),
  estoque: int("estoque").notNull().default(0), // em miligramas/mililitros ou unidade base
  custo: int("custo").notNull().default(0), // em centavos por unidade
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Material = typeof materials.$inferSelect;
export type InsertMaterial = typeof materials.$inferInsert;

/**
 * Receitas para Produção
 */
export const recipes = mysqlTable("recipes", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId")
    .notNull()
    .references(() => products.id), // Produto final
  descricao: varchar("descricao", { length: 255 }).notNull(),
  rendimento: int("rendimento").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Recipe = typeof recipes.$inferSelect;
export type InsertRecipe = typeof recipes.$inferInsert;

/**
 * Ingredientes da Receita
 */
export const recipeIngredients = mysqlTable("recipe_ingredients", {
  id: int("id").autoincrement().primaryKey(),
  recipeId: int("recipeId")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  materialId: int("materialId")
    .notNull()
    .references(() => materials.id),
  quantidade: int("quantidade").notNull(), // Quantidade necessária
});

export type RecipeIngredient = typeof recipeIngredients.$inferSelect;
export type InsertRecipeIngredient = typeof recipeIngredients.$inferInsert;

/**
 * Ofertas Agendadas
 */
export const offers = mysqlTable("offers", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId")
    .notNull()
    .references(() => products.id),
  precoOferta: int("precoOferta").notNull(), // em centavos
  dataInicio: timestamp("dataInicio").notNull(),
  dataFim: timestamp("dataFim").notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Offer = typeof offers.$inferSelect;
export type InsertOffer = typeof offers.$inferInsert;

/**
 * Usuários/Operadores sincronizados da API Central
 */
export const users = mysqlTable("users", {
  id: int("id").primaryKey(), // Mesmo ID da API Central
  name: text("name").notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: text("passwordHash"), // Hash da senha
  role: varchar("role", { length: 20 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Sessões de Caixa (Abertura/Fechamento)
 */
export const caixaSessions = mysqlTable("caixa_sessions", {
  id: int("id").autoincrement().primaryKey(),
  uuid: varchar("uuid", { length: 36 }).notNull().unique(),
  operatorId: int("operatorId").notNull(),
  operatorName: varchar("operatorName", { length: 255 }).notNull(),
  openedAt: timestamp("openedAt").defaultNow().notNull(),
  closedAt: timestamp("closedAt"),
  initialAmount: int("initialAmount").notNull(), // Fundo de troco (centavos)
  finalAmount: int("finalAmount"), // Valor em gaveta informado no fechamento (centavos)
  status: mysqlEnum("status", ["OPEN", "CLOSED"]).default("OPEN").notNull(),
  syncStatus: mysqlEnum("syncStatus", ["pending", "synced", "error"])
    .default("pending")
    .notNull(),
  syncError: text("syncError"),
  syncAttempts: int("syncAttempts").default(0).notNull(),
  lastSyncAttempt: timestamp("lastSyncAttempt"),
});

export type CaixaSession = typeof caixaSessions.$inferSelect;
export type InsertCaixaSession = typeof caixaSessions.$inferInsert;

/**
 * Vendas realizadas no PDV (pendentes de sincronização)
 */
export const sales = mysqlTable("sales", {
  id: int("id").autoincrement().primaryKey(),
  uuid: varchar("uuid", { length: 36 }).notNull().unique(),
  numeroVenda: varchar("numeroVenda", { length: 50 }).notNull().unique(),
  ccf: varchar("ccf", { length: 6 }).notNull(),
  coo: varchar("coo", { length: 6 }).notNull(),
  pdvId: varchar("pdvId", { length: 50 }).notNull(),
  operatorId: int("operatorId").notNull(),
  operatorName: varchar("operatorName", { length: 255 }).notNull(),
  sessionId: int("sessionId") // Link para a sessão de caixa
    .references(() => caixaSessions.id),
  total: int("total").notNull(), // em centavos
  discount: int("discount").notNull().default(0),
  netTotal: int("netTotal").notNull(),
  paymentMethod: varchar("paymentMethod", { length: 50 }), // Deprecated/Primary method
  couponType: varchar("couponType", { length: 20 }).default("NFC-e"),
  syncStatus: mysqlEnum("syncStatus", ["pending", "synced", "error"])
    .default("pending")
    .notNull(),
  status: mysqlEnum("status", ["completed", "cancelled", "suspended"])
    .default("completed")
    .notNull(),
  syncError: text("syncError"),
  syncAttempts: int("syncAttempts").default(0).notNull(),
  lastSyncAttempt: timestamp("lastSyncAttempt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Sale = typeof sales.$inferSelect;
export type InsertSale = typeof sales.$inferInsert;

/**
 * Pagamentos da Venda (Múltiplos pagamentos)
 */
export const salePayments = mysqlTable("sale_payments", {
  id: int("id").autoincrement().primaryKey(),
  saleId: int("saleId")
    .notNull()
    .references(() => sales.id, { onDelete: "cascade" }),
  method: varchar("method", { length: 50 }).notNull(), // DINHEIRO, CREDITO, DEBITO, PIX
  amount: int("amount").notNull(), // em centavos
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SalePayment = typeof salePayments.$inferSelect;
export type InsertSalePayment = typeof salePayments.$inferInsert;

/**
 * Itens das vendas
 */
export const saleItems = mysqlTable("sale_items", {
  id: int("id").autoincrement().primaryKey(),
  saleId: int("saleId")
    .notNull()
    .references(() => sales.id, { onDelete: "cascade" }),
  productId: int("productId")
    .notNull()
    .references(() => products.id),
  quantity: int("quantity").notNull(),
  unitPrice: int("unitPrice").notNull(), // em centavos
  total: int("total").notNull(),
  discount: int("discount").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SaleItem = typeof saleItems.$inferSelect;
export type InsertSaleItem = typeof saleItems.$inferInsert;

/**
 * Devoluções / Trocas
 */
export const returns = mysqlTable("returns", {
  id: int("id").autoincrement().primaryKey(),
  originalSaleId: int("originalSaleId")
    .references(() => sales.id),
  reason: text("reason").notNull(),
  totalRefunded: int("totalRefunded").notNull(), // em centavos
  operatorId: int("operatorId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Return = typeof returns.$inferSelect;
export type InsertReturn = typeof returns.$inferInsert;

/**
 * Itens da Devolução
 */
export const returnItems = mysqlTable("return_items", {
  id: int("id").autoincrement().primaryKey(),
  returnId: int("returnId")
    .notNull()
    .references(() => returns.id, { onDelete: "cascade" }),
  productId: int("productId")
    .notNull()
    .references(() => products.id),
  quantity: int("quantity").notNull(),
  condition: mysqlEnum("condition", ["GOOD", "DAMAGED"]).default("GOOD"),
});

export type ReturnItem = typeof returnItems.$inferSelect;
export type InsertReturnItem = typeof returnItems.$inferInsert;

/**
 * Movimentações de caixa (sangrias, reforços, etc)
 */
export const cashMovements = mysqlTable("cash_movements", {
  id: int("id").autoincrement().primaryKey(),
  uuid: varchar("uuid", { length: 36 }).notNull().unique(),
  type: mysqlEnum("type", ["ABERTURA", "FECHAMENTO", "SANGRIA", "REFORCO", "VENDA"])
    .notNull(),
  amount: int("amount").notNull(), // em centavos
  operatorId: int("operatorId").notNull(),
  sessionId: int("sessionId") // Link para a sessão de caixa
    .references(() => caixaSessions.id),
  reason: text("reason"),
  syncStatus: mysqlEnum("syncStatus", ["pending", "synced", "error"])
    .default("pending")
    .notNull(),
  syncError: text("syncError"),
  syncAttempts: int("syncAttempts").default(0).notNull(),
  lastSyncAttempt: timestamp("lastSyncAttempt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CashMovement = typeof cashMovements.$inferSelect;
export type InsertCashMovement = typeof cashMovements.$inferInsert;

/**
 * Contadores para CCF e COO
 */
export const counters = mysqlTable("counters", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 20 }).notNull().unique(),
  value: int("value").notNull().default(0),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Counter = typeof counters.$inferSelect;
export type InsertCounter = typeof counters.$inferInsert;

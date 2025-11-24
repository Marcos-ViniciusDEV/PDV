-- Criar banco de dados PDV local
CREATE DATABASE IF NOT EXISTS pdv_local CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE pdv_local;

-- Tabela de produtos sincronizados
CREATE TABLE IF NOT EXISTS products (
  id INT PRIMARY KEY,
  codigo VARCHAR(50) NOT NULL,
  codigoBarras VARCHAR(50),
  descricao TEXT NOT NULL,
  precoVenda INT NOT NULL COMMENT 'Preço em centavos',
  unidade VARCHAR(10) NOT NULL,
  estoque INT NOT NULL DEFAULT 0,
  ativo TINYINT NOT NULL DEFAULT 1,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_codigo (codigo),
  INDEX idx_barras (codigoBarras)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de usuários/operadores
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY,
  name TEXT NOT NULL,
  email VARCHAR(320) NOT NULL UNIQUE,
  passwordHash TEXT,
  role VARCHAR(20) NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de vendas
CREATE TABLE IF NOT EXISTS sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uuid VARCHAR(36) NOT NULL UNIQUE,
  numeroVenda VARCHAR(50) NOT NULL UNIQUE,
  ccf VARCHAR(6) NOT NULL,
  coo VARCHAR(6) NOT NULL,
  pdvId VARCHAR(50) NOT NULL,
  operatorId INT NOT NULL,
  operatorName VARCHAR(255) NOT NULL,
  total INT NOT NULL COMMENT 'Total em centavos',
  discount INT NOT NULL DEFAULT 0,
  netTotal INT NOT NULL,
  paymentMethod VARCHAR(50) NOT NULL,
  couponType VARCHAR(20) DEFAULT 'NFC-e',
  syncStatus ENUM('pending', 'synced', 'error') NOT NULL DEFAULT 'pending',
  syncError TEXT,
  syncAttempts INT NOT NULL DEFAULT 0,
  lastSyncAttempt TIMESTAMP NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_uuid (uuid),
  INDEX idx_sync_status (syncStatus),
  INDEX idx_created (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de itens de venda
CREATE TABLE IF NOT EXISTS sale_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  saleId INT NOT NULL,
  productId INT NOT NULL,
  quantity INT NOT NULL,
  unitPrice INT NOT NULL COMMENT 'Preço unitário em centavos',
  total INT NOT NULL,
  discount INT NOT NULL DEFAULT 0,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (saleId) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (productId) REFERENCES products(id),
  INDEX idx_sale (saleId),
  INDEX idx_product (productId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de movimentações de caixa
CREATE TABLE IF NOT EXISTS cash_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uuid VARCHAR(36) NOT NULL UNIQUE,
  type ENUM('ABERTURA', 'FECHAMENTO', 'SANGRIA', 'REFORCO', 'VENDA') NOT NULL,
  amount INT NOT NULL COMMENT 'Valor em centavos',
  operatorId INT NOT NULL,
  reason TEXT,
  syncStatus ENUM('pending', 'synced', 'error') NOT NULL DEFAULT 'pending',
  syncError TEXT,
  syncAttempts INT NOT NULL DEFAULT 0,
  lastSyncAttempt TIMESTAMP NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_uuid (uuid),
  INDEX idx_sync_status (syncStatus),
  INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de contadores
CREATE TABLE IF NOT EXISTS counters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(20) NOT NULL UNIQUE,
  value INT NOT NULL DEFAULT 0,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inserir contadores iniciais
INSERT INTO counters (name, value) VALUES ('ccf', 0), ('coo', 0)
ON DUPLICATE KEY UPDATE value = value;

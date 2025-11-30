CREATE TABLE `caixa_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`uuid` varchar(36) NOT NULL,
	`operatorId` int NOT NULL,
	`operatorName` varchar(255) NOT NULL,
	`openedAt` timestamp NOT NULL DEFAULT (now()),
	`closedAt` timestamp,
	`initialAmount` int NOT NULL,
	`finalAmount` int,
	`status` enum('OPEN','CLOSED') NOT NULL DEFAULT 'OPEN',
	`syncStatus` enum('pending','synced','error') NOT NULL DEFAULT 'pending',
	`syncError` text,
	`syncAttempts` int NOT NULL DEFAULT 0,
	`lastSyncAttempt` timestamp,
	CONSTRAINT `caixa_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `caixa_sessions_uuid_unique` UNIQUE(`uuid`)
);
--> statement-breakpoint
CREATE TABLE `cash_movements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`uuid` varchar(36) NOT NULL,
	`type` enum('ABERTURA','FECHAMENTO','SANGRIA','REFORCO','VENDA') NOT NULL,
	`amount` int NOT NULL,
	`operatorId` int NOT NULL,
	`sessionId` int,
	`reason` text,
	`syncStatus` enum('pending','synced','error') NOT NULL DEFAULT 'pending',
	`syncError` text,
	`syncAttempts` int NOT NULL DEFAULT 0,
	`lastSyncAttempt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cash_movements_id` PRIMARY KEY(`id`),
	CONSTRAINT `cash_movements_uuid_unique` UNIQUE(`uuid`)
);
--> statement-breakpoint
CREATE TABLE `counters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(20) NOT NULL,
	`value` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `counters_id` PRIMARY KEY(`id`),
	CONSTRAINT `counters_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int NOT NULL,
	`codigo` varchar(50) NOT NULL,
	`codigoBarras` varchar(50),
	`descricao` text NOT NULL,
	`precoVenda` int NOT NULL,
	`unidade` varchar(10) NOT NULL,
	`estoque` int NOT NULL DEFAULT 0,
	`ativo` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sale_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`saleId` int NOT NULL,
	`productId` int NOT NULL,
	`quantity` int NOT NULL,
	`unitPrice` int NOT NULL,
	`total` int NOT NULL,
	`discount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sale_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sales` (
	`id` int AUTO_INCREMENT NOT NULL,
	`uuid` varchar(36) NOT NULL,
	`numeroVenda` varchar(50) NOT NULL,
	`ccf` varchar(6) NOT NULL,
	`coo` varchar(6) NOT NULL,
	`pdvId` varchar(50) NOT NULL,
	`operatorId` int NOT NULL,
	`operatorName` varchar(255) NOT NULL,
	`sessionId` int,
	`total` int NOT NULL,
	`discount` int NOT NULL DEFAULT 0,
	`netTotal` int NOT NULL,
	`paymentMethod` varchar(50) NOT NULL,
	`couponType` varchar(20) DEFAULT 'NFC-e',
	`syncStatus` enum('pending','synced','error') NOT NULL DEFAULT 'pending',
	`status` enum('completed','cancelled') NOT NULL DEFAULT 'completed',
	`syncError` text,
	`syncAttempts` int NOT NULL DEFAULT 0,
	`lastSyncAttempt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sales_id` PRIMARY KEY(`id`),
	CONSTRAINT `sales_uuid_unique` UNIQUE(`uuid`),
	CONSTRAINT `sales_numeroVenda_unique` UNIQUE(`numeroVenda`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int NOT NULL,
	`name` text NOT NULL,
	`email` varchar(320) NOT NULL,
	`passwordHash` text,
	`role` varchar(20) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `cash_movements` ADD CONSTRAINT `cash_movements_sessionId_caixa_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `caixa_sessions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sale_items` ADD CONSTRAINT `sale_items_saleId_sales_id_fk` FOREIGN KEY (`saleId`) REFERENCES `sales`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sale_items` ADD CONSTRAINT `sale_items_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales` ADD CONSTRAINT `sales_sessionId_caixa_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `caixa_sessions`(`id`) ON DELETE no action ON UPDATE no action;
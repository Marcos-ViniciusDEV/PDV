CREATE TABLE IF NOT EXISTS `configuracoes` (
  `id` int AUTO_INCREMENT NOT NULL,
  `empresaId` int NOT NULL,
  `empresaNome` varchar(255) NOT NULL,
  `pdvId` varchar(50) NOT NULL,
  `tokenAutenticacao` text NOT NULL,
  `urlBackend` varchar(255) NOT NULL,
  `ultimaSincronizacao` timestamp NULL,
  `atualizadoEm` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `configuracoes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `configuracoes` ADD `habilitarNfce` boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE `configuracoes` ADD `ambienteFiscal` varchar(20) NOT NULL DEFAULT 'HOMOLOGACAO';
--> statement-breakpoint
ALTER TABLE `configuracoes` ADD `regimeTributario` varchar(30) NOT NULL DEFAULT 'SIMPLES_NACIONAL';
--> statement-breakpoint
ALTER TABLE `configuracoes` ADD `serieNfce` int NOT NULL DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `configuracoes` ADD `serieNfe` int NOT NULL DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `configuracoes` ADD `proximoNumeroNfce` int NOT NULL DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `configuracoes` ADD `proximoNumeroNfe` int NOT NULL DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `configuracoes` ADD `idTokenIsc` varchar(10);
--> statement-breakpoint
ALTER TABLE `configuracoes` ADD `cscConfigurado` boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE `configuracoes` ADD `certificadoConfigurado` boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE `configuracoes` ADD `certificadoValidade` timestamp NULL;
--> statement-breakpoint
ALTER TABLE `configuracoes` ADD `fiscalAtualizadoEm` timestamp NULL;
--> statement-breakpoint
ALTER TABLE `products` ADD `ncm` varchar(8);
--> statement-breakpoint
ALTER TABLE `products` ADD `cest` varchar(7);
--> statement-breakpoint
ALTER TABLE `products` ADD `origem` int DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `products` ADD `cstIcms` varchar(4);
--> statement-breakpoint
ALTER TABLE `products` ADD `csosnIcms` varchar(4);
--> statement-breakpoint
ALTER TABLE `products` ADD `cfopPadraoVenda` varchar(4);
--> statement-breakpoint
ALTER TABLE `products` ADD `aliquotaIcms` int DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `products` ADD `aliquotaPis` int DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `products` ADD `aliquotaCofins` int DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `products` ADD `pisCst` varchar(2);
--> statement-breakpoint
ALTER TABLE `products` ADD `cofinsCst` varchar(2);

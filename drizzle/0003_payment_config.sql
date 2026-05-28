ALTER TABLE `configuracoes` ADD `empresaCnpj` varchar(18);
ALTER TABLE `configuracoes` ADD `pagamentosVersaoCarga` int NOT NULL DEFAULT 0;
ALTER TABLE `configuracoes` ADD `pagamentosConfigJson` text;
ALTER TABLE `configuracoes` ADD `pagamentosAtualizadoEm` timestamp NULL;

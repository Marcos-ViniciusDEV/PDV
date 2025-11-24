# Regras de Negócio - Sistema PDV Offline

Este documento descreve todas as regras de negócio, funcionalidades e comportamentos do sistema PDV Offline.

---

## 📑 Índice

- [Autenticação e Segurança](#autenticação-e-segurança)
- [Gestão de Vendas](#gestão-de-vendas)
- [Gestão de Caixa](#gestão-de-caixa)
- [Gestão de Produtos](#gestão-de-produtos)
- [Sincronização](#sincronização)
- [Descontos e Autorizações](#descontos-e-autorizações)
- [Cancelamentos](#cancelamentos)
- [Formas de Pagamento](#formas-de-pagamento)
- [Contadores e Numeração](#contadores-e-numeração)

---

## 🔐 Autenticação e Segurança

### Login

**Regras:**
1. O sistema aceita login por **ID numérico** ou **email**
2. Se o identificador for apenas números, o sistema tenta autenticar por ID
3. Se não encontrar por ID ou se contiver caracteres não-numéricos, tenta por email
4. A senha é validada usando criptografia **PBKDF2** (1000 iterações, SHA-256)
5. Fallback para senha em texto plano (apenas para debug/migração)

**Fluxo:**
```
1. Usuário digita identificador (ID ou email) + senha
2. Sistema detecta se é ID (apenas números) ou email
3. Busca usuário no banco de dados
4. Valida senha criptografada
5. Se válido, autentica e redireciona para PDV
6. Se inválido, exibe erro "ID/Email ou senha inválidos"
```

### Permissões

**Níveis de Acesso:**
- **admin**: Acesso total ao sistema
- **supervisor**: Pode autorizar operações sensíveis (descontos, cancelamentos)
- **user**: Operador padrão do PDV

**Autorizações Necessárias:**
- Descontos acima de limites pré-definidos
- Cancelamento de cupom
- Alteração de quantidade de itens no carrinho
- Remoção de itens do carrinho

---

## 💰 Gestão de Vendas

### Processo de Venda

**Fluxo Completo:**
```
1. Login do operador
2. Busca de produtos (por código de barras ou código interno)
3. Adição ao carrinho
4. Aplicação de descontos (opcional, requer autorização)
5. Seleção da forma de pagamento
6. Finalização da venda
7. Geração de CCF e COO
8. Registro no banco de dados
9. Sincronização com backend (quando online)
```

### Busca de Produtos

**Métodos de Busca:**
1. **Código de Barras**: Leitura via leitor ou digitação manual
2. **Código Interno**: Digitação do código do produto
3. **Multiplicação de Quantidade**: Formato `5x` + código (ex: `5x123` = 5 unidades do produto 123)

**Regras:**
- Produtos inativos não aparecem na busca
- Se produto não encontrado, exibe mensagem de erro
- Estoque é apenas informativo (não bloqueia venda)
- Preços são armazenados em **centavos** para precisão

### Carrinho de Compras

**Funcionalidades:**
- Adicionar produtos
- Remover produtos (requer autorização de supervisor)
- Alterar quantidade (requer autorização de supervisor)
- Visualizar total parcial
- Aplicar desconto em item individual
- Aplicar desconto no total da venda

**Regras:**
- Quantidade mínima: 1
- Quantidade máxima: 9999
- Não permite produtos duplicados (incrementa quantidade)
- Desconto não pode exceder o valor do item/venda
- Carrinho é limpo após finalização da venda

### Finalização de Venda

**Validações:**
- Carrinho não pode estar vazio
- Forma de pagamento deve ser selecionada
- Valor pago deve ser maior ou igual ao total
- Se dinheiro, calcular troco

**Ações Automáticas:**
1. Gera UUID único para a venda
2. Incrementa contadores CCF e COO
3. Registra venda no banco local
4. Registra movimento de caixa (tipo VENDA)
5. Marca venda como "pending" para sincronização
6. Limpa carrinho
7. Exibe cupom/recibo

---

## 💵 Gestão de Caixa

### Tipos de Movimentação

**ABERTURA:**
- Primeiro movimento do dia
- Registra valor inicial em caixa
- Obrigatório antes de iniciar vendas

**FECHAMENTO:**
- Último movimento do dia
- Registra valor final em caixa
- Calcula diferença (esperado vs contado)

**SANGRIA:**
- Retirada de valores do caixa
- Requer motivo/observação
- Reduz saldo disponível

**REFORÇO:**
- Adição de valores ao caixa
- Requer motivo/observação
- Aumenta saldo disponível

**VENDA:**
- Registrado automaticamente ao finalizar venda
- Não sincroniza com backend (apenas controle local)
- Aumenta saldo do caixa

### Cálculo de Saldo

**Fórmula:**
```
Saldo = ABERTURA + REFORÇO + VENDAS - SANGRIA - FECHAMENTO
```

**Regras:**
- Saldo é calculado em tempo real
- Valores em centavos para precisão
- Movimentos são imutáveis (não podem ser editados)
- Todos os movimentos (exceto VENDA) sincronizam com backend

---

## 📦 Gestão de Produtos

### Sincronização de Catálogo

**Origem dos Dados:**
- Produtos vêm do backend via API
- Sincronização automática a cada 5 minutos
- Sincronização manual disponível
- Funciona offline com dados locais

**Campos Sincronizados:**
- ID (mesmo do backend)
- Código interno
- Código de barras
- Descrição
- Preço de venda (em centavos)
- Unidade de medida
- Estoque atual
- Status (ativo/inativo)

**Regras:**
- Produtos locais são sobrescritos pela sincronização
- Produtos inativos não aparecem em buscas
- Preços sempre em centavos (ex: R$ 4,67 = 467 centavos)
- Estoque é informativo (não bloqueia vendas)

---

## 🔄 Sincronização

### Funcionamento

**Modo Online:**
- Sincronização automática a cada 5 minutos
- Envia vendas pendentes para backend
- Envia movimentos de caixa pendentes
- Recebe catálogo atualizado
- Recebe usuários atualizados

**Modo Offline:**
- Sistema continua funcionando normalmente
- Vendas são salvas localmente
- Movimentos de caixa são salvos localmente
- Dados ficam marcados como "pending"
- Ao retornar online, sincronização automática ocorre

**Retry Automático:**
- Se sincronização falhar, tenta novamente
- Máximo de 3 tentativas
- Intervalo de 1 minuto entre tentativas
- Marca como "error" após 3 falhas

### Dados Sincronizados

**Do PDV para Backend:**
- Vendas (com itens)
- Movimentos de caixa (exceto VENDA)
- Status de sincronização

**Do Backend para PDV:**
- Catálogo de produtos
- Lista de usuários/operadores
- Configurações do PDV

---

## 💸 Descontos e Autorizações

### Tipos de Desconto

**Desconto em Item:**
- Percentual (ex: 10%)
- Valor fixo (ex: R$ 5,00)
- Aplicado antes de adicionar ao carrinho
- Não pode exceder o valor do item

**Desconto na Venda:**
- Percentual sobre o total
- Valor fixo sobre o total
- Aplicado antes da finalização
- Não pode exceder o valor total

### Autorização de Supervisor

**Quando é Necessária:**
- Descontos acima de 5%
- Descontos em valor fixo acima de R$ 10,00
- Alteração de quantidade no carrinho
- Remoção de item do carrinho
- Cancelamento de cupom

**Fluxo de Autorização:**
```
1. Operador solicita operação que requer autorização
2. Sistema abre modal de autorização
3. Supervisor digita ID/email + senha
4. Sistema valida credenciais
5. Verifica se usuário tem role "supervisor" ou "admin"
6. Se válido, autoriza operação
7. Se inválido, nega e exibe erro
```

**Regras:**
- Apenas usuários com role "supervisor" ou "admin" podem autorizar
- Autorização é válida apenas para a operação atual
- Não há "modo supervisor" persistente
- Cada operação sensível requer nova autorização

---

## ❌ Cancelamentos

### Cancelamento de Cupom

**Quando Usar:**
- Venda foi finalizada mas precisa ser cancelada
- Erro no registro da venda
- Cliente desistiu após finalização

**Processo:**
```
1. Operador clica em "Cancelar Cupom"
2. Sistema solicita autorização de supervisor
3. Supervisor autoriza com ID/email + senha
4. Sistema registra venda com status "cancelled"
5. Gera CCF e COO para o cancelamento
6. Registra movimento de caixa negativo
7. Limpa carrinho atual
8. Marca para sincronização
```

**Regras:**
- Cancelamento gera novo registro (não altera o original)
- Status da venda cancelada: "cancelled"
- Forma de pagamento: "CANCELADO"
- Valor é registrado como negativo no caixa
- Sincroniza com backend para estorno

---

## 💳 Formas de Pagamento

### Opções Disponíveis

1. **Dinheiro**
   - Requer valor pago
   - Calcula troco automaticamente
   - Troco = Valor Pago - Total

2. **Cartão de Débito**
   - Pagamento exato (sem troco)
   - Registra como "DEBITO"

3. **Cartão de Crédito**
   - Pagamento exato (sem troco)
   - Registra como "CREDITO"

4. **PIX**
   - Pagamento exato (sem troco)
   - Registra como "PIX"

5. **Boleto**
   - Pagamento exato (sem troco)
   - Registra como "BOLETO"

**Regras Gerais:**
- Apenas uma forma de pagamento por venda
- Valor pago não pode ser menor que o total
- Troco só é calculado para "Dinheiro"
- Todas as formas sincronizam com backend

---

## 🔢 Contadores e Numeração

### CCF (Contador de Cupom Fiscal)

**Características:**
- Contador sequencial único
- Incrementa a cada venda (incluindo cancelamentos)
- Formato: 6 dígitos com zeros à esquerda (ex: 000001)
- Nunca reinicia
- Compartilhado entre todos os tipos de cupom

### COO (Contador de Ordem de Operação)

**Características:**
- Contador sequencial único
- Incrementa a cada venda (incluindo cancelamentos)
- Formato: 6 dígitos com zeros à esquerda (ex: 000001)
- Nunca reinicia
- Identifica cada operação no PDV

### Número de Venda

**Formato:**
```
PDV{PDV_ID}_{TIMESTAMP}_{UUID_CURTO}
```

**Exemplo:**
```
PDV001_20251124_a3f2
```

**Componentes:**
- PDV_ID: Identificador do PDV (ex: PDV001)
- TIMESTAMP: Data/hora da venda
- UUID_CURTO: Primeiros 4 caracteres do UUID

**Regras:**
- Único por venda
- Usado para rastreamento
- Sincroniza com backend
- Não pode ser alterado

---

## 🎯 Validações e Restrições

### Valores Monetários

- **Formato**: Sempre em centavos (inteiros)
- **Mínimo**: 0 (zero)
- **Máximo**: 2.147.483.647 (limite INT do MySQL)
- **Conversão**: R$ 1,00 = 100 centavos

### Quantidades

- **Mínimo**: 1
- **Máximo**: 9999
- **Tipo**: Inteiro positivo
- **Multiplicação**: Formato `Nx` onde N é a quantidade

### Textos

- **Descrição de Produto**: Máximo 65.535 caracteres (TEXT)
- **Código de Barras**: Máximo 50 caracteres
- **Código Interno**: Máximo 50 caracteres
- **Email**: Máximo 320 caracteres
- **Nome**: Sem limite (TEXT)

### UUIDs

- **Formato**: UUID v4 (36 caracteres)
- **Exemplo**: `550e8400-e29b-41d4-a716-446655440000`
- **Uso**: Identificação única de vendas e movimentos
- **Geração**: Automática pelo sistema

---

## 🔒 Segurança e Auditoria

### Registro de Operações

**Dados Registrados em Cada Venda:**
- UUID único
- Data/hora exata
- ID do operador
- Nome do operador
- PDV de origem
- Itens vendidos (com preços e descontos)
- Forma de pagamento
- Descontos aplicados
- Status (completed/cancelled)
- CCF e COO

**Dados Registrados em Movimentos de Caixa:**
- UUID único
- Tipo de movimento
- Valor
- ID do operador
- Motivo/observação
- Data/hora exata
- Status de sincronização

### Integridade de Dados

**Garantias:**
- Transações atômicas no banco de dados
- Validação de dados antes de salvar
- Contadores nunca decrementam
- UUIDs garantem unicidade
- Timestamps automáticos
- Sincronização com retry automático

**Proteções:**
- Senhas criptografadas (PBKDF2)
- Validação de permissões em cada operação
- Logs de erro detalhados
- Backup automático de vendas
- Dados locais persistentes

---

## 📊 Relatórios e Consultas

### Vendas Recentes

**Funcionalidade:**
- Lista últimas N vendas
- Ordenadas por data (mais recente primeiro)
- Inclui status (completed/cancelled)
- Mostra operador responsável

### Vendas Pendentes

**Funcionalidade:**
- Lista vendas não sincronizadas
- Mostra tentativas de sincronização
- Exibe erros de sincronização
- Permite retry manual

### Saldo de Caixa

**Funcionalidade:**
- Calcula saldo em tempo real
- Considera todos os tipos de movimento
- Exibe em formato monetário (R$)
- Atualiza automaticamente

---

## 🚨 Tratamento de Erros

### Erros de Conexão

**Comportamento:**
- Sistema continua funcionando offline
- Dados são salvos localmente
- Indicador visual de status (Offline/Online)
- Sincronização automática ao retornar online

### Erros de Validação

**Comportamento:**
- Exibe mensagem clara ao usuário
- Não permite operação inválida
- Mantém dados já inseridos
- Sugere correção quando possível

### Erros de Sincronização

**Comportamento:**
- Registra erro no log
- Marca registro como "error"
- Tenta novamente após intervalo
- Após 3 falhas, aguarda sincronização manual

---

## 📝 Observações Importantes

1. **Modo Offline**: O sistema foi projetado para funcionar completamente offline, sincronizando quando possível
2. **Precisão Monetária**: Todos os valores são em centavos para evitar erros de arredondamento
3. **Auditoria**: Todas as operações são registradas com operador, data/hora e detalhes
4. **Segurança**: Operações sensíveis sempre requerem autorização de supervisor
5. **Integridade**: Contadores nunca decrementam, garantindo rastreabilidade
6. **Sincronização**: Dados locais têm prioridade; backend é apenas para centralização
7. **Usuários**: Sincronizados do backend, mas senhas podem ser diferentes localmente
8. **Produtos**: Sempre sincronizados do backend (não editáveis localmente)

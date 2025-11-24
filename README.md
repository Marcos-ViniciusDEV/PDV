# pdv-offline

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-ISC-green.svg)
![Deploy Status](https://img.shields.io/badge/deploy-production-success.svg)

Sistema PDV Offline com Electron e MySQL - Ponto de Venda completo com sincronização automática, gestão de caixa, vendas e estoque.

---

## 📑 Sumário

- [Instalação](#-instalação)
- [Funcionalidades](#-funcionalidades)
- [API Interna (IPC)](#-api-interna-ipc)
- [Tecnologias](#-tecnologias)
- [Scripts Disponíveis](#-scripts-disponíveis)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Regras de Negócio](#-regras-de-negócio)

---

## 🚀 Instalação

### Pré-requisitos
- Node.js 18+ 
- MySQL 8.0+
- npm ou yarn

### Passos

```bash
# Clone o repositório
git clone <repository-url>
cd pdv-offline

# Instale as dependências
npm install
# ou
yarn install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas configurações

# Execute as migrations do banco de dados
npm run db:push

# Inicie o projeto em modo desenvolvimento
npm run dev
```

---

## ✨ Funcionalidades

### 🔐 Autenticação
- Login por **ID de usuário** ou **Email**
- Autenticação com senha criptografada (PBKDF2)
- Controle de permissões por função (admin, user, supervisor)
- Autorização de supervisor para operações sensíveis

### 💰 Gestão de Vendas
- **Busca de produtos** por código de barras ou código interno
- **Carrinho de compras** com adição/remoção de itens
- **Multiplicação de quantidade** (ex: 5x produto)
- **Descontos** em itens individuais ou na venda total
  - Desconto percentual
  - Desconto em valor fixo
  - Requer autorização de supervisor
- **Cancelamento de cupom** com registro no sistema
- **Múltiplas formas de pagamento**:
  - Dinheiro
  - Cartão de Débito
  - Cartão de Crédito
  - PIX
  - Boleto
- **Geração automática** de CCF e COO
- **Impressão de cupom** (NFC-e)

### 💵 Gestão de Caixa
- **Abertura de caixa** com valor inicial
- **Fechamento de caixa** com contagem
- **Sangria** (retirada de valores)
- **Reforço** (adição de valores)
- **Saldo em tempo real**
- Registro automático de vendas no caixa

### 📦 Catálogo de Produtos
- **Sincronização automática** com backend
- Busca por código de barras
- Busca por código interno
- Visualização de estoque
- Preços em centavos (precisão)

### 🔄 Sincronização

O sistema utiliza **sincronização bidirecional** entre o PDV (Electron) e o Backend (API Central).

#### Fluxo de Dados

**📤 Do PDV para o Backend (Upload):**
- **Vendas completas**
  - UUID único da venda
  - Número da venda, CCF e COO
  - ID do PDV de origem
  - Data/hora da venda
  - Operador (ID e nome)
  - Itens vendidos (produto, quantidade, preços, descontos)
  - Forma de pagamento
  - Valores (total, desconto, líquido)
  - Status (completed/cancelled)
  
- **Movimentos de Caixa** (exceto tipo VENDA)
  - UUID único
  - Tipo (ABERTURA, FECHAMENTO, SANGRIA, REFORÇO)
  - Valor em centavos
  - Operador responsável
  - Motivo/observação
  - Data/hora do movimento

**📥 Do Backend para o PDV (Download):**
- **Catálogo de Produtos**
  - ID do produto
  - Código interno e código de barras
  - Descrição completa
  - Preço de venda (em centavos)
  - Unidade de medida
  - Estoque atual
  - Status (ativo/inativo)
  
- **Usuários/Operadores**
  - ID do usuário
  - Nome completo
  - Email
  - Hash da senha (PBKDF2)
  - Função/permissão (admin, supervisor, user)

#### Comportamento

**Modo Online:**
- ✅ Sincronização automática a cada **5 minutos**
- ✅ Sincronização manual disponível via botão
- ✅ Indicador visual: **"Online ✅"**
- ✅ Dados enviados e recebidos em tempo real
- ✅ Retry automático em caso de falha (até 3 tentativas)

**Modo Offline:**
- ✅ Sistema **continua funcionando normalmente**
- ✅ Vendas salvas localmente no MySQL
- ✅ Movimentos de caixa salvos localmente
- ✅ Dados marcados como **"pending"** (pendente de sincronização)
- ✅ Indicador visual: **"Offline ❌"**
- ✅ Ao retornar online, sincronização automática é retomada
- ✅ Catálogo e usuários permanecem disponíveis (última sincronização)

#### Endpoint de Sincronização

```typescript
POST /api/pdv/sincronizar
Content-Type: application/json

{
  "vendas": [
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "numeroVenda": "PDV001_20251124_a3f2",
      "ccf": "000001",
      "coo": "000001",
      "pdvId": "PDV001",
      "dataVenda": "2025-11-24T08:30:00.000Z",
      "valorTotal": 1500,
      "valorDesconto": 0,
      "valorLiquido": 1500,
      "formaPagamento": "DINHEIRO",
      "operadorId": 19,
      "operadorNome": "João Silva",
      "itens": [
        {
          "produtoId": 1,
          "quantidade": 2,
          "precoUnitario": 467,
          "valorTotal": 934,
          "valorDesconto": 0
        }
      ]
    }
  ],
  "movimentosCaixa": [
    {
      "uuid": "7f3e8d2a-1b4c-4a5d-9e8f-2c3d4e5f6a7b",
      "tipo": "ABERTURA",
      "valor": 10000,
      "observacao": "Abertura de caixa",
      "operadorId": 19,
      "dataMovimento": "2025-11-24T08:00:00.000Z"
    }
  ]
}
```

#### Estratégia de Conflitos

- **Produtos**: Backend sempre tem prioridade (sobrescreve local)
- **Usuários**: Backend sempre tem prioridade (sobrescreve local)
- **Vendas**: PDV é a fonte da verdade (apenas upload)
- **Movimentos**: PDV é a fonte da verdade (apenas upload)
- **Contadores (CCF/COO)**: Gerenciados localmente, nunca sincronizados


---

## 🔌 API Interna (IPC)

O sistema utiliza IPC (Inter-Process Communication) do Electron para comunicação entre frontend e backend.

### Autenticação

| Método | Função | Parâmetros | Retorno |
|--------|--------|------------|---------|
| `validateUser` | Valida usuário por email | `email` (string), `password` (string) | `User` ou `null` |
| `validateUserByIdOrEmail` | Valida por ID ou email | `identifier` (string), `password` (string) | `User` ou `null` |
| `getUsers` | Lista todos os usuários | - | `User[]` |

### Produtos

| Método | Função | Parâmetros | Retorno |
|--------|--------|------------|---------|
| `getProducts` | Lista todos os produtos | - | `Product[]` |
| `getProductByBarcode` | Busca por código de barras | `barcode` (string) | `Product` ou `null` |
| `getProductByCode` | Busca por código interno | `codigo` (string) | `Product` ou `null` |

### Vendas

| Método | Função | Parâmetros | Retorno |
|--------|--------|------------|---------|
| `saveOrder` | Salva uma venda | `orderData` (object) | `{ uuid, ccf, coo }` |
| `cancelSale` | Cancela uma venda | `saleData` (object) | `{ uuid, ccf, coo, status }` |
| `getPendingOrders` | Lista vendas pendentes | - | `Sale[]` |
| `getRecentSales` | Lista vendas recentes | `limit` (number, opcional) | `Sale[]` |

### Caixa

| Método | Função | Parâmetros | Retorno |
|--------|--------|------------|---------|
| `saveCashMovement` | Registra movimento de caixa | `movement` (object) | `void` |
| `getCashBalance` | Retorna saldo atual | - | `number` (em centavos) |
| `getPendingMovements` | Lista movimentos pendentes | - | `CashMovement[]` |

### Sincronização

| Método | Função | Parâmetros | Retorno |
|--------|--------|------------|---------|
| `loadCatalog` | Carrega catálogo do backend | - | `boolean` |
| `syncNow` | Força sincronização imediata | - | `{ success, synced, error }` |
| `getStatus` | Retorna status de conexão | - | `{ isOnline, pdvId, lastCheck }` |

---

## 🛠 Tecnologias

### Dependências Principais
- **axios** - Cliente HTTP para comunicação com backend
- **dotenv** - Gerenciamento de variáveis de ambiente
- **drizzle-orm** - ORM para MySQL
- **mysql2** - Driver MySQL
- **react** - Biblioteca UI
- **react-dom** - React DOM
- **react-router-dom** - Roteamento
- **uuid** - Geração de UUIDs
- **zustand** - Gerenciamento de estado

### Dependências de Desenvolvimento
- **@types/better-sqlite3** - Tipos TypeScript
- **@types/node** - Tipos Node.js
- **@types/react** - Tipos React
- **@types/react-dom** - Tipos React DOM
- **@types/uuid** - Tipos UUID
- **@vitejs/plugin-react** - Plugin Vite para React
- **concurrently** - Execução paralela de comandos
- **drizzle-kit** - CLI do Drizzle ORM
- **electron** - Framework desktop
- **electron-builder** - Build de aplicações Electron
- **tsx** - Execução de TypeScript
- **typescript** - Linguagem TypeScript
- **vite** - Build tool
- **vite-plugin-electron** - Plugin Vite para Electron
- **vite-plugin-electron-renderer** - Renderer process plugin
- **wait-on** - Aguardar recursos

---

## 📜 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev              # Inicia aplicação em modo desenvolvimento

# Build
npm run build            # Compila TypeScript e gera build de produção
npm run preview          # Preview do build de produção

# Banco de Dados
npm run db:setup         # Configura banco de dados inicial
npm run db:generate      # Gera migrations
npm run db:migrate       # Executa migrations
npm run db:push          # Aplica schema ao banco
npm run db:studio        # Abre Drizzle Studio (GUI do banco)
```

---

## 📁 Estrutura do Projeto

```
pdv-offline/
├── electron/                    # Código Electron (Main Process)
│   ├── controllers/            # Controllers IPC
│   │   └── ipc.controller.ts  # Registro de handlers IPC
│   ├── db/                    # Configuração do banco
│   │   ├── config.ts         # Conexão MySQL
│   │   └── schema.ts         # Schema Drizzle ORM
│   ├── http/                  # Cliente HTTP
│   │   └── api-client.ts     # Comunicação com backend
│   ├── repositories/          # Camada de dados
│   │   ├── cash.repository.ts
│   │   ├── products.repository.ts
│   │   ├── sales.repository.ts
│   │   └── users.repository.ts
│   ├── services/              # Lógica de negócio
│   │   ├── auth.service.ts   # Autenticação
│   │   ├── cash.service.ts   # Gestão de caixa
│   │   ├── catalog.service.ts # Catálogo
│   │   ├── sales.service.ts  # Vendas
│   │   └── sync.service.ts   # Sincronização
│   ├── main.ts               # Entry point Electron
│   └── preload.ts            # Preload script (IPC bridge)
├── src/                       # Código React (Renderer Process)
│   ├── components/           # Componentes React
│   │   ├── BuscaProduto.tsx
│   │   ├── Carrinho.tsx
│   │   ├── ConnectionStatus.tsx
│   │   ├── ModalAutorizacao.tsx
│   │   ├── ModalDesconto.tsx
│   │   ├── ModalOpcoesDesconto.tsx
│   │   ├── ModalPagamento.tsx
│   │   ├── ModalRemoverItem.tsx
│   │   └── ModalUtilidades.tsx
│   ├── pages/                # Páginas
│   │   ├── InitialLoad.tsx  # Carregamento inicial
│   │   ├── Login.tsx        # Tela de login
│   │   └── PDV.tsx          # Tela principal do PDV
│   ├── stores/               # Estado global (Zustand)
│   │   ├── authStore.ts     # Estado de autenticação
│   │   └── vendaStore.ts    # Estado de vendas
│   ├── styles/               # Estilos CSS
│   │   └── global.css
│   ├── App.tsx              # Componente raiz
│   └── main.tsx             # Entry point React
├── drizzle/                  # Migrations
│   └── 0001_initial.sql
├── scripts/                  # Scripts utilitários
│   └── setup-db.ts          # Setup inicial do banco
├── .env                      # Variáveis de ambiente
├── drizzle.config.ts        # Configuração Drizzle
├── index.html               # HTML principal
├── package.json             # Dependências
├── tsconfig.json            # Configuração TypeScript
└── vite.config.ts           # Configuração Vite
```

---

## 📋 Regras de Negócio

Para detalhes completos sobre as regras de negócio do sistema, consulte o arquivo [RULES.md](./RULES.md).

---

## 📝 Licença

ISC

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor, abra uma issue ou pull request.

---

## 📧 Suporte

Para suporte, entre em contato através do email ou abra uma issue no repositório.

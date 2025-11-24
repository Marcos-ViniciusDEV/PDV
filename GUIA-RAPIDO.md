# Guia Rápido - Sistema PDV

## ✅ Status Atual

**Backend:** ✅ Rodando (com WebSocket)
**Frontend:** ❌ Precisa reiniciar
**PDV:** ✅ Rodando

## 🚀 Como Conectar o PDV

### Passo 1: Verificar Backend
O backend já está rodando com WebSocket em `ws://localhost:3000/pdv-ws`

### Passo 2: Abrir o PDV
O PDV já está rodando em `http://localhost:5174`

### Passo 3: Verificar Conexão
1. Abra `http://localhost:5174` no navegador
2. Abra o Console do navegador (F12)
3. Você deve ver:
   ```
   Connecting to WebSocket server...
   ✅ Connected to server
   PDV registered successfully
   ```

### Passo 4: Ver PDVs Conectados no Dashboard

**Opção A: Usar os HTMLs de exemplo**
Abra em abas separadas:
- `file:///c:/Users/loginn/Desktop/23,57/PDV/pdv-caixa-1.html`
- `file:///c:/Users/loginn/Desktop/23,57/PDV/pdv-caixa-3.html`

**Opção B: Usar o PDV principal**
- `http://localhost:5174`

### Passo 5: Acessar Gerenciar PDV
1. Acesse: `http://localhost:5173/pdv/gerenciar`
2. Você verá os PDVs conectados com:
   - Nome
   - Localização
   - Botão "Enviar Carga"

## 🔧 Solução de Problemas

### PDV não conecta
1. Verifique se o backend está rodando
2. Abra o console do navegador (F12)
3. Procure por erros de WebSocket

### Frontend não carrega
Reinicie o frontend:
```bash
cd c:\Users\loginn\Desktop\23,57\frontend
npm run dev
```

### Backend com erro
Verifique se o pacote `ws` está instalado:
```bash
cd c:\Users\loginn\Desktop\23,57\backend
npm install ws @types/ws
npm run dev
```

## 📋 Checklist

- [x] Backend rodando com WebSocket
- [x] PDV rodando em localhost:5174
- [x] Menu PDV adicionado no dashboard
- [x] Página Gerenciar PDV criada
- [x] 3 PDVs de exemplo (HTML)
- [ ] Frontend rodando
- [ ] Testar conexão completa

## 🎯 Próximos Passos

1. Reiniciar o frontend
2. Acessar http://localhost:5173/pdv/gerenciar
3. Abrir os PDVs de exemplo
4. Ver eles aparecendo na lista
5. Testar "Enviar Carga"

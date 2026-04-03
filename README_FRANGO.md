# 🍗 Frango da Letícia - PWA Moderno

Um aplicativo web progressivo (PWA) profissional e moderno para pedidos online de frango assado com notificações push em tempo real.

## ✨ Funcionalidades

### 🛒 Sistema de Pedidos
- ✅ Formulário de login com WhatsApp, nome e apelido
- ✅ Seleção de produtos (Frango Inteiro, Banda, Linguiça)
- ✅ Cálculo automático de taxa de entrega
- ✅ Suporte para entrega e retirada
- ✅ Integração com Supabase PostgreSQL

### 📱 PWA Completo
- ✅ Manifest.json com configuração de app
- ✅ Service Worker para offline support
- ✅ Ícones em múltiplos tamanhos (192x192, 512x512)
- ✅ Instalável em home screen
- ✅ Funciona offline

### 🔔 Notificações Web Push
- ✅ Configuração VAPID segura
- ✅ Subscrição de clientes
- ✅ Envio de notificações em tempo real
- ✅ Notificações por status de pedido
- ✅ Promoções e alertas

### 🎨 Design Moderno
- ✅ Gradiente laranja/âmbar profissional
- ✅ Responsivo para mobile e desktop
- ✅ Micro-interações suaves
- ✅ Acessibilidade garantida
- ✅ Tipografia clara e legível

### 💳 Integração Mercado Pago
- ✅ Preparado para integração
- ✅ Status de pagamento rastreado
- ✅ Webhooks para confirmação

### 🔐 Segurança
- ✅ Row Level Security (RLS) no Supabase
- ✅ Autenticação segura
- ✅ Dados criptografados
- ✅ VAPID para notificações

## 🚀 Início Rápido

### Pré-requisitos
- Node.js 18+
- pnpm
- Conta Supabase
- Chaves VAPID geradas

### Instalação

1. **Clone ou extraia o projeto**
```bash
cd frango-da-leticia-v2
```

2. **Instale as dependências**
```bash
pnpm install
```

3. **Configure as variáveis de ambiente**

Crie um arquivo `.env` na raiz do projeto com:

```env
# Supabase
SUPABASE_URL=https://amovvcvymhhfowaywgdc.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# VAPID para Web Push
VITE_VAPID_PUBLIC_KEY=BEFPLbHQdFEcyAr1XWBQL21BkA3ERUDztRwK9bkaR252ndTt1RwESth2h8qgYzrhu8JufqCfGXq7_XxPIBBbEao
VAPID_PRIVATE_KEY=PFeiQmtbFuXGMSJSo0j1lJXcahCthFEXS8ck53L0yNc

# Mercado Pago (quando configurar)
MERCADO_PAGO_ACCESS_TOKEN=seu_token_aqui
MERCADO_PAGO_PUBLIC_KEY=sua_chave_publica_aqui
```

4. **Inicie o servidor de desenvolvimento**
```bash
pnpm dev
```

5. **Acesse a aplicação**
```
http://localhost:3000
```

## 📁 Estrutura do Projeto

```
frango-da-leticia-v2/
├── client/
│   ├── public/
│   │   ├── manifest.json          # Configuração PWA
│   │   ├── sw.js                  # Service Worker
│   │   ├── icon-192x192.png       # Ícone 192x192
│   │   └── icon-512x512.png       # Ícone 512x512
│   ├── src/
│   │   ├── pages/
│   │   │   └── Home.tsx           # Página principal com formulário de pedidos
│   │   ├── hooks/
│   │   │   └── usePushNotifications.ts  # Hook para notificações push
│   │   ├── App.tsx                # Roteamento
│   │   └── index.css              # Estilos com tema laranja/âmbar
│   └── index.html                 # HTML com meta tags PWA
├── server/
│   ├── push-router.ts             # Router tRPC para notificações
│   ├── routers.ts                 # Routers principais
│   └── db.ts                      # Helpers de banco de dados
├── supabase_schema.sql            # Schema do banco de dados
├── drizzle/
│   └── schema.ts                  # Schema Drizzle (referência)
└── README_FRANGO.md               # Este arquivo
```

## 🗄️ Banco de Dados

### Tabelas Criadas
- `customers` - Clientes com WhatsApp, nome, apelido
- `products` - Produtos (Frango Inteiro, Banda, Linguiça)
- `orders` - Pedidos com status e informações de entrega
- `order_items` - Items de cada pedido
- `push_subscriptions` - Subscrições para notificações push
- `notifications` - Histórico de notificações
- `admins` - Usuários administrativos

### Executar Schema
O schema foi executado no Supabase SQL Editor. Se precisar executar novamente:

1. Acesse [supabase.com](https://supabase.com)
2. Vá em **SQL Editor**
3. Cole o conteúdo de `supabase_schema.sql`
4. Clique em **Run**

## 🔔 Notificações Push

### Como Funciona
1. Usuário clica em "Habilitar Notificações"
2. Service Worker é registrado
3. Subscrição é enviada para o servidor
4. Servidor armazena no banco de dados
5. Admin pode enviar notificações em tempo real

### Testar Notificações
```bash
# Enviar notificação para usuário específico
curl -X POST http://localhost:3000/api/trpc/push.sendToUser \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": 1,
    "title": "Seu pedido está pronto!",
    "body": "Venha buscar seu frango na loja"
  }'
```

## 💳 Integração Mercado Pago

### Configuração
1. Crie conta em [mercadopago.com](https://www.mercadopago.com.br)
2. Obtenha suas credenciais
3. Configure as variáveis de ambiente
4. Implemente o webhook para confirmação de pagamento

### Fluxo
1. Cliente cria pedido
2. Clica em "Pagar com Mercado Pago"
3. Redirecionado para checkout
4. Após pagamento, webhook confirma
5. Status do pedido é atualizado

## 🎨 Personalização

### Cores
Edite `client/src/index.css` para mudar o tema:
```css
:root {
  --primary: oklch(0.65 0.2 40);  /* Laranja */
  --accent: oklch(0.65 0.2 40);   /* Âmbar */
}
```

### Produtos
Edite `client/src/pages/Home.tsx` para adicionar/remover produtos:
```typescript
const PRODUCTS: Product[] = [
  { id: 1, name: "Frango Inteiro", price: 30, description: "..." },
  // Adicione mais aqui
];
```

### Taxa de Entrega
Edite `client/src/pages/Home.tsx` para mudar a taxa:
```typescript
const taxa = tipo === "entrega" && localidade !== "guamare" ? 5 : 0;
```

## 📦 Build e Deploy

### Build para Produção
```bash
pnpm build
```

### Iniciar em Produção
```bash
pnpm start
```

### Deploy no Manus
1. Crie um checkpoint no Management UI
2. Clique em **Publish**
3. Configure domínio customizado (opcional)
4. Seu site estará live!

## 🧪 Testes

### Executar Testes
```bash
pnpm test
```

### Testes Inclusos
- ✅ Configuração Supabase
- ✅ Chaves VAPID
- ✅ Logout (exemplo)

## 📱 Instalar como App

### No Android
1. Abra o site no Chrome
2. Clique em "Instalar" (ou menu → "Instalar app")
3. Confirme
4. App aparecerá na home screen

### No iOS
1. Abra o site no Safari
2. Clique em "Compartilhar"
3. Selecione "Adicionar à tela inicial"
4. Confirme
5. App aparecerá na home screen

## 🐛 Troubleshooting

### Service Worker não registra
- Verifique se o site está em HTTPS (ou localhost)
- Limpe cache do navegador
- Verifique console do navegador

### Notificações não funcionam
- Verifique permissão de notificações
- Confirme chaves VAPID configuradas
- Verifique logs do servidor

### Pedidos não salvam
- Confirme conexão com Supabase
- Verifique credenciais no `.env`
- Verifique schema do banco de dados

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique os logs do servidor
2. Verifique console do navegador
3. Consulte documentação do Supabase
4. Consulte documentação do Web Push

## 📄 Licença

Este projeto é fornecido como está. Sinta-se livre para usar e modificar conforme necessário.

---

**Desenvolvido com ❤️ para Frango da Letícia**
O melhor tempero de Guamaré! 🍗

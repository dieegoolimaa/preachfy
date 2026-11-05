# Preachfy

Bíblia, estudo e Modo Púlpito para iPhone, iPad e web, em português, inglês e espanhol.

| Pasta | O que é |
|---|---|
| `apps/mobile` | App em Expo. As mesmas telas geram iPhone, iPad e web |
| `apps/api` | API em NestJS: conta, Pro, sincronização, Comunidade e aula ao vivo |
| `packages/core` | Regras compartilhadas em TypeScript |
| `tools/bible` | Gera os textos bíblicos embutidos |
| `docs/SPEC.md` | Especificação do produto |

## Rodar localmente

Precisa de Node 22.12 ou maior.

```sh
npm install
cp apps/api/.env.example apps/api/.env   # preencha BETTER_AUTH_SECRET
cp apps/mobile/.env.example apps/mobile/.env   # chave da loja de testes do RevenueCat
npm run dev
```

Isso sobe o MongoDB local, a API em http://localhost:3001 e o web em http://localhost:8081. Os dados ficam em `apps/api/.data`.

Para assinar de verdade em desenvolvimento, use a loja de testes na tela de planos. A chave de teste do RevenueCat também pode ir em `REVENUECAT_SECRET_KEY`, até existir a chave `sk_`. Para liberar o Pro sem passar pela loja:

```sh
npm run pro -- email@exemplo.com
```

## Testes

```sh
npm test
```

# YouTube ao Vivo

Agregador de transmissões ao vivo do **YouTube** e da **Twitch**, ordenadas por número de espectadores. Filtre por categoria, plataforma e idioma (pt, en, es) e assista direto no painel do player.

A interface é em português.

## Funcionalidades

- Coleta periódica de lives do YouTube (Data API v3) e da Twitch (Helix API)
- Ranking por número de espectadores
- Filtros por categoria, plataforma e idioma
- Painel de player com navegação por teclado
- Controle de cota diária da API do YouTube
- Armazenamento local em SQLite, sem serviços externos

## Stack

Monorepo com npm workspaces:

| Pacote   | Tecnologias                                                  |
| -------- | ------------------------------------------------------------ |
| `server` | Node.js (ESM), TypeScript, Fastify 5, better-sqlite3         |
| `web`    | React 18, Vite 5, Tailwind CSS 3, TanStack Query             |

## Requisitos

- Node.js **22 ou superior**
- npm
- Credenciais de API (ao menos uma das plataformas):
  - YouTube: chave da [YouTube Data API v3](https://console.cloud.google.com/apis/library/youtube.googleapis.com)
  - Twitch: Client ID e Secret de um app criado no [Twitch Developer Console](https://dev.twitch.tv/console)

## Começando

```bash
git clone <url-do-repositorio>
cd youtube-ao-vivo
npm install
cp .env.example .env
# edite o .env com suas credenciais
```

Em dois terminais:

```bash
npm run dev:server   # API em http://localhost:4567
npm run dev:web      # interface via Vite (proxy de /api para a API)
```

## Configuração

Todas as variáveis ficam no arquivo `.env` na raiz.

| Variável                 | Padrão       | Descrição                                                       |
| ------------------------ | ------------ | --------------------------------------------------------------- |
| `YOUTUBE_API_KEY`        | —            | Chave da YouTube Data API v3                                    |
| `YOUTUBE_ENABLED`        | `false`      | Só coleta do YouTube se for `true` e houver chave               |
| `DAILY_QUOTA`            | `10000`      | Cota diária da API do YouTube                                   |
| `DAILY_SEARCHES`         | `100`        | Máximo de buscas por dia (limitado a 90)                        |
| `PAGES_PER_QUERY`        | `1`          | Páginas por busca (1–10)                                        |
| `DISCOVERY_INTERVAL_MIN` | —            | Intervalo, em minutos, da descoberta de novas lives             |
| `WATCH_INTERVAL_MIN`     | —            | Intervalo, em minutos, da atualização de lives conhecidas       |
| `WATCH_BATCH`            | —            | Lives atualizadas por ciclo                                     |
| `WATCH_CONCURRENCY`      | —            | Requisições simultâneas na atualização                          |
| `TWITCH_CLIENT_ID`       | —            | Client ID do app Twitch                                         |
| `TWITCH_CLIENT_SECRET`   | —            | Client Secret do app Twitch                                     |
| `TWITCH_INTERVAL_MIN`    | `5`          | Intervalo, em minutos, da coleta da Twitch                      |
| `TWITCH_PAGES`           | —            | Páginas coletadas da Twitch por ciclo                           |
| `PORT`                   | `4567`       | Porta da API                                                    |
| `DB_PATH`                | `lives.db`   | Caminho do arquivo SQLite                                       |

> A busca do YouTube consome muita cota (cada `search` custa 100 unidades), por isso o coletor vem desabilitado por padrão.

## API

| Rota              | Descrição                      |
| ----------------- | ------------------------------ |
| `GET /api/lives`      | Lista de lives                 |
| `GET /api/featured`   | Lives em destaque              |
| `GET /api/categories` | Categorias disponíveis         |
| `GET /api/languages`  | Idiomas disponíveis            |
| `GET /api/status`     | Estado dos coletores e da cota |

## Build e produção

```bash
npm run build           # compila server (tsc) e web (vite build)
npm start -w server     # inicia a API compilada
```

O servidor **não** serve os arquivos estáticos do `web`. Em produção, hospede `web/dist` em um servidor estático (Nginx, Caddy, CDN etc.) com proxy de `/api` para a API.

## Estrutura

```
server/src/   API Fastify, coletores (YouTube e Twitch), controle de cota, banco
web/src/      App React, componentes e cliente da API
```

## Contribuindo

Contribuições são bem-vindas. Abra uma issue para discutir mudanças maiores e envie um pull request com uma descrição clara. Antes de enviar, rode `npm run build` para garantir que tudo compila.

Nunca faça commit do `.env` ou de arquivos `*.db`.

## Avisos

Este projeto não é afiliado ao YouTube/Google nem à Twitch. O uso das APIs está sujeito aos termos de serviço de cada plataforma ([YouTube](https://developers.google.com/youtube/terms/api-services-terms-of-service), [Twitch](https://www.twitch.tv/p/legal/developer-agreement/)).

## Licença

Ainda não definida. Adicione um arquivo `LICENSE` (por exemplo, MIT) antes de publicar e atualize esta seção.

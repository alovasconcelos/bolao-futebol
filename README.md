# Bolao Entre Colegas

Aplicacao web completa para apostas sem valor financeiro entre colegas sobre partidas de futebol.

## Stack

- Backend: Node.js + Express + SQLite (`better-sqlite3`)
- Frontend: React + Vite + TypeScript + Tailwind CSS
- Banco local: `backend/data/apostas.db`

## Funcionalidades

- Cadastro e listagem de apostadores
- Cadastro de partidas
- Lancamento e edicao de palpites ate o horario da partida
- Confirmacao de resultado com bloqueio de alteracao posterior
- Calculo automatico de pontuacao em transacao SQLite
- Ranking geral na tela principal
- Cards de partidas em aberto com os palpites aninhados
- Feedback visual com toasts e confirmacao antes de fechar resultado

## Estrutura

```text
bolao-futebol/
  backend/
    data/apostas.db
    db/schema.sql
    db/seed.sql
    src/server.js
  frontend/
    src/App.tsx
    src/components/
    src/services/api.ts
  package.json
  README.md
```

## Como rodar localmente

1. Instale as dependencias na raiz do projeto:

```bash
npm install
```

2. Inicie frontend e backend juntos:

```bash
npm run dev
```

3. Acesse:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

## Banco SQLite

- O arquivo SQLite local e criado automaticamente na primeira execucao do backend.
- Caminho do banco: `backend/data/apostas.db`
- `PRAGMA foreign_keys = ON` e habilitado na conexao.

## Seed opcional

Para carregar apostadores e partidas de exemplo:

```bash
npm run seed
```

Esse comando executa o schema idempotente e depois aplica o seed em `backend/db/seed.sql`.

## Scripts principais

### Raiz

- `npm run dev`: sobe backend e frontend juntos
- `npm run dev:backend`: sobe apenas o backend
- `npm run dev:frontend`: sobe apenas o frontend
- `npm run build`: gera o build do frontend
- `npm run seed`: aplica o seed opcional

### Backend

- `npm run dev --workspace backend`
- `npm run start --workspace backend`
- `npm run seed --workspace backend`

## API REST

- `GET /api/apostadores`
- `POST /api/apostadores`
- `GET /api/partidas`
- `POST /api/partidas`
- `GET /api/partidas/:id/palpites`
- `POST /api/palpites`
- `PATCH /api/partidas/:id/resultado`
- `GET /api/ranking`
- `GET /api/partidas/abertas`

## Regras de negocio implementadas

- Um unico palpite por apostador por partida
- Se o apostador reenviar antes do prazo, o sistema atualiza o palpite existente
- O backend bloqueia palpites enviados depois da data e hora da partida
- O backend impede alterar resultado ja confirmado
- Ao confirmar resultado:
  - placar exato = 3 pontos
  - vencedor correto = 1 ponto
  - empate correto = 1 ponto
  - caso contrario = 0 ponto

## Observacoes

- O frontend usa proxy do Vite para `/api`, apontando para `http://localhost:3001`
- O backend inicializa automaticamente o schema no startup
- O build do frontend foi validado com `npm run build --workspace frontend`

# Rota Saúde — Gestão de Encaminhamentos e Transporte Sanitário (TFD)

Plataforma web para organizar o Tratamento Fora de Domicílio (TFD) de pacientes atendidos em
postos de saúde: cadastro centralizado, fila de encaminhamentos priorizada, alocação de vagas em
transporte sanitário e notificação automática (WhatsApp/SMS) para reduzir o absenteísmo.

## Stack

| Camada | Tecnologia |
| --- | --- |
| API | Fastify (TypeScript) + Prisma + SQLite |
| Frontend | Next.js 16 (App Router) + React 19 + Tailwind CSS 4 |
| Notificações | Worker em processo + bot de WhatsApp embutido (Baileys) ou simulador |

Dois pacotes:

```
rotaSaude/
├── server/             # API Fastify (porta 4000) + bot WhatsApp + SQLite (Prisma)
├── web/                # Frontend Next.js (porta 3210), consome a API via proxy /api
├── docker-compose.yml  # sobe API + web (volume rota-data para banco e sessão do bot)
└── .env.example        # configuração do compose
```

> As portas 3333 e 3000 já estavam em uso nesta máquina, por isso 4000 (API) e 3210 (web).

## Como rodar (Docker)

Pré-requisito: Docker + Docker Compose.

```bash
cp .env.example .env
docker compose up -d --build
```

Abra http://localhost:3210. Na primeira subida o SQLite é criado, populado com dados de
demonstração e persistido no volume `rota-data`. A API não publica porta no host; o web faz o
proxy de `/api` para ela.

- `WHATSAPP_PROVIDER=simulator` (padrão): registra os envios sem mandar nada — seguro para
  demonstrar o fluxo.
- `WHATSAPP_PROVIDER=baileys`: ativa o bot real (QR code); veja “Bot de WhatsApp” abaixo.
- `SEED_ON_START=true`: popula a base só quando o volume está vazio (desligado por padrão).

Para apagar banco e sessão do bot: `docker compose down -v`. Para limpar apenas clientes e dados
operacionais, sem derrubar o bot: `docker compose exec api pnpm db:clear`.

> Os pacientes do seed usam telefones de teste `(00) 00000-XXXX`, que não existem no WhatsApp —
> assim uma demonstração não envia mensagem para números reais.

### Desenvolvimento local (sem Docker)

Pré-requisito: Node.js 20+ e pnpm.

**1. API (terminal 1)**

```bash
cd server
pnpm install
pnpm db:push        # cria o banco SQLite (server/dev.db)
pnpm db:seed        # dados de demonstração
pnpm dev            # sobe a API em http://localhost:4000
```

**2. Frontend (terminal 2)**

```bash
cd web
pnpm install
pnpm dev            # sobe o site em http://localhost:3210
```

Produção: `pnpm build && pnpm start` (web) e `pnpm start` (server).

## Fluxo operacional

1. **Novo atendimento** — em uma única tela, o operador escolhe um paciente já cadastrado (busca
   por nome) ou cadastra na hora (nome, telefone e posto), informa o que ele precisa (consulta,
   exame ou tratamento), destino e urgência. O paciente entra automaticamente na **fila
   priorizada**.
2. **Priorização** — pontuação calculada assim que o item aparece na fila:
   `urgência (crítica 40 / alta 30 / média 20 / baixa 10) + 2 pts por dia de espera (máx 30) + 8 pts se 70+ / 5 pts se 60+`.
3. **Dar vaga (1 clique)** — o sistema reserva a próxima viagem planejada do mesmo destino com
   vaga livre e já envia o aviso de confirmação. Se não houver viagem, o próprio aviso oferece
   "Criar viagem" para aquele destino. Para escolher manualmente, use "Escolher viagem".
4. **Notificação** — o worker envia a confirmação pelo bot de WhatsApp (ou simulador); 24 h antes
   da saída (configurável) dispara o **lembrete** com data, horário, veículo e motorista.
5. **Viagem** — o motorista/operador inicia a viagem (*Em viagem*), marca presença de cada
   passageiro e conclui. Ao concluir, cada encaminhamento vira **Atendido** ou **Faltou**, e é
   enviada a mensagem de retorno.
6. **Absenteísmo** — o painel calcula faltas ÷ (atendimentos + faltas) nos últimos 30 dias.

### Status do encaminhamento

`AGUARDANDO_VAGA → CONFIRMADO → EM_VIAGEM → ATENDIDO | FALTOU` (mais `CANCELADO`, com reativação
para a fila).

## Telas

Navegação enxuta: **Agora**, **Pessoas**, **Viagens** + **Mensagens enviadas** e **Configurações**
no rodapé. O botão **+ Novo atendimento** abre o formulário único.

- **Agora** — visão do dia: faixa "Como funciona" dispensável, próxima viagem com **sugestões
  de passageiros** (Adicionar / Preencher vagas), resumo (fila, com vaga, viagens hoje, faltas
  30d), top 6 da fila com "Dar vaga" e últimas mensagens.
- **Novo atendimento** (`/novo`) — busca/cadastro de paciente + necessidade + destino + urgência,
  tudo em uma tela; também aceita `?patientId=` para vir do cadastro do paciente.
- **Pessoas** — lista com busca e chip de situação (Na fila / Com vaga / Em viagem / histórico);
  detalhe com dados, histórico de encaminhamentos e "Novo atendimento".
- **Fila e histórico** — abas Na fila / Com vaga / Em viagem / Histórico, busca e "Dar vaga" direto
  na linha; detalhe com ações (dar vaga, escolher viagem, tirar da viagem, cancelar/reativar) e
  mensagens enviadas em seção recolhível.
- **Viagens** — lista com ocupação e quantos pacientes daquele destino estão na fila; detalhe traz
  **sugestões de passageiros** para a viagem (ver abaixo), embarque (presente / faltou), iniciar e
  concluir viagem, remover passageiro. A criação aceita `?city=` para pré-preencher o destino.
- **Mensagens enviadas** — log com canal, tipo, status, mensagem completa e reenvio em caso de falha.
- **Configurações** — canal padrão, antecedência do lembrete, status do provedor de WhatsApp e
  **envio de mensagem de teste**.

### Sugestões de passageiros por viagem

Na tela inicial (próxima viagem) e no detalhe de cada viagem planejada, o sistema sugere
pacientes da fila **do mesmo destino**, já ordenados:

1. **Prioridade** — a mesma pontuação global (urgência + tempo de espera + idade).
2. **Data desejada** — +8 pts se a data pedida é até a viagem, −8 pts se for depois.
3. **Desempate** — quem está esperando há mais tempo.

A tela mostra o motivo de cada sugestão ("Mesmo destino", "Urgência crítica", "Cadeirante"...).
**Adicionar** reserva a vaga e dispara a confirmação; **Preencher vagas** encaixa de uma vez os
primeiros da lista até lotar o veículo, avisando cada paciente. Pacientes de outros destinos não
aparecem nas sugestões (use "Escolher viagem" no detalhe do encaminhamento para casos excepcionais).

## API (resumo)

| Método | Rota | Descrição |
| --- | --- | --- |
| GET/POST | `/api/patients` | Lista/busca e criação de pacientes |
| GET/PUT | `/api/patients/:id` | Detalhe (com encaminhamentos) e edição |
| GET/POST | `/api/referrals` | Lista com filtros (`status=a,b`, `search`) e criação |
| GET | `/api/queue` | Fila priorizada (score decrescente) |
| PATCH | `/api/referrals/:id` | Editar dados / cancelar / reativar |
| POST | `/api/referrals/:id/auto-assign` | **Dar vaga**: reserva a próxima viagem do destino com vaga |
| POST | `/api/referrals/:id/assign` | Aloca vaga em uma viagem específica (body: `{tripId}`) |
| POST | `/api/referrals/:id/unassign` | Libera a vaga e devolve à fila |
| GET/POST | `/api/trips` | Viagens e criação |
| GET/PATCH | `/api/trips/:id` | Detalhe e edição (só planejadas) |
| POST | `/api/trips/:id/status` | Iniciar (`EM_ROTA`) / concluir (`CONCLUIDA`) |
| PATCH | `/api/trips/:id/seats/:seatId` | Marcar passageiro presente/faltou |
| GET | `/api/dashboard` | KPIs do painel |
| GET/POST | `/api/notifications` | Log de notificações / reenvio (`/:id/retry`) |
| GET | `/api/notifications/provider` | Status do bot (conectado, QR code pendente, erro) |
| POST | `/api/notifications/test` | Envia mensagem de teste pelo bot (body: `{to, message?}`) |
| GET/PUT | `/api/settings` | Configurações de notificação |

## Bot de WhatsApp (Baileys, sem API da Meta)

O envio real é feito por um bot **embutido na própria API** com
[Baileys](https://baileys.wiki/) — a mesma base do WhatsApp Web. Não há Evolution, Cloud API,
conta Meta ou serviço Python: o worker conecta, mantém a sessão e envia.

### Ativar

1. No `.env` da raiz, defina `WHATSAPP_PROVIDER=baileys` e recrie a API:

```bash
WHATSAPP_PROVIDER=baileys docker compose up -d --force-recreate api
```

2. Abra **Configurações → Envio de WhatsApp** e escaneie o QR code com um número reservado
   (WhatsApp → Dispositivos conectados → Conectar dispositivo).
3. O status muda para **Conectado** e o envio de teste é liberado.

A sessão fica em `/data/baileys`, dentro do volume `rota-data`: reiniciar os containers não pede
QR novamente. Se o celular desconectar a sessão, rode `docker compose down -v` e escaneie outro
número.

### Como funciona

- Sem conexão, as notificações automáticas ficam **PENDENTE** (não viram falha) e são entregues
  quando o QR for lido.
- Cada envio grava `ENVIADA` + id do WhatsApp ou `FALHA` + erro em **Mensagens enviadas**, com
  opção de reenvio.
- Telefones são normalizados para `55DDDNUMERO`.
- O modo `simulator` (padrão) percorre o mesmo fluxo sem enviar nada.

**Atenção:** bot não oficial (WhatsApp Web), sujeito a bloqueio. Use um número reservado e baixo
volume. Os telefones do seed são fictícios, mas podem existir no WhatsApp: antes de disparar para
a base de demonstração, prefira o teste em Configurações e edite os contatos que for usar.

### Testar

- **Configurações → Verificar número**: consulta se o telefone existe no WhatsApp e mostra o
  JID canônico (ajuda a achar DDD/nono dígito errado).
- **Configurações → Enviar mensagem de teste** (telefone + mensagem) com o bot conectado.
- Via API (proxy do web):

```bash
curl -X POST localhost:3210/api/notifications/test \
  -H "Content-Type: application/json" \
  -d '{"to":"15999990000","message":"Teste do Rota Saude"}'
```

## Verificação

```bash
docker compose build
docker compose up -d
docker compose ps           # api healthy, web em 3210

cd server && pnpm exec tsc --noEmit
cd web && pnpm build        # typecheck + build de produção
```

## Reset da base de demonstração

```bash
cd server
pnpm db:reset       # recria schema + seed
# ou apenas: pnpm db:seed
```

No Docker: `docker compose down -v && docker compose up -d` (recria banco, seed e sessão).

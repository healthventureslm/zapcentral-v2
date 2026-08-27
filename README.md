# ZapCentral

**Um ramal telefônico que atende por WhatsApp.** Quem escreve para a central cai
num menu — "1 Emergência, 2 UTI, 3 Radiologia" — e a mensagem entra na fila
daquele ramal, onde uma pessoa atende pelo painel. Como um PABX, no aplicativo
que o paciente já tem aberto.

Multicanal: uma central pode operar WhatsApp, Telegram, ou os dois. Fila, ramais,
robô, ficha do contato e relatórios são agnósticos de canal — quem decide por
onde a resposta sai é o contato da conversa.

## Rodar

Precisa de **Docker Desktop aberto** e **Node 24+**. Só isto:

```bash
node scripts/subir-tudo.mjs
```

Ele instala as dependências, sobe o Postgres e a Evolution API em Docker, aplica
as migrations, compila tudo, popula dados de demonstração e serve o painel, a
API, o Socket.io e os webhooks em http://localhost:8080. De 3 a 5 minutos na
primeira vez, e rodar de novo é seguro.

## Toda a documentação está em [ENTREGA.md](ENTREGA.md)

Guia único, e o único lugar onde essas coisas são mantidas:

| Seção | Para quê |
|---|---|
| 1 | O que o produto é, e o vocabulário |
| 2 | Subir numa máquina nova |
| 3 | Parear o WhatsApp por QR |
| 4 | Telegram (exige HTTPS público) |
| 5 | **Deploy em produção** — as três formas e o que funciona em cada uma |
| 6 | O que mudou na última entrega |
| 7 | Os invariantes que não podem quebrar |
| 8 | Onde as coisas moram |
| 9 | Armadilhas conhecidas do ambiente |
| 10 | O que ainda não existe, e o código morto |

Quem vai **escrever código** aqui lê antes o [CLAUDE.md](CLAUDE.md), que traz as
regras do repositório.

## Estrutura

```
artifacts/api-server   API Express + Socket.io
artifacts/app          Painel React + Vite
lib/db                 Schema PostgreSQL (Drizzle) e migrations
scripts/subir-tudo.mjs Sobe o ambiente inteiro
```

## Verificar

```bash
pnpm run typecheck
```

> `pnpm run build` na raiz **falha** por um erro de typecheck pré-existente em
> `artifacts/zapcentral-deck`, um artifact órfão que nada importa. Para compilar
> o que é usado: `pnpm --filter @workspace/api-server run build` e
> `pnpm --filter @workspace/app run build`. Detalhes em ENTREGA.md §5.4.

## Segurança

Segredos, arquivos `.env`, dependências e caches ficam fora do versionamento
pelo `.gitignore`. Use o gerenciador de secrets do ambiente para credenciais, e
nunca publique valores reais de chaves.

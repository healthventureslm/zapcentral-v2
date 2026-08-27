/**
 * Substituido por `scripts/subir-tudo.mjs`.
 *
 * Este script preparava o ambiente do modo antigo: API num processo, dev server
 * do Vite noutro, e o painel em `:5173`. Ele nao compilava o painel e nao
 * definia `SERVE_APP`, entao rodar os dois na mesma maquina agora gera um estado
 * misturado — o `.env` diz que a API serve o painel, e o painel compilado nao
 * existe.
 *
 * Nao apagado de proposito: quem tiver o comando antigo na memoria, no historico
 * do terminal ou anotado num documento chega aqui e e mandado para o certo, em
 * vez de receber "arquivo nao encontrado" e ficar sem saber o que rodar.
 */
console.log(`
  Este script foi substituido.

  Use:

      node scripts/subir-tudo.mjs

  Ele faz o que este fazia e mais: conserta o .env, compila o painel, conserta a
  Evolution quando ela esta em laco de reinicio, e sobe UM processo que serve
  tudo em http://localhost:8080.

  O roteiro completo esta em ENTREGA.md.
`);

process.exit(1);

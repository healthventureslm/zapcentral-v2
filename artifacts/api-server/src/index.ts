import { createServer } from "http";
import app from "./app";
import { initSocket, reconciliarPresenca } from "./services/socket";
import { iniciarVarreduraDeInatividade } from "./services/inatividade";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const httpServer = createServer(app);
initSocket(httpServer);

httpServer.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
  // Ninguem esta conectado agora: zera a presenca herdada da execucao anterior.
  void reconciliarPresenca();
  iniciarVarreduraDeInatividade();
});

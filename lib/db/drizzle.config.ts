import { defineConfig } from "drizzle-kit";
import path from "path";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

// O drizzle-kit trata o caminho do schema como glob, e no glob o separador
// do Windows vale como escape. Normalizar para "/" funciona nos dois sistemas.
const schemaPath = path
  .join(__dirname, "./src/schema/index.ts")
  .split(path.sep)
  .join("/");

export default defineConfig({
  schema: schemaPath,
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});

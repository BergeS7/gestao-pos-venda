import "dotenv/config";

// Configurações lidas do arquivo .env (veja .env.example)
export const config = {
  port: Number(process.env.PORT ?? 3333),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  nodeEnv: process.env.NODE_ENV ?? "development",
};

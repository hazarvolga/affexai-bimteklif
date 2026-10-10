import dotenv from "dotenv";
import { startServer } from "./src/server/app";

dotenv.config({ path: ".env.local" });
dotenv.config();

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection in root process:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception in root process:", error);
});

startServer();

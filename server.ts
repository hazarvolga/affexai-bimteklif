import dotenv from "dotenv";
import { startServer } from "./src/server/app";
import { captureError, initErrorTracking } from "./src/server/observability/error-tracking";

dotenv.config({ path: ".env.local" });
dotenv.config();
initErrorTracking("app");

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection in root process:", reason);
  captureError(reason, { origin: "unhandledRejection" });
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception in root process:", error);
  captureError(error, { origin: "uncaughtException" });
});

startServer();

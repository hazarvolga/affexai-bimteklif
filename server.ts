import dotenv from "dotenv";
import { startServer } from "./src/server/app";

dotenv.config({ path: ".env.local" });
dotenv.config();

startServer();

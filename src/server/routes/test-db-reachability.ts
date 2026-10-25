import net from "node:net";

async function canReachDatabase(databaseUrl: string): Promise<boolean> {
  try {
    const url = new URL(databaseUrl);
    const port = Number(url.port || 5432);
    const host = url.hostname || "127.0.0.1";

    return await new Promise<boolean>((resolve) => {
      const socket = net.createConnection({ host, port });
      const done = (reachable: boolean) => {
        socket.removeAllListeners();
        socket.destroy();
        resolve(reachable);
      };

      socket.setTimeout(500);
      socket.once("connect", () => done(true));
      socket.once("error", () => done(false));
      socket.once("timeout", () => done(false));
    });
  } catch {
    return true;
  }
}

export async function skipIfDatabaseUnavailable(
  t: { skip: (message?: string) => void },
  label = "isolated HTTP integration test",
): Promise<boolean> {
  // CI sets REQUIRE_TEST_DATABASE=true: a missing database is a failure, never a silent skip (T43).
  const unavailable = (reason: string) => {
    if (process.env.REQUIRE_TEST_DATABASE === "true") throw new Error(`${reason} (REQUIRE_TEST_DATABASE=true)`);
    t.skip(reason);
    return true;
  };

  if (!process.env.DATABASE_URL) return unavailable(`DATABASE_URL is required for the ${label}`);
  if (!(await canReachDatabase(process.env.DATABASE_URL))) return unavailable(`DATABASE_URL database is not reachable for the ${label}`);
  return false;
}

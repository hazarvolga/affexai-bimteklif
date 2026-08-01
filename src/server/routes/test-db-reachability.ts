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
  if (!process.env.DATABASE_URL) {
    t.skip(`DATABASE_URL is required for the ${label}`);
    return true;
  }

  if (!(await canReachDatabase(process.env.DATABASE_URL))) {
    t.skip(`DATABASE_URL database is not reachable for the ${label}`);
    return true;
  }

  return false;
}

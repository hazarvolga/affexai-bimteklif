interface LockClient {
  query(sql: string): Promise<{ rows: Array<{ acquired?: boolean }> }>;
  release(error?: Error): void;
}
interface LockPool { connect(): Promise<LockClient> }
const LOCK_SQL = "hashtext('teklifpro'), hashtext('price-crawler-batch')";

/** Session lock uses a dedicated connection, without holding a long DB transaction. */
export async function acquireCrawlerScheduleLock(pool: LockPool): Promise<(() => Promise<void>) | null> {
  const client = await pool.connect();
  try {
    const result = await client.query(`SELECT pg_try_advisory_lock(${LOCK_SQL}) AS acquired`);
    if (!result.rows[0]?.acquired) {
      client.release();
      return null;
    }
  } catch (error) {
    client.release(error instanceof Error ? error : new Error('CRAWLER_LOCK_FAILED'));
    throw error;
  }
  return async () => {
    try {
      await client.query(`SELECT pg_advisory_unlock(${LOCK_SQL})`);
    } catch (error) {
      client.release(error instanceof Error ? error : new Error('CRAWLER_UNLOCK_FAILED'));
      throw error;
    }
    client.release();
  };
}

/** Limit anonymous catalog reads to one in-flight query, even when the DB is slow. */
export function createBoundedCatalogReader<T>(load: () => Promise<T>, timeoutMs = 2_000): () => Promise<T> {
  let pending: Promise<T> | undefined;
  return async () => {
    if (!pending) {
      const query = Promise.resolve().then(load);
      pending = query;
      void query.then(() => { if (pending === query) pending = undefined; }, () => { if (pending === query) pending = undefined; });
    }
    const query = pending;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([query, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('PUBLIC_CATALOG_TIMEOUT')), timeoutMs); })]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };
}

export type StagedAuthAction = { id: string; raw: string };

/**
 * A newly-issued link must not invalidate its predecessor until the mail
 * server has accepted the replacement. On failure, discard only the staged
 * token so a previous valid link remains usable.
 */
export async function stageAndDeliverAuthAction(input: {
  stage(): Promise<StagedAuthAction>;
  deliver(raw: string): Promise<void>;
  finalize(id: string): Promise<void>;
  discard(id: string): Promise<void>;
}): Promise<string> {
  const staged = await input.stage();
  try {
    await input.deliver(staged.raw);
    await input.finalize(staged.id);
    return staged.raw;
  } catch (error) {
    try { await input.discard(staged.id); }
    catch { /* Preserve the primary delivery/finalization failure for compensation. */ }
    throw error;
  }
}

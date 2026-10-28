export function createDocumentRequestGuard() {
  let documentId: string | null = null;
  let epoch = 0;
  let requestSequence = 0;
  let fileSequence = 0;
  return {
    select(id: string | null) { documentId = id; epoch += 1; requestSequence += 1; const selection = epoch; return () => epoch === selection && documentId === id; },
    request(id: string) { if (documentId !== id) return () => false; const selection = epoch; const sequence = ++requestSequence; return () => documentId === id && epoch === selection && requestSequence === sequence; },
    isSelected(id: string) { return documentId === id; },
    beginFileSelection() { epoch += 1; requestSequence += 1; const selection = epoch; const sequence = ++fileSequence; return () => epoch === selection && fileSequence === sequence; },
    beginSampleSelection() { epoch += 1; requestSequence += 1; const selection = epoch; return () => epoch === selection; },
    failSelection(isCurrent: () => boolean) { if (!isCurrent()) return false; documentId = null; epoch += 1; requestSequence += 1; return true; },
    captureSelection() { const selection = epoch; return () => epoch === selection; },
    capture(id: string) { const selection = epoch; return () => documentId === id && epoch === selection; },
  };
}
export async function readPollingStatus(fetchStatus: () => Promise<Response>): Promise<{run: {status: string; progressMessage?: string; errorMessage?: string} | null; document: {status: string}}> {
  const response = await fetchStatus();
  if (!response.ok) throw new Error('Durum alınamadı');
  const data = await response.json();
  if (!data?.document || typeof data.document.status !== 'string' || (data.run && typeof data.run.status !== 'string')) throw new Error('Geçersiz durum');
  return data;
}

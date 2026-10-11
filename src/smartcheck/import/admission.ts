/** Reject before downloading: parsing limits alone do not bound buffered requests. */
export function createAdmission(capacity: number) {
  let active = 0;
  return () => {
    if (active >= capacity) throw new Error('DOCUMENT_IO_BUSY');
    active += 1;
    let released = false;
    return () => { if (!released) { released = true; active -= 1; } };
  };
}
export const acquireDocumentIo = createAdmission(2);

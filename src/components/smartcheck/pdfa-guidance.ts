const NO_CONVERSION = "BIMMetraj PDF dönüştürmez; asıl dosya değiştirilmedi.";

/** Product decision (T32, 31 Oct 2026): validate only. The authoring software owns the PDF/A export. */
export function pdfaNextStep(status: "completed" | "unavailable", isCompliant: boolean | null): string {
  if (status === "completed" && isCompliant === false) {
    return `${NO_CONVERSION} Paftayı Allplan veya kullandığınız CAD programından PDF/A-2b olarak yeniden dışa aktarıp yükleyin.`;
  }
  return NO_CONVERSION;
}

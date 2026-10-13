"""Lightweight PDF/A pre-check for RG 33331 2D deliveries (first obligation: 1 Sep 2027).

Checks what can be decided without a full PDF/A validator:
- PDF/A identification in XMP metadata (pdfaid:part / conformance) — a claim, not proof;
  conformance itself needs veraPDF and is reported as such.
- Encryption (not allowed in PDF/A).
- Pages that carry images but no text, which look scanned
  (Elektronik Teslim Yönetmeliği m.6(4): printed-and-scanned PDFs cannot be used).
- File name against the EK-2 nine-field pattern (same rule as the IFC pre-check).
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

from pypdf import PdfReader
from pypdf.errors import PdfReadError

sys.path.insert(0, str(Path(__file__).resolve().parent / "vendor"))

from ifc_ruhsat.kurallar.isim import DOSYA_ADI  # noqa: E402

PDFA_NOTE = (
    "Yalnız PDF/A kimlik beyanı okunur; PDF/A uygunluğunun tam doğrulaması veraPDF gibi "
    "bir doğrulayıcı gerektirir."
)
DISCLAIMER = "Otomatik ön kontroldür; resmî uygunluk kararı değildir."

_PART = re.compile(rb"pdfaid:part(?:>|=\")\s*(\d)")
_CONFORMANCE = re.compile(rb"pdfaid:conformance(?:>|=\")\s*([ABUabu])")


def _finding(kod: str, seviye: str, mesaj: str, madde: str, sayfalar: Optional[List[int]] = None) -> Dict[str, Any]:
    finding: Dict[str, Any] = {"kod": kod, "seviye": seviye, "mesaj": mesaj, "madde": madde}
    if sayfalar:
        finding["sayfalar"] = sayfalar
    return finding


def _pdfa_claim(reader: PdfReader) -> Optional[Dict[str, str]]:
    metadata = reader.trailer["/Root"].get("/Metadata")
    if metadata is None:
        return None
    data = metadata.get_object().get_data()
    part, conformance = _PART.search(data), _CONFORMANCE.search(data)
    if not part:
        return None
    return {"part": part.group(1).decode(), "conformance": conformance.group(1).decode().upper() if conformance else ""}


def _page_has_images(page: Any) -> bool:
    resources = page.get("/Resources")
    xobjects = resources.get_object().get("/XObject") if resources else None
    if not xobjects:
        return False
    return any(xobject.get_object().get("/Subtype") == "/Image" for xobject in xobjects.get_object().values())


def _scanned_pages(reader: PdfReader) -> List[int]:
    pages = []
    for number, page in enumerate(reader.pages, start=1):
        text = (page.extract_text() or "").strip()
        if not text and _page_has_images(page):
            pages.append(number)
    return pages


def build_report(path: str, file_name: Optional[str] = None) -> Dict[str, Any]:
    file_name = file_name or Path(path).name
    findings: List[Dict[str, Any]] = []
    claim: Optional[Dict[str, str]] = None
    page_count = 0

    if not DOSYA_ADI.match(Path(file_name).stem):
        findings.append(_finding("DOSYA_ADI_EK2", "hata", "Dosya adı EK-2'deki 9 alanlı şablona uymuyor (ör. 260001_00_MM_GNEL_PL_MMC_K00_01_000).", "Dijital Hazırlama Yönetmeliği m.6, EK-2"))
    try:
        reader = PdfReader(path)
        if reader.is_encrypted:
            findings.append(_finding("SIFRELI_PDF", "hata", "PDF şifreli; PDF/A şifrelemeye izin vermez ve içerik denetlenemez.", "PDF/A (ISO 19005)"))
        else:
            page_count = len(reader.pages)
            claim = _pdfa_claim(reader)
            if claim is None:
                findings.append(_finding("PDFA_KIMLIGI_YOK", "hata", "XMP meta verisinde PDF/A kimliği (pdfaid:part) yok; dosya PDF/A olarak üretilmemiş görünüyor.", "Elektronik Teslim Yönetmeliği m.3(e), m.6"))
            if page_count > 500:
                findings.append(_finding("SAYFA_SINIRI", "uyari", "500 sayfadan büyük PDF için tarama kontrolü yapılmadı; dosyayı bölüp ayrıca inceleyin.", "PDF/A ön kontrol işlem sınırı"))
            else:
                scanned = _scanned_pages(reader)
                if scanned:
                    findings.append(_finding("TARANMIS_SAYFA_OLASI", "uyari", "Metin içermeyen görüntü sayfaları taranmış PDF'e işaret edebilir; çizim paftalarında elle inceleyin.", "Elektronik Teslim Yönetmeliği m.6(4)", scanned))
    except (PdfReadError, OSError, ValueError, KeyError):
        # Keep the file-name finding; drop partial PDF findings from a half-read file.
        findings = [f for f in findings if f["kod"] == "DOSYA_ADI_EK2"]
        findings.append(_finding("PDF_OKUNAMADI", "hata", "Dosya PDF olarak okunamadı.", "Elektronik Teslim Yönetmeliği m.6"))

    findings.append(_finding("PDFA_TAM_DOGRULAMA", "elle", PDFA_NOTE, "PDF/A (ISO 19005)"))
    summary = {level: sum(1 for f in findings if f["seviye"] == level) for level in ("hata", "uyari", "elle")}
    return {
        "schemaVersion": 1,
        "kind": "pdf_preflight",
        "file": {"fileName": file_name, "pageCount": page_count},
        "pdfa": {"claimed": claim, "note": PDFA_NOTE},
        "summary": summary,
        "findings": findings,
        "disclaimer": DISCLAIMER,
    }


def main() -> None:
    try:
        import resource
        resource.setrlimit(resource.RLIMIT_AS, (512 * 1024 * 1024, 512 * 1024 * 1024))
        resource.setrlimit(resource.RLIMIT_CPU, (60, 60))
    except (ImportError, OSError, ValueError):
        pass
    parser = argparse.ArgumentParser(description="BIMMetraj PDF/A pre-check (RG 33331)")
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--file-name")
    args = parser.parse_args()
    report = build_report(args.input, args.file_name)
    with open(args.output, "w", encoding="utf-8") as handle:
        json.dump(report, handle, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()

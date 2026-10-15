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

# Çizim paftası dosya türleri (EK-2 Tablo 2.12: Plan, Kesit, Görünüş, Detay)
_DRAWING_FILE_TYPES = frozenset({"PL", "CP", "KS", "CK", "GR", "CG", "DT", "CD"})

# TS EN ISO 216 A serisi standart boyutları (mm)
_ISO_A_SIZES_MM = (
    (210.0, 297.0),   # A4
    (297.0, 420.0),   # A3
    (420.0, 594.0),   # A2
    (594.0, 841.0),   # A1
    (841.0, 1189.0),  # A0
    (1189.0, 1682.0), # 2A0
)
_SIZE_TOLERANCE_MM = 6.0


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


def _page_size_mm(page: Any) -> Optional[tuple[float, float]]:
    box = getattr(page, "mediabox", None)
    if box is None:
        return None
    try:
        user_unit = float(page.get("/UserUnit", 1.0) or 1.0)
        w_pt = abs(float(box.width)) * user_unit
        h_pt = abs(float(box.height)) * user_unit
    except (TypeError, ValueError):
        return None
    pt_to_mm = 25.4 / 72.0
    w_mm, h_mm = w_pt * pt_to_mm, h_pt * pt_to_mm
    return (min(w_mm, h_mm), max(w_mm, h_mm))


def _is_a4_or_multiple_mm(short_mm: float, long_mm: float) -> bool:
    for iso_s, iso_l in _ISO_A_SIZES_MM:
        if abs(short_mm - iso_s) <= _SIZE_TOLERANCE_MM and abs(long_mm - iso_l) <= _SIZE_TOLERANCE_MM:
            return True
    # A4 (210x297 mm) tam katları kontrolü (m.8(1): "A4 ve katları olacak şekilde")
    for base_a, base_b in ((210.0, 297.0), (297.0, 210.0)):
        k1 = round(short_mm / base_a)
        k2 = round(long_mm / base_b)
        if k1 >= 1 and k2 >= 1:
            if abs(short_mm - k1 * base_a) <= _SIZE_TOLERANCE_MM * max(1, k1 // 2) and abs(
                long_mm - k2 * base_b
            ) <= _SIZE_TOLERANCE_MM * max(1, k2 // 2):
                return True
    return False


def _has_esignature(reader: PdfReader) -> bool:
    try:
        root = reader.trailer["/Root"].get_object()
        acro = root.get("/AcroForm")
        if acro:
            acro_obj = acro.get_object()
            fields = acro_obj.get("/Fields") or []
            for f_ref in fields:
                f_obj = f_ref.get_object()
                if f_obj.get("/FT") == "/Sig" or f_obj.get("/V") is not None and f_obj.get("/FT") == "/Sig":
                    return True
        for page in reader.pages[:20]:
            annots = page.get("/Annots")
            if not annots:
                continue
            for a_ref in annots.get_object():
                a_obj = a_ref.get_object()
                if a_obj.get("/FT") == "/Sig":
                    return True
    except Exception:  # noqa: BLE001
        return False
    return False


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
    has_esig = False

    stem_match = DOSYA_ADI.match(Path(file_name).stem)
    if not stem_match:
        findings.append(_finding("DOSYA_ADI_EK2", "hata", "Dosya adı EK-2'deki 9 alanlı şablona uymuyor (ör. 260001_00_MM_GNEL_PL_MMC_K00_01_000).", "Dijital Hazırlama Yönetmeliği m.6, EK-2"))
    file_type_code = stem_match.group(5) if stem_match else None
    is_drawing_sheet = file_type_code in _DRAWING_FILE_TYPES if file_type_code else True

    try:
        reader = PdfReader(path)
        if reader.is_encrypted:
            findings.append(_finding("SIFRELI_PDF", "hata", "PDF şifreli; PDF/A şifrelemeye izin vermez ve içerik denetlenemez.", "PDF/A (ISO 19005)"))
        else:
            page_count = len(reader.pages)
            claim = _pdfa_claim(reader)
            has_esig = _has_esignature(reader)
            if claim is None:
                findings.append(_finding("PDFA_KIMLIGI_YOK", "hata", "XMP meta verisinde PDF/A kimliği (pdfaid:part) yok; dosya PDF/A olarak üretilmemiş görünüyor.", "Elektronik Teslim Yönetmeliği m.3(e), m.6"))
            if page_count > 500:
                findings.append(_finding("SAYFA_SINIRI", "uyari", "500 sayfadan büyük PDF için tarama kontrolü yapılmadı; dosyayı bölüp ayrıca inceleyin.", "PDF/A ön kontrol işlem sınırı"))
            else:
                scanned = _scanned_pages(reader)
                if scanned:
                    findings.append(_finding("TARANMIS_SAYFA_OLASI", "uyari", "Metin içermeyen görüntü sayfaları taranmış PDF'e işaret edebilir; çizim paftalarında elle inceleyin.", "Elektronik Teslim Yönetmeliği m.6(4)", scanned))

                # m.8(1): A4 ve katları (TS EN ISO 216) sayfa boyutu kontrolü
                non_iso_pages: List[int] = []
                side_by_side_pages: List[int] = []
                for idx, page in enumerate(reader.pages, start=1):
                    dims = _page_size_mm(page)
                    if dims is None:
                        continue
                    short_mm, long_mm = dims
                    if not _is_a4_or_multiple_mm(short_mm, long_mm):
                        non_iso_pages.append(idx)
                    if is_drawing_sheet and short_mm > 0 and (long_mm / short_mm) > 3.5:
                        side_by_side_pages.append(idx)

                if non_iso_pages:
                    findings.append(
                        _finding(
                            "PAFTA_BOYUTU_ISO216",
                            "uyari",
                            "Sayfa boyutu A4 ve katları (TS EN ISO 216) standart pafta ölçülerine uymuyor.",
                            "Dijital Hazırlama Yönetmeliği m.8(1)",
                            non_iso_pages,
                        )
                    )

                # m.8(2): Tek dosyada çoklu pafta yasağı (çizim dosyalarında çoklu sayfa veya yan yana şerit pafta)
                if is_drawing_sheet and (page_count > 1 or side_by_side_pages):
                    findings.append(
                        _finding(
                            "COKLU_PAFTA_DUZENI",
                            "uyari",
                            "Her bir CAD çizim paftası için ayrı bir dijital dosya oluşturulması esastır; aynı dosya içerisinde birden fazla veya yan yana birleştirilmiş çoklu pafta düzenlenemez.",
                            "Dijital Hazırlama Yönetmeliği m.8(2)",
                            side_by_side_pages or list(range(2, page_count + 1)),
                        )
                    )
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
        "eSignature": {
            "present": has_esig,
            "note": (
                "PDF içinde elektronik imza alanı (/Sig) tespit edildi."
                if has_esig
                else "PDF içinde gömülü elektronik imza (/Sig) tespit edilmedi; e-imza kullanılmayan durumlarda idareye ıslak imzalı çıktı teslimi gerekir (Elektronik Teslim Yön. m.6/2)."
            ),
        },
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

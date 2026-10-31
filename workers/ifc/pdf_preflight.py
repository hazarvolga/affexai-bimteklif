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
_DRAWING_FILE_TYPES = frozenset({"PL", "KS", "GR", "DT", "SM"})

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

_SIGNATURE_MAX_DEPTH = 32
_SIGNATURE_MAX_OBJECTS = 10_000
_SIGNATURE_MAX_PAGES = 500


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


def _signature_verification(field_status: str) -> Dict[str, Dict[str, str]]:
    has_structural_value = field_status == "signed"
    state = "not_checked" if has_structural_value else "indeterminate"
    reason = (
        "Yapısal imza değeri bulundu; kriptografik doğrulama bu ön kontrolde çalıştırılmadı."
        if has_structural_value
        else "Doğrulanabilir bir imza değeri bulunmadığından sonuç belirlenemedi."
    )
    return {
        "cryptographic": {"status": state, "note": reason},
        "trust": {"status": state, "note": "Sertifika güven zinciri kontrol edilmedi." if has_structural_value else reason},
        "revocation": {"status": state, "note": "OCSP/CRL iptal durumu kontrol edilmedi." if has_structural_value else reason},
        "timestamp": {"status": state, "note": "Nitelikli zaman damgası kontrol edilmedi." if has_structural_value else reason},
    }


def _signature_object_key(reference: Any, value: Any) -> tuple[Any, ...]:
    indirect = getattr(reference, "indirect_reference", None) or getattr(value, "indirect_reference", None)
    if indirect is None and hasattr(reference, "idnum"):
        indirect = reference
    if indirect is not None and hasattr(indirect, "idnum"):
        return ("indirect", int(indirect.idnum), int(getattr(indirect, "generation", 0)))
    return ("direct", id(value))


def _scan_esignatures(reader: PdfReader) -> Dict[str, Any]:
    """Bounded structural scan. It deliberately performs no crypto validation."""
    state: Dict[str, Any] = {
        "signedValueCount": 0,
        "emptyFieldCount": 0,
        "malformedFieldCount": 0,
        "objectsScanned": 0,
        "scanComplete": True,
    }
    seen: set[tuple[Any, ...]] = set()
    active: set[tuple[Any, ...]] = set()

    def mark_malformed() -> None:
        state["malformedFieldCount"] += 1

    def visit(reference: Any, inherited_type: Optional[str] = None, depth: int = 0) -> None:
        if depth > _SIGNATURE_MAX_DEPTH or state["objectsScanned"] >= _SIGNATURE_MAX_OBJECTS:
            state["scanComplete"] = False
            return
        try:
            value = reference.get_object() if hasattr(reference, "get_object") else reference
        except Exception:  # noqa: BLE001
            state["scanComplete"] = False
            if inherited_type == "/Sig":
                mark_malformed()
            return
        if not hasattr(value, "get"):
            if inherited_type == "/Sig":
                mark_malformed()
            return
        explicit_type = value.get("/FT")
        field_type = str(explicit_type) if explicit_type is not None else inherited_type
        key = _signature_object_key(reference, value)
        if key in seen:
            if key in active:
                state["scanComplete"] = False
                if field_type == "/Sig":
                    mark_malformed()
            return
        seen.add(key)
        active.add(key)
        state["objectsScanned"] += 1

        is_signature = field_type == "/Sig"
        # An inherited widget without /V is part of its parent's field, not a second empty field.
        should_classify = is_signature and (explicit_type is not None or "/V" in value)
        if should_classify:
            raw_signature_value = value.get("/V") if "/V" in value else None
            if raw_signature_value is None or raw_signature_value.__class__.__name__ == "NullObject":
                state["emptyFieldCount"] += 1
            else:
                try:
                    signature_value = raw_signature_value
                    signature_value = signature_value.get_object() if hasattr(signature_value, "get_object") else signature_value
                    byte_range = signature_value.get("/ByteRange") if hasattr(signature_value, "get") else None
                    contents = signature_value.get("/Contents") if hasattr(signature_value, "get") else None
                    if (
                        hasattr(signature_value, "get")
                        and str(signature_value.get("/Type", "/Sig")) == "/Sig"
                        and byte_range is not None
                        and len(byte_range) >= 4
                        and contents is not None
                        and len(contents) > 0
                    ):
                        state["signedValueCount"] += 1
                    else:
                        mark_malformed()
                except Exception:  # noqa: BLE001
                    mark_malformed()

        try:
            kids = value.get("/Kids") or []
            kids = kids.get_object() if hasattr(kids, "get_object") else kids
            for kid in kids:
                visit(kid, field_type, depth + 1)
        except Exception:  # noqa: BLE001
            state["scanComplete"] = False
            if is_signature:
                mark_malformed()
        finally:
            active.discard(key)

    try:
        root = reader.trailer["/Root"].get_object()
        acro = root.get("/AcroForm")
        if acro:
            acro_obj = acro.get_object()
            fields = acro_obj.get("/Fields") or []
            fields = fields.get_object() if hasattr(fields, "get_object") else fields
            for field in fields:
                visit(field)
    except Exception:  # noqa: BLE001
        state["scanComplete"] = False

    pages_total = len(reader.pages)
    pages_to_scan = min(pages_total, _SIGNATURE_MAX_PAGES)
    pages_scanned = 0
    for index in range(pages_to_scan):
        try:
            page = reader.pages[index]
            annots = page.get("/Annots") or []
            annots = annots.get_object() if hasattr(annots, "get_object") else annots
            for annotation in annots:
                visit(annotation)
            pages_scanned += 1
        except Exception:  # noqa: BLE001
            state["scanComplete"] = False
    if pages_scanned != pages_total:
        state["scanComplete"] = False

    if state["malformedFieldCount"]:
        field_status = "malformed"
    elif state["signedValueCount"]:
        field_status = "signed"
    elif state["emptyFieldCount"]:
        field_status = "empty"
    elif state["scanComplete"]:
        field_status = "absent"
    else:
        field_status = "indeterminate"
    present = bool(state["signedValueCount"] or state["emptyFieldCount"] or state["malformedFieldCount"])
    state.update({
        "signatureFieldPresent": present,
        "fieldStatus": field_status,
        "pagesScanned": pages_scanned,
        "pagesTotal": pages_total,
        "verification": _signature_verification(field_status),
        "note": (
            "İmza alanı ve yapısal /V değeri tespit edildi; bu, imzanın kriptografik olarak geçerli veya güvenilir olduğunu kanıtlamaz."
            if field_status == "signed"
            else "İmza alanı taraması yapısal bir ön kontroldür; geçerlilik, güven zinciri, iptal ve zaman damgası doğrulaması değildir."
        ),
    })
    return state


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
    esignature: Dict[str, Any] = {
        "signatureFieldPresent": False, "fieldStatus": "indeterminate", "signedValueCount": 0,
        "emptyFieldCount": 0, "malformedFieldCount": 0, "scanComplete": False,
        "pagesScanned": 0, "pagesTotal": 0, "objectsScanned": 0,
        "verification": _signature_verification("indeterminate"),
        "note": "PDF okunamadığı için e-imza alanı taraması tamamlanamadı.",
    }

    stem_match = DOSYA_ADI.match(Path(file_name).stem)
    if not stem_match:
        findings.append(_finding("DOSYA_ADI_EK2", "hata", "Dosya adı EK-2'deki 9 alanlı şablona uymuyor (ör. 260001_00_MM_XXXX_PL_MMC_K00_01_000).", "Dijital Hazırlama Yönetmeliği m.6, EK-2"))
    file_type_code = stem_match.group(5) if stem_match else None
    is_drawing_sheet = file_type_code in _DRAWING_FILE_TYPES if file_type_code else True

    try:
        reader = PdfReader(path)
        if reader.is_encrypted:
            findings.append(_finding("SIFRELI_PDF", "hata", "PDF şifreli; PDF/A şifrelemeye izin vermez ve içerik denetlenemez.", "PDF/A (ISO 19005)"))
        else:
            page_count = len(reader.pages)
            claim = _pdfa_claim(reader)
            esignature = _scan_esignatures(reader)
            if esignature["fieldStatus"] == "malformed":
                findings.append(_finding("EIMZA_YAPISI_BOZUK", "uyari", "En az bir e-imza alanının /V yapısı eksik veya bozuk; imzalı kabul edilemez.", "Elektronik Teslim Yönetmeliği m.6(1)-(2)"))
            if not esignature["scanComplete"]:
                findings.append(_finding("EIMZA_TARAMA_EKSIK", "uyari", "E-imza alanı taraması güvenlik sınırları içinde tamamlanamadı; sonuç belirsizdir.", "PDF/A ön kontrol işlem sınırı"))
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
        "schemaVersion": 2,
        "kind": "pdf_preflight",
        "file": {"fileName": file_name, "pageCount": page_count},
        "pdfa": {"claimed": claim, "note": PDFA_NOTE},
        "eSignature": esignature,
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

"""BIMMetraj e-PYS pre-check (RG 33331) on top of the vendored ifc-ruhsat engine.

Adds what BIMMetraj needs around the upstream rules: regulation provenance, an EK-9
row summary, masking of personal identifiers before anything is stored, and IDS export.
The report is a pre-check; the official decision belongs to e-PYS and the authority
(Elektronik Teslim Yönetmeliği m.5).
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Any, Dict, List

sys.path.insert(0, str(Path(__file__).resolve().parent / "vendor"))

from ifc_ruhsat import SURUM, YONETMELIK, ek9, kontrol  # noqa: E402

UPSTREAM_COMMIT = "cd6d3ce"
DATA_VERIFICATION = (
    "Provisional rule-data review. The repository copy and extracted EK-1..EK-9 tables were "
    "checked for internal consistency, but the local document identity has not been matched "
    "to a final authority-issued file. Source status remains identity_pending."
)
DISCLAIMER = (
    "Otomatik ön kontroldür; resmî uygunluk kararı değildir. Değerlendirme e-PYS ve "
    "ilgili idareye, beyanın doğruluğu proje müellifine aittir (Elektronik Teslim "
    "Yönetmeliği m.5)."
)

_IFC_GLOBAL_ID_TOKEN = re.compile(r"'[0-9A-Za-z_$]{22}'")

_PATTERNS = [
    (re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+"), "[e-posta gizlendi]"),
    (
        re.compile(
            r"(?<!\w)(?:"
            r"(?:\+90|0090)[\s-]?\(?0?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}"
            r"|0\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}"
            r"|\(?[2-58]\d{2}\)?[\s-]\d{3}[\s-]\d{2}[\s-]\d{2}"
            r")(?!\w)"
        ),
        "[telefon gizlendi]",
    ),
    (re.compile(r"(?<!\w)\d{10,11}(?!\w)"), "[kimlik no gizlendi]"),
]

_PASSTHROUGH_KEYS = frozenset({"kod", "madde", "tablo", "sema", "schema", "upstreamCommit", "version", "disiplin", "discipline"})


def _mask_text(text: str) -> str:
    preserved: List[str] = []

    def _stash(match: re.Match[str]) -> str:
        preserved.append(match.group(0))
        return f"\x00GLOBALID_{len(preserved) - 1}\x00"

    masked = _IFC_GLOBAL_ID_TOKEN.sub(_stash, text)
    for pattern, replacement in _PATTERNS:
        masked = pattern.sub(replacement, masked)
    for idx, token in enumerate(preserved):
        masked = masked.replace(f"\x00GLOBALID_{idx}\x00", token)
    return masked


def mask_personal_data(value: Any) -> Any:
    """Returns a copy with TC/VKN numbers, e-mails and phone numbers masked (KVKK)."""
    if isinstance(value, str):
        return _mask_text(value)
    if isinstance(value, dict):
        return {
            key: (item if key in _PASSTHROUGH_KEYS else mask_personal_data(item))
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [mask_personal_data(item) for item in value]
    return value


def build_report(input_path: str, file_name: str, discipline: str | None = None) -> Dict[str, Any]:
    from pathlib import Path as _Path

    effective_name = file_name or os.path.basename(input_path)
    secilen_disiplin = kontrol.disiplini_sec(_Path(effective_name), discipline)
    rapor = kontrol.kontrol_et(input_path, secilen_disiplin, dosya_adi=effective_name)
    rows = [
        {"no": r["no"], "kaynakNo": r.get("kaynakNo", r["no"]), "bolum": r["bolum"], "kategori": r["kategori"],
         "baslik": r["baslik"], "soru": r["soru"], "karar": r["karar"], "elleNotu": r["elleNotu"],
         "bulgu": len(r["bulgular"]),
         "evaluationMode": "manual" if r["karar"] in {"Elle", "Kısmen (elle tamamlanacak)"} else "automatic",
         "status": "manual_review_required" if r["karar"] in {"Elle", "Kısmen (elle tamamlanacak)"} else ("failed" if r["karar"] == "Hayır" else "passed"),
         "sourceRefs": [f"EPYS_RG33331:EK-9:{secilen_disiplin}:{r.get('kaynakNo', r['no'])}"],
         "evidenceRefs": [f"model:{effective_name}:ek9-row:{r['no']}"] + [f"finding:{r['no']}:{idx + 1}" for idx, _ in enumerate(r["bulgular"])],
         "missingInputs": ["authorityDecision"] if r["karar"] in {"Elle", "Kısmen (elle tamamlanacak)"} else []}
        for r in ek9.satirlar(rapor, secilen_disiplin)
    ]
    tablo_info = ek9.tablo_bilgisi(secilen_disiplin)
    report = {
        "schemaVersion": 2,
        "kind": "epys_preflight",
        "ruleSource": {
            "regulation": YONETMELIK,
            "engine": {"name": "ifc-ruhsat", "version": SURUM, "upstreamCommit": UPSTREAM_COMMIT},
            "dataVerification": DATA_VERIFICATION,
        },
        "model": {
            "fileName": file_name,
            "schema": rapor.schema,
            "sizeBytes": os.path.getsize(input_path),
            "discipline": secilen_disiplin,
        },
        "summary": rapor.ozet(),
        "evaluationStatus": "failed" if rapor.ozet()["hata"] > 0 else "manual_review_required",
        "sourceVerificationStatus": "identity_pending",
        "ek9Table": tablo_info,
        "ek9": rows,
        "findings": [b.sozluk() for b in rapor.bulgular],
        "disclaimer": DISCLAIMER,
    }
    return mask_personal_data(report)


def write_ids(directory: str) -> List[str]:
    from ifc_ruhsat import ids_uret  # noqa: PLC0415

    return [str(path) for path in ids_uret.yaz(Path(directory))]


def main() -> None:
    try:
        import resource
        resource.setrlimit(resource.RLIMIT_AS, (2 * 1024 * 1024 * 1024, 2 * 1024 * 1024 * 1024))
        resource.setrlimit(resource.RLIMIT_CPU, (120, 120))
    except (ImportError, OSError, ValueError):
        pass
    parser = argparse.ArgumentParser(description="BIMMetraj e-PYS pre-check (RG 33331)")
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--file-name", default="")
    parser.add_argument("--discipline", default=None)
    args = parser.parse_args()
    try:
        report = build_report(args.input, args.file_name or os.path.basename(args.input), args.discipline)
    except Exception as error:  # noqa: BLE001 - surfaced as a coded failure to the Node runner
        sys.stderr.write(f"EPYS_PREFLIGHT_FAILED: {type(error).__name__}\n")
        sys.exit(1)
    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as handle:
        json.dump(report, handle, ensure_ascii=False, indent=2)
    sys.exit(0)


if __name__ == "__main__":
    main()

import io
import os
import sys

from pypdf import PdfWriter
from pypdf.generic import (
    ArrayObject,
    DecodedStreamObject,
    DictionaryObject,
    FloatObject,
    NameObject,
    NumberObject,
)

sys.path.insert(0, os.path.dirname(__file__))

import pdf_preflight  # noqa: E402

XMP_PDFA = (
    b'<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>'
    b'<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">'
    b'<rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">'
    b"<pdfaid:part>2</pdfaid:part><pdfaid:conformance>B</pdfaid:conformance>"
    b'</rdf:Description></rdf:RDF></x:xmpmeta><?xpacket end="w"?>'
)


def _page(writer: PdfWriter, content: bytes, resources: DictionaryObject) -> None:
    page = writer.add_blank_page(width=595, height=842)  # A4 in points
    stream = DecodedStreamObject()
    stream.set_data(content)
    page[NameObject("/Contents")] = writer._add_object(stream)
    page[NameObject("/Resources")] = resources


def text_pdf(pdfa: bool = False, encrypt: bool = False) -> bytes:
    writer = PdfWriter()
    font = DictionaryObject({NameObject("/Type"): NameObject("/Font"), NameObject("/Subtype"): NameObject("/Type1"), NameObject("/BaseFont"): NameObject("/Helvetica")})
    resources = DictionaryObject({NameObject("/Font"): DictionaryObject({NameObject("/F1"): font})})
    _page(writer, b"BT /F1 12 Tf 72 720 Td (Kat plani) Tj ET", resources)
    if pdfa:
        meta = DecodedStreamObject()
        meta.set_data(XMP_PDFA)
        meta[NameObject("/Type")] = NameObject("/Metadata")
        meta[NameObject("/Subtype")] = NameObject("/XML")
        writer._root_object[NameObject("/Metadata")] = writer._add_object(meta)
    if encrypt:
        writer.encrypt("secret")
    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()


def scanned_pdf() -> bytes:
    writer = PdfWriter()
    image = DecodedStreamObject()
    image.set_data(b"\x80")
    image.update({
        NameObject("/Type"): NameObject("/XObject"), NameObject("/Subtype"): NameObject("/Image"),
        NameObject("/Width"): NumberObject(1), NameObject("/Height"): NumberObject(1),
        NameObject("/ColorSpace"): NameObject("/DeviceGray"), NameObject("/BitsPerComponent"): NumberObject(8),
    })
    resources = DictionaryObject({NameObject("/XObject"): DictionaryObject({NameObject("/Im0"): writer._add_object(image)})})
    _page(writer, b"q 595 0 0 842 0 0 cm /Im0 Do Q", resources)
    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()


def write(tmp_path, name: str, data: bytes) -> str:
    path = os.path.join(tmp_path, name)
    with open(path, "wb") as handle:
        handle.write(data)
    return path


def codes(report):
    return {finding["kod"] for finding in report["findings"]}


def test_pdfa_claim_with_text_and_ek2_name_has_no_errors(tmp_path):
    path = write(tmp_path, "260001_00_MM_GNEL_PL_MMC_K00_01_000.pdf", text_pdf(pdfa=True))
    report = pdf_preflight.build_report(path)
    assert report["summary"]["hata"] == 0
    assert report["pdfa"]["claimed"] == {"part": "2", "conformance": "B"}
    assert "veraPDF" in report["pdfa"]["note"]


def test_missing_pdfa_identification_is_an_error(tmp_path):
    report = pdf_preflight.build_report(write(tmp_path, "260001_00_MM_GNEL_PL_MMC_K00_01_000.pdf", text_pdf()))
    assert "PDFA_KIMLIGI_YOK" in codes(report)


def test_image_only_pages_are_flagged_as_possibly_scanned(tmp_path):
    report = pdf_preflight.build_report(write(tmp_path, "260001_00_MM_GNEL_PL_MMC_K00_01_000.pdf", scanned_pdf()))
    assert "TARANMIS_SAYFA_OLASI" in codes(report)
    finding = next(f for f in report["findings"] if f["kod"] == "TARANMIS_SAYFA_OLASI")
    assert "m.6" in finding["madde"]
    assert finding["sayfalar"] == [1]


def test_encrypted_pdf_is_rejected(tmp_path):
    report = pdf_preflight.build_report(write(tmp_path, "260001_00_MM_GNEL_PL_MMC_K00_01_000.pdf", text_pdf(pdfa=True, encrypt=True)))
    assert "SIFRELI_PDF" in codes(report)


def test_file_name_must_follow_ek2_nine_field_pattern(tmp_path):
    report = pdf_preflight.build_report(write(tmp_path, "Mimari_Zemin_Kat_Plani_Son.pdf", text_pdf(pdfa=True)))
    assert "DOSYA_ADI_EK2" in codes(report)


def test_unreadable_file_reports_error_instead_of_passing(tmp_path):
    report = pdf_preflight.build_report(write(tmp_path, "260001_00_MM_GNEL_PL_MMC_K00_01_000.pdf", b"not a pdf"))
    assert "PDF_OKUNAMADI" in codes(report)
    assert report["summary"]["hata"] == 1

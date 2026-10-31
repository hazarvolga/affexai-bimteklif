import io
import os
import sys

from pypdf import PdfWriter
from pypdf.generic import (
    ArrayObject,
    ByteStringObject,
    DecodedStreamObject,
    DictionaryObject,
    FloatObject,
    NameObject,
    NullObject,
    NumberObject,
    TextStringObject,
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


def signature_pdf(
    *,
    page_number: int = 1,
    nested: bool = False,
    value: str = "empty",
    include_acroform: bool = True,
) -> bytes:
    """Build a structural signature-field fixture; it contains no valid crypto."""
    writer = PdfWriter()
    pages = [writer.add_blank_page(width=595, height=842) for _ in range(max(1, page_number))]
    widget = DictionaryObject({
        NameObject("/Type"): NameObject("/Annot"),
        NameObject("/Subtype"): NameObject("/Widget"),
        NameObject("/FT"): NameObject("/Sig"),
        NameObject("/T"): TextStringObject("EngineerSignature"),
    })
    if value == "signed":
        widget[NameObject("/V")] = writer._add_object(DictionaryObject({
            NameObject("/Type"): NameObject("/Sig"),
            NameObject("/ByteRange"): ArrayObject([NumberObject(0), NumberObject(1), NumberObject(2), NumberObject(3)]),
            NameObject("/Contents"): ByteStringObject(b"not-a-real-signature"),
        }))
    elif value == "malformed":
        widget[NameObject("/V")] = TextStringObject("broken-signature-value")
    elif value == "null":
        widget[NameObject("/V")] = NullObject()
    widget_ref = writer._add_object(widget)
    pages[page_number - 1][NameObject("/Annots")] = ArrayObject([widget_ref])

    if nested:
        del widget[NameObject("/FT")]
        parent = DictionaryObject({
            NameObject("/FT"): NameObject("/Sig"),
            NameObject("/T"): TextStringObject("ParentSignature"),
            NameObject("/Kids"): ArrayObject([widget_ref]),
        })
        fields = ArrayObject([writer._add_object(parent)])
    else:
        fields = ArrayObject([widget_ref])
    if include_acroform:
        writer._root_object[NameObject("/AcroForm")] = writer._add_object(DictionaryObject({NameObject("/Fields"): fields}))
    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()


def codes(report):
    return {finding["kod"] for finding in report["findings"]}


def test_pdfa_claim_with_text_and_ek2_name_has_no_errors(tmp_path):
    path = write(tmp_path, "260001_00_MM_XXXX_PL_MMC_K00_01_000.pdf", text_pdf(pdfa=True))
    report = pdf_preflight.build_report(path)
    assert report["summary"]["hata"] == 0
    assert report["pdfa"]["claimed"] == {"part": "2", "conformance": "B"}
    assert "veraPDF" in report["pdfa"]["note"]


def test_missing_pdfa_identification_is_an_error(tmp_path):
    report = pdf_preflight.build_report(write(tmp_path, "260001_00_MM_XXXX_PL_MMC_K00_01_000.pdf", text_pdf()))
    assert "PDFA_KIMLIGI_YOK" in codes(report)


def test_image_only_pages_are_flagged_as_possibly_scanned(tmp_path):
    report = pdf_preflight.build_report(write(tmp_path, "260001_00_MM_XXXX_PL_MMC_K00_01_000.pdf", scanned_pdf()))
    assert "TARANMIS_SAYFA_OLASI" in codes(report)
    finding = next(f for f in report["findings"] if f["kod"] == "TARANMIS_SAYFA_OLASI")
    assert "m.6" in finding["madde"]
    assert finding["sayfalar"] == [1]
    assert finding["seviye"] == "uyari"


def test_uploaded_filename_is_used_instead_of_temporary_worker_filename(tmp_path):
    report = pdf_preflight.build_report(write(tmp_path, "document.pdf", text_pdf(pdfa=True)), "260001_00_MM_XXXX_PL_MMC_K00_01_000.pdf")
    assert report["file"]["fileName"] == "260001_00_MM_XXXX_PL_MMC_K00_01_000.pdf"
    assert "DOSYA_ADI_EK2" not in codes(report)


def test_encrypted_pdf_is_rejected(tmp_path):
    report = pdf_preflight.build_report(write(tmp_path, "260001_00_MM_XXXX_PL_MMC_K00_01_000.pdf", text_pdf(pdfa=True, encrypt=True)))
    assert "SIFRELI_PDF" in codes(report)


def test_file_name_must_follow_ek2_nine_field_pattern(tmp_path):
    report = pdf_preflight.build_report(write(tmp_path, "Mimari_Zemin_Kat_Plani_Son.pdf", text_pdf(pdfa=True)))
    assert "DOSYA_ADI_EK2" in codes(report)


def test_unreadable_file_reports_error_instead_of_passing(tmp_path):
    report = pdf_preflight.build_report(write(tmp_path, "260001_00_MM_XXXX_PL_MMC_K00_01_000.pdf", b"not a pdf"))
    assert "PDF_OKUNAMADI" in codes(report)
    assert report["summary"]["hata"] == 1


def test_non_iso216_page_size_and_multi_sheet_drawing_warnings(tmp_path):
    writer = PdfWriter()
    font = DictionaryObject({NameObject("/Type"): NameObject("/Font"), NameObject("/Subtype"): NameObject("/Type1"), NameObject("/BaseFont"): NameObject("/Helvetica")})
    resources = DictionaryObject({NameObject("/Font"): DictionaryObject({NameObject("/F1"): font})})
    # Non-ISO arbitrary page size (e.g. 500x500 pt = 176.4x176.4 mm) and 2 pages in a PL (Plan) drawing file
    for _ in range(2):
        page = writer.add_blank_page(width=500, height=500)
        stream = DecodedStreamObject()
        stream.set_data(b"BT /F1 12 Tf 72 400 Td (Pafta) Tj ET")
        page[NameObject("/Contents")] = writer._add_object(stream)
        page[NameObject("/Resources")] = resources
    meta = DecodedStreamObject()
    meta.set_data(XMP_PDFA)
    meta[NameObject("/Type")] = NameObject("/Metadata")
    meta[NameObject("/Subtype")] = NameObject("/XML")
    writer._root_object[NameObject("/Metadata")] = writer._add_object(meta)
    out = io.BytesIO()
    writer.write(out)

    path = write(tmp_path, "260001_00_MM_XXXX_PL_MMC_K00_01_000.pdf", out.getvalue())
    report = pdf_preflight.build_report(path)
    assert "PAFTA_BOYUTU_ISO216" in codes(report)
    assert "COKLU_PAFTA_DUZENI" in codes(report)
    assert report["eSignature"]["signatureFieldPresent"] is False
    assert report["eSignature"]["fieldStatus"] == "absent"

    # Same 2-page PDF as a Report (RP_SHR) should NOT trigger COKLU_PAFTA_DUZENI
    report_rp = pdf_preflight.build_report(path, "260001_00_ST_BETO_RP_SHR_NNN_01_000.pdf")
    assert "COKLU_PAFTA_DUZENI" not in codes(report_rp)


def test_signature_scan_reaches_page_21_and_reports_complete_counts(tmp_path):
    path = write(tmp_path, "260001_00_ST_BETO_RP_SHR_NNN_01_000.pdf", signature_pdf(page_number=21, value="signed", include_acroform=False))
    report = pdf_preflight.build_report(path)
    signature = report["eSignature"]
    assert report["schemaVersion"] == 2
    assert signature["fieldStatus"] == "signed"
    assert signature["signatureFieldPresent"] is True
    assert signature["scanComplete"] is True
    assert signature["pagesScanned"] == 21
    assert signature["pagesTotal"] == 21
    assert signature["verification"]["cryptographic"]["status"] == "not_checked"
    assert signature["verification"]["trust"]["status"] == "not_checked"
    assert signature["verification"]["revocation"]["status"] == "not_checked"
    assert signature["verification"]["timestamp"]["status"] == "not_checked"


def test_nested_empty_signature_field_is_not_reported_as_signed(tmp_path):
    path = write(tmp_path, "260001_00_ST_BETO_RP_SHR_NNN_01_000.pdf", signature_pdf(nested=True, value="empty"))
    signature = pdf_preflight.build_report(path)["eSignature"]
    assert signature["fieldStatus"] == "empty"
    assert signature["signatureFieldPresent"] is True
    assert signature["signedValueCount"] == 0
    assert signature["emptyFieldCount"] >= 1
    assert signature["verification"]["cryptographic"]["status"] == "indeterminate"


def test_malformed_signature_value_is_explicit_and_never_claimed_valid(tmp_path):
    path = write(tmp_path, "260001_00_ST_BETO_RP_SHR_NNN_01_000.pdf", signature_pdf(value="malformed"))
    signature = pdf_preflight.build_report(path)["eSignature"]
    assert signature["fieldStatus"] == "malformed"
    assert signature["malformedFieldCount"] >= 1
    assert signature["signedValueCount"] == 0
    assert all(item["status"] == "indeterminate" for item in signature["verification"].values())


def test_cyclic_signature_kids_are_bounded_and_mark_scan_incomplete(tmp_path):
    writer = PdfWriter()
    writer.add_blank_page(width=595, height=842)
    field = DictionaryObject({NameObject("/FT"): NameObject("/Sig")})
    field_ref = writer._add_object(field)
    field[NameObject("/Kids")] = ArrayObject([field_ref])
    writer._root_object[NameObject("/AcroForm")] = writer._add_object(
        DictionaryObject({NameObject("/Fields"): ArrayObject([field_ref])})
    )
    out = io.BytesIO()
    writer.write(out)
    path = write(tmp_path, "260001_00_ST_BETO_RP_SHR_NNN_01_000.pdf", out.getvalue())
    signature = pdf_preflight.build_report(path)["eSignature"]
    assert signature["scanComplete"] is False
    assert signature["fieldStatus"] == "malformed"
    assert signature["objectsScanned"] <= pdf_preflight._SIGNATURE_MAX_OBJECTS


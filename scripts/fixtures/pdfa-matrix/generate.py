"""Generate the T32 PDF/A validation fixture matrix.

Run only through generate.sh (pinned container). Every derived file starts from the
CC-BY-4.0 veraPDF corpus pair in fixtures/phase-0/open-source/verapdf or from scratch.
The signing key is a throwaway self-signed test key that is never written to disk.
"""

import argparse
import datetime
import io
from pathlib import Path

import pikepdf
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID
from asn1crypto import keys as asn1_keys, x509 as asn1_x509
from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter
from pyhanko.sign import signers
from pyhanko.sign.fields import SigFieldSpec, SigSeedSubFilter

PDFA2B_XMP = b"""<?xpacket begin="\xef\xbb\xbf" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">
   <pdfaid:part>2</pdfaid:part>
   <pdfaid:conformance>B</pdfaid:conformance>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>"""


def text_page(pdf: pikepdf.Pdf, label: str) -> pikepdf.Page:
    font = pdf.make_indirect(pikepdf.Dictionary(Type=pikepdf.Name.Font, Subtype=pikepdf.Name.Type1, BaseFont=pikepdf.Name.Helvetica))
    content = pdf.make_stream(f"BT /F1 18 Tf 72 720 Td ({label}) Tj ET".encode("ascii"))
    return pikepdf.Page(pikepdf.Dictionary(
        Type=pikepdf.Name.Page,
        MediaBox=[0, 0, 595, 842],
        Resources=pikepdf.Dictionary(Font=pikepdf.Dictionary(F1=font)),
        Contents=content,
    ))


def plain(out: Path) -> None:
    pdf = pikepdf.new()
    pdf.pages.append(text_page(pdf, "Plain PDF, no PDF/A claim"))
    pdf.save(out, static_id=True, deterministic_id=True)


def xmp_label_only(out: Path) -> None:
    # Claims PDF/A-2b in XMP but has no OutputIntent and a non-embedded font.
    pdf = pikepdf.new()
    pdf.pages.append(text_page(pdf, "PDF/A-2b label in XMP only"))
    pdf.Root.Metadata = pdf.make_stream(PDFA2B_XMP, Type=pikepdf.Name.Metadata, Subtype=pikepdf.Name.XML)
    pdf.save(out, static_id=True, deterministic_id=True)


def multipage(pass_pdf: Path, fail_pdf: Path, out_valid: Path, out_last_page_bad: Path) -> None:
    with pikepdf.open(pass_pdf) as base, pikepdf.open(fail_pdf) as bad:
        for target, extra in ((out_valid, base), (out_last_page_bad, bad)):
            with pikepdf.open(pass_pdf) as pdf:
                pdf.pages.append(base.pages[0])
                pdf.pages.append(extra.pages[0])
                pdf.save(target)


def missing_font(pass_pdf: Path, out: Path) -> None:
    # Keeps the compliant corpus file intact and only adds text in a non-embedded font.
    with pikepdf.open(pass_pdf) as pdf:
        page = pdf.pages[0]
        font = pdf.make_indirect(pikepdf.Dictionary(Type=pikepdf.Name.Font, Subtype=pikepdf.Name.Type1, BaseFont=pikepdf.Name.Helvetica))
        resources = page.obj.get("/Resources") or pikepdf.Dictionary()
        fonts = resources.get("/Font") or pikepdf.Dictionary()
        fonts.T32Missing = font
        resources.Font = fonts
        page.obj.Resources = resources
        page.contents_add(pdf.make_stream(b"BT /T32Missing 12 Tf 10 10 Td (Font not embedded) Tj ET"), prepend=False)
        pdf.save(out)


def throwaway_signer() -> signers.SimpleSigner:
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "BIMMetraj T32 fixture signer (test only)")])
    now = datetime.datetime(2026, 10, 25, tzinfo=datetime.timezone.utc)
    cert = (x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(key.public_key())
            .serial_number(32).not_valid_before(now).not_valid_after(now + datetime.timedelta(days=3650))
            .sign(key, hashes.SHA256()))
    key_der = key.private_bytes(serialization.Encoding.DER, serialization.PrivateFormat.PKCS8, serialization.NoEncryption())
    return signers.SimpleSigner(
        signing_cert=asn1_x509.Certificate.load(cert.public_bytes(serialization.Encoding.DER)),
        signing_key=asn1_keys.PrivateKeyInfo.load(key_der),
        cert_registry=None,
    )


def signed(pass_pdf: Path, out: Path) -> None:
    writer = IncrementalPdfFileWriter(io.BytesIO(pass_pdf.read_bytes()))
    meta = signers.PdfSignatureMetadata(field_name="T32Signature", subfilter=SigSeedSubFilter.PADES)
    output = signers.sign_pdf(writer, meta, signer=throwaway_signer(), new_field_spec=SigFieldSpec("T32Signature"))
    out.write_bytes(output.getvalue())


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-dir", type=Path, required=True)
    parser.add_argument("--out-dir", type=Path, required=True)
    args = parser.parse_args()
    pass_pdf = args.source_dir / "pdfa2b-pass.pdf"
    fail_pdf = args.source_dir / "pdfa2b-fail.pdf"
    out = args.out_dir
    out.mkdir(parents=True, exist_ok=True)
    plain(out / "plain.pdf")
    xmp_label_only(out / "xmp-label-only.pdf")
    multipage(pass_pdf, fail_pdf, out / "multipage-pdfa2b.pdf", out / "multipage-last-page-invalid.pdf")
    missing_font(pass_pdf, out / "missing-font.pdf")
    signed(pass_pdf, out / "signed-pdfa2b.pdf")


if __name__ == "__main__":
    main()

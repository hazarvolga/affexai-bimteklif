# Open-source Phase 0 fixtures

These files are retained as immutable technical reference inputs. They are not
vendor-export certification, independent engineering expected results, or
customer acceptance evidence.

## buildingSMART Certification datasets

- Upstream: <https://github.com/buildingSMART/Certification-datasets>
- Pinned commit: `80d976a9b193a26a8e928c3e79bff67af1de68a8`
- License: Creative Commons Attribution 4.0 International (`CC-BY-4.0`)
- Copyright: buildingSMART International Ltd.
- License text: <https://github.com/buildingSMART/Certification-datasets/blob/80d976a9b193a26a8e928c3e79bff67af1de68a8/LICENSE>

Local file names and immutable upstream paths are recorded in
`docs/audits/phase-0/open-source-fixture-register.json`.

## veraPDF corpus

- Upstream: <https://github.com/veraPDF/veraPDF-corpus>
- Pinned commit: `bb75f4f0073d9350dfd058c0162a367e6fadf25e`
- License: Creative Commons Attribution 4.0 International (`CC-BY-4.0`)
- Attribution: veraPDF Consortium test corpus
- License declaration: <https://github.com/veraPDF/veraPDF-corpus/blob/bb75f4f0073d9350dfd058c0162a367e6fadf25e/README.md>

The copied pair is the atomic PDF/A-2b annotation-appearance test case
`6-3-3-t01`, with one upstream-declared PASS file and one upstream-declared
FAIL file. TeklifPro's current preflight does not run veraPDF and therefore
must not describe either result as a full PDF/A conformity decision.

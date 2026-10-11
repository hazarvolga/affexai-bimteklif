import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchOfficialRegulation, parseOfficialRegulation, validateOfficialDocumentUrl } from './official-document';
const url = 'https://www.resmigazete.gov.tr/eskiler/2026/10/20261011-4.htm';
const html = '<html><head><title>Örnek Tebliğ</title><script>invented instruction</script></head><body><p>Vergi Usul Kanunu Genel Tebliği</p><p>Bu örnek belge test içindir. Yürürlük tarihi bu adaptör tarafından belirlenmez.</p></body></html>';
test('official document preserves fetched evidence without inventing effect or effective date', () => {
 const document = parseOfficialRegulation(url, html, new Date('2026-10-11T10:00:00Z'));
 assert.equal(document.sourceUrl,url); assert.equal(document.sourceHash.length,64);
 assert.equal(document.publishedAt,'2026-10-11T00:00:00.000Z');
 assert.equal(document.change.effectiveFrom,null); assert.equal(document.licenseStatus,'unknown');
 assert.match(document.change.sourceText,/test içindir/); assert.doesNotMatch(document.change.sourceText,/invented instruction/);
 assert.equal(document.change.summary.includes('Bu örnek'),true);
});
test('rejects arbitrary hosts, credentials, ports, redirects target URLs and unsupported formats', () => {
 for(const bad of ['not a URL', 'http://www.resmigazete.gov.tr/eskiler/2026/10/20261011-4.htm', url.replace('www.resmigazete.gov.tr','www.resmigazete.gov.tr.evil.test'),url.replace('https://','https://user:pass@'),url.replace('.gov.tr/','.gov.tr:444/'),url.replace('.htm','.pdf'),url+'?redirect=http://localhost',url.replace('20261011','20260231')]) assert.throws(()=>validateOfficialDocumentUrl(bad));
});
test('network failure and malformed/oversized documents never return synthetic content', async()=>{
 await assert.rejects(fetchOfficialRegulation(url,async()=>{throw Error('unavailable');}),/REGULATION_SOURCE_UNAVAILABLE/);
 assert.throws(()=>parseOfficialRegulation(url,'<html>Access Denied</html>'),/REGULATION_DOCUMENT_INVALID/);
 assert.throws(()=>parseOfficialRegulation(url,'x'.repeat(262145)),/REGULATION_DOCUMENT_TOO_LARGE/);
 assert.throws(()=>validateOfficialDocumentUrl(undefined),/REGULATION_SOURCE_REQUIRED/);
});

test('legacy encodings and damaged decoding fail closed rather than changing Turkish law text',()=>{
 assert.throws(()=>parseOfficialRegulation(url,'<meta charset=windows-1254>'+html),/ENCODING_UNSUPPORTED/);
 assert.throws(()=>parseOfficialRegulation(url,html+'�'),/ENCODING_UNSUPPORTED/);
});

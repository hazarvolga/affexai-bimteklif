import assert from "node:assert/strict";
import test from "node:test";
import { gazetteIssueUrl, matchRegulationKeywords, parseGazetteIssue, recentIssueDates } from "./gazette";
import { parseGibAnnouncements } from "./gib";
import { ocrPdfText, pageCountFromPdfInfo } from "./pdf-text";
import { runRegulationWatch, type RegulationWatchStore } from "./service";
import { decodeCrawlerText } from "../crawler/safe-fetch";

test("a windows-1254 page keeps its Turkish letters, and undeclared pages stay UTF-8", () => {
  const legacy = Buffer.concat([Buffer.from('<meta charset=windows-1254>', "latin1"), Buffer.from([0xfe, 0xd0, 0xdd])]);
  assert.equal(decodeCrawlerText(legacy).slice(-3), "şĞİ");
  assert.equal(decodeCrawlerText(Buffer.from("şap", "utf8")), "şap");
});

const issue = `
<a href="20261031.pdf"> </a>
<a href="20261031-5.htm" style="text-decoration: none">––&nbsp;&nbsp; Katma Değer Vergisi Genel Uygulama
  Tebliğinde Değişiklik Yapılmasına Dair Tebliğ (Seri No: 60)</a>
<a href="20261031-6.pdf"><font>–– Türkiye Buz Hokeyi Federasyonu Ana Statüsü</font></a>
<a href="https://www.resmigazete.gov.tr/eskiler/2026/10/20261031M1-1.htm">–– Damga Vergisi Kanunu Genel Tebliği</a>
<a href="https://evil.example/20261031-7.htm">–– Damga Vergisi Sahte Bağlantı</a>
<a href="../2026/10/index.htm">–– Önceki</a>`;

test("an issue page yields each decision with its absolute official link", () => {
  const entries = parseGazetteIssue(issue, "2026-10-31");
  assert.deepEqual(entries.map(entry => entry.url), [
    "https://www.resmigazete.gov.tr/eskiler/2026/10/20261031-5.htm",
    "https://www.resmigazete.gov.tr/eskiler/2026/10/20261031-6.pdf",
    "https://www.resmigazete.gov.tr/eskiler/2026/10/20261031M1-1.htm",
  ]);
  assert.equal(entries[0].title, "Katma Değer Vergisi Genel Uygulama Tebliğinde Değişiklik Yapılmasına Dair Tebliğ (Seri No: 60)");
});

test("keywords match regardless of Turkish casing, and unrelated titles stay out", () => {
  assert.deepEqual(matchRegulationKeywords("KATMA DEĞER VERGİSİ GENEL UYGULAMA TEBLİĞİ"), ["katma değer vergisi"]);
  assert.deepEqual(matchRegulationKeywords("Damga Vergisi Kanunu Genel Tebliği"), ["damga vergisi"]);
  assert.ok(matchRegulationKeywords("Kamu İhale Genel Tebliğinde Değişiklik").includes("kamu ihale"));
  assert.deepEqual(matchRegulationKeywords("Türkiye Buz Hokeyi Federasyonu Ana Statüsü"), []);
});

test("the checked days are computed in Istanbul, not server time", () => {
  assert.deepEqual(recentIssueDates(new Date("2026-10-31T22:30:00Z"), 3), ["2026-11-01", "2026-10-31", "2026-10-30"]);
  assert.equal(gazetteIssueUrl("2026-11-01"), "https://www.resmigazete.gov.tr/eskiler/2026/11/20261101.htm");
});

const gib = JSON.stringify({ resultContainer: { content: [
  { title: "Kurumlar Vergisi 74 Nolu Sirküler Yayımlandı", slug: "19314_kvk", startdate: "2026-10-30T18:15:00", ilkodu: "UNIVERSAL", summary: null },
  { title: "Gelir Vergisi Rekortmenleri", slug: "19081_il", startdate: "2026-09-30T00:00:00", ilkodu: "OSMANIYE", summary: null },
  { title: "Sınav Sonucu", slug: "19151_sinav", startdate: "2026-10-01T00:00:00", ilkodu: "UNIVERSAL", summary: null },
] } });

function memoryStore(checked: string[] = []) {
  const items: Array<{ url: string; source: string; matchScope: string; matchedKeywords: string[] }> = [];
  const days: Array<{ source: string; issueDate: string; status: string; matchedCount: number; unreadCount: number; errorCode: string | null }> = [];
  const store: RegulationWatchStore = {
    checkedDays: async () => checked,
    saveItems: async rows => { items.push(...rows); },
    saveDay: async day => { days.push(day); },
  };
  return { store, items, days };
}

const baseInput = { now: new Date("2026-10-31T12:00:00Z"), pause: async () => undefined, postJson: async () => gib, readPdfText: async () => ({ text: "", truncated: false }) };
const gazetteDays = (days: ReturnType<typeof memoryStore>["days"]) => days.filter(day => day.source === "resmi_gazete");

test("GİB keeps matching nationwide and provincial announcements and shows the region", () => {
  const items = parseGibAnnouncements(gib);
  assert.deepEqual(items.map(item => [item.url, item.issueDate, item.region]), [
    ["https://gib.gov.tr/duyuru-arsivi/guncel/19314_kvk", "2026-10-30", null],
    ["https://gib.gov.tr/duyuru-arsivi/guncel/19081_il", "2026-09-30", "OSMANIYE"],
  ]);
});

test("an unexpected GİB response is an error, not an empty result", () => {
  assert.throws(() => parseGibAnnouncements("{}"));
  assert.throws(() => parseGibAnnouncements(JSON.stringify({ resultContainer: { content: [] } })));
});

test("scanned PDF text is searched, and PDFs that fail, are empty or are cut short are counted", async () => {
  const { store, items, days } = memoryStore();
  const page = ['1', '2', '3', '4'].map(n => `<a href="20261031-${n}.pdf">–– Karar ${n}</a>`).join("");
  const texts: Record<string, () => Promise<{ text: string; truncated: boolean }>> = {
    "1": async () => ({ text: "Gelir Vergisi Kanununun 94 üncü maddesi", truncated: false }),
    "2": async () => { throw new Error("OCR_FAILED"); },
    "3": async () => ({ text: "   ", truncated: false }),
    "4": async () => ({ text: "uzun andlaşma", truncated: true }),
  };
  await runRegulationWatch({ ...baseInput, store, lookbackDays: 1, fetchHtml: async () => page, readPdfText: url => texts[url.slice(-5, -4)]() });
  assert.deepEqual(items.filter(item => item.source === "resmi_gazete").map(item => [item.url.slice(-5), item.matchScope]), [["1.pdf", "body"]]);
  assert.equal(gazetteDays(days)[0].status, "checked");
  assert.equal(gazetteDays(days)[0].unreadCount, 3);
});

test("a day stores title matches, reads decision bodies, and counts PDFs it could not read", async () => {
  const { store, items, days } = memoryStore();
  const fetched: string[] = [];
  const page = `<a href="20261031-5.htm">–– Katma Değer Vergisi Tebliği</a><a href="20261031-8.htm">–– Bazı Kanunlarda Değişiklik Yapılmasına Dair Kanun</a><a href="20261031-9.htm">–– Federasyon Statüsü</a><a href="20261031-6.pdf">–– Atama Kararı</a>`;
  const result = await runRegulationWatch({ ...baseInput, store, lookbackDays: 1, fetchHtml: async url => {
    fetched.push(url);
    if (url.endsWith("20261031.htm")) return page;
    return url.endsWith("-8.htm") ? "<p>Yıllara yaygın işlerde <b>tevkifat</b> oranı</p>" : "<p>spor kuralları</p>";
  } });
  const gazette = items.filter(item => item.source === "resmi_gazete");
  assert.deepEqual(gazette.map(item => [item.url.slice(-14), item.matchScope]), [["20261031-5.htm", "title"], ["20261031-8.htm", "body"]]);
  assert.deepEqual(gazetteDays(days), [{ source: "resmi_gazete", issueDate: "2026-10-31", status: "checked", matchedCount: 2, unreadCount: 1, errorCode: null }]);
  assert.ok(!fetched.some(url => url.endsWith(".pdf")), "PDFs go through the OCR reader");
  assert.ok(!fetched.some(url => url.endsWith("-5.htm")), "a title match needs no body request");
  assert.equal(result.failed, 0);
});

test("a failed fetch is recorded and does not stop the other days or GİB", async () => {
  const { store, days, items } = memoryStore();
  const result = await runRegulationWatch({ ...baseInput, store, lookbackDays: 2, fetchHtml: async url => {
    if (url.includes("20261031")) throw new Error("CRAWLER_TIMEOUT");
    if (url.endsWith("20261030.htm")) return '<a href="20261030-5.htm">–– Damga Vergisi Tebliği</a>';
    return "";
  } });
  assert.deepEqual(gazetteDays(days).map(day => [day.issueDate, day.status, day.errorCode]), [["2026-10-31", "failed", "CRAWLER_TIMEOUT"], ["2026-10-30", "checked", null]]);
  assert.ok(items.some(item => item.source === "gib"));
  assert.equal(result.failed, 1);
});

test("a page without any decision link counts as failed, because the layout may have changed", async () => {
  const { store, days } = memoryStore();
  await runRegulationWatch({ ...baseInput, store, lookbackDays: 1, fetchHtml: async () => "<html>bakım</html>" });
  assert.equal(gazetteDays(days)[0].errorCode, "GAZETTE_LAYOUT_UNRECOGNIZED");
});

test("a GİB failure is recorded separately and the Gazette result is kept", async () => {
  const { store, days } = memoryStore(["2026-10-31"]);
  const result = await runRegulationWatch({ ...baseInput, store, lookbackDays: 1, fetchHtml: async () => "", postJson: async () => { throw new Error("CRAWLER_TIMEOUT"); } });
  assert.deepEqual(days, [{ source: "gib", issueDate: "2026-10-31", status: "failed", matchedCount: 0, unreadCount: 0, errorCode: "CRAWLER_TIMEOUT" }]);
  assert.equal(result.failed, 1);
});

test("days already checked are not fetched again", async () => {
  const { store } = memoryStore(["2026-10-31"]);
  const requested: string[] = [];
  await runRegulationWatch({ ...baseInput, store, lookbackDays: 2, fetchHtml: async url => { requested.push(url); return '<a href="20261030-1.htm">–– Damga Vergisi</a>'; } });
  assert.deepEqual(requested, ["https://www.resmigazete.gov.tr/eskiler/2026/10/20261030.htm"]);
});

test("OCR reads pages one by one, stops at the page limit, and says so", async () => {
  const calls: string[] = [];
  const result = await ocrPdfText(Buffer.from("%PDF"), async (tool, args) => {
    calls.push(tool);
    if (tool === "pdfinfo") return "Title: x\nPages:          25\n";
    if (tool === "pdftoppm") {
      const { writeFile } = await import("node:fs/promises");
      await writeFile(`${args.at(-1)}-1.pgm`, "image");
      return "";
    }
    return "tevkifat ";
  });
  assert.equal(calls.filter(tool => tool === "tesseract").length, 20);
  assert.equal(result.truncated, true);
  assert.match(result.text, /tevkifat/);
});

test("an unreadable page count is an error instead of an empty document", () => {
  assert.equal(pageCountFromPdfInfo("Pages: 3"), 3);
  assert.throws(() => pageCountFromPdfInfo("bozuk"), /PDF_PAGE_COUNT_UNREADABLE/);
});

import assert from "node:assert/strict";
import test from "node:test";
import { gazetteIssueUrl, matchRegulationKeywords, parseGazetteIssue, recentIssueDates } from "./gazette";
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

function memoryStore(checked: string[] = []) {
  const items: Array<{ url: string; matchedKeywords: string[] }> = [];
  const days: Array<{ issueDate: string; status: string; matchedCount: number; errorCode: string | null }> = [];
  const store: RegulationWatchStore = {
    checkedDays: async () => checked,
    saveItems: async rows => { items.push(...rows); },
    saveDay: async day => { days.push(day); },
  };
  return { store, items, days };
}

test("a day stores only matching decisions and records that it was checked", async () => {
  const { store, items, days } = memoryStore();
  const result = await runRegulationWatch({ store, now: new Date("2026-10-31T12:00:00Z"), lookbackDays: 1, fetchHtml: async () => issue });
  assert.deepEqual(items.map(item => item.url), [
    "https://www.resmigazete.gov.tr/eskiler/2026/10/20261031-5.htm",
    "https://www.resmigazete.gov.tr/eskiler/2026/10/20261031M1-1.htm",
  ]);
  assert.deepEqual(days, [{ issueDate: "2026-10-31", status: "checked", matchedCount: 2, errorCode: null }]);
  assert.equal(result.failed, 0);
});

test("a failed fetch is recorded and does not stop the other days", async () => {
  const { store, days } = memoryStore();
  const result = await runRegulationWatch({
    store, now: new Date("2026-10-31T12:00:00Z"), lookbackDays: 2,
    fetchHtml: async url => { if (url.includes("20261031")) throw new Error("CRAWLER_TIMEOUT"); return issue.replaceAll("20261031", "20261030"); },
  });
  assert.deepEqual(days.map(day => [day.issueDate, day.status, day.errorCode]), [["2026-10-31", "failed", "CRAWLER_TIMEOUT"], ["2026-10-30", "checked", null]]);
  assert.equal(result.failed, 1);
});

test("a page without any decision link counts as failed, because the layout may have changed", async () => {
  const { store, days } = memoryStore();
  await runRegulationWatch({ store, now: new Date("2026-10-31T12:00:00Z"), lookbackDays: 1, fetchHtml: async () => "<html>bakım</html>" });
  assert.equal(days[0].status, "failed");
  assert.equal(days[0].errorCode, "GAZETTE_LAYOUT_UNRECOGNIZED");
});

test("days already checked are not fetched again", async () => {
  const { store } = memoryStore(["2026-10-31"]);
  const requested: string[] = [];
  await runRegulationWatch({ store, now: new Date("2026-10-31T12:00:00Z"), lookbackDays: 2, fetchHtml: async url => { requested.push(url); return issue; } });
  assert.deepEqual(requested, ["https://www.resmigazete.gov.tr/eskiler/2026/10/20261030.htm"]);
});

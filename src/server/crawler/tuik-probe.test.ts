import assert from "node:assert/strict";
import test from "node:test";
import { probeTuikDataflow, summarizeTuikCsv } from "./tuik-probe";

const KEY = "gizli-anahtar-degeri";

const csv = [
  "DATAFLOW,FREQ,UFE_URUN,TIME_PERIOD,OBS_VALUE,OBS_STATUS",
  "TR:DF_UFE_INSAAT_V1(1.0),M,GENEL,2026-08,1234.5,A",
  "TR:DF_UFE_INSAAT_V1(1.0),M,GENEL,2026-09,1250.25,A",
  "TR:DF_UFE_INSAAT_V1(1.0),M,MALZEME,2026-09,\"987,6\",A",
  "TR:DF_UFE_INSAAT_V1(1.0),M,MALZEME,2026-08,980.1,A",
].join("\r\n");

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

test("the summary names the dimensions and takes the newest value of each series", () => {
  const summary = summarizeTuikCsv(csv);
  assert.deepEqual(summary.dimensions.map(dimension => [dimension.id, dimension.valueCount]), [["FREQ", 1], ["UFE_URUN", 2]]);
  assert.deepEqual(summary.dimensions[1].sampleValues.map(value => value.id), ["GENEL", "MALZEME"]);
  assert.equal(summary.seriesCount, 2);
  assert.deepEqual(summary.sampleSeries[0], { key: "FREQ=M · UFE_URUN=GENEL", period: "2026-09", value: 1250.25 });
  // A quoted decimal comma is kept as text, not guessed at: no value is invented.
  assert.deepEqual(summary.sampleSeries[1], { key: "FREQ=M · UFE_URUN=MALZEME", period: "2026-09", value: null });
});

test("a large response is cut to a short sample", () => {
  const rows = ["DATAFLOW,SERI,TIME_PERIOD,OBS_VALUE", ...Array.from({ length: 300 }, (_, index) => `TR:X(1.0),K${index},2026-09,${index}`)];
  const summary = summarizeTuikCsv(rows.join("\n"));
  assert.equal(summary.seriesCount, 300);
  assert.equal(summary.sampleSeries.length, 12);
  assert.equal(summary.dimensions[0].sampleValues.length, 12);
  assert.equal(summary.dimensions[0].valueCount, 300);
});

test("a response that is not the expected csv is a coded error", () => {
  assert.throws(() => summarizeTuikCsv("<xml/>"), /TUIK_DATA_UNRECOGNIZED/);
  assert.throws(() => summarizeTuikCsv(""), /TUIK_DATA_UNRECOGNIZED/);
});

test("the probe asks as the documentation says: the format parameter and a start period, with the bearer token", async () => {
  const calls: Array<{ url: string; auth: string | null }> = [];
  const result = await probeTuikDataflow(KEY, "DF_UFE_INSAAT_V1", "1.0", async (url, init) => {
    calls.push({ url: String(url), auth: new Headers(init?.headers).get("authorization") });
    return String(url).includes("/token") ? jsonResponse({ access_token: "belirtec" }) : new Response(csv);
  }, new Date("2026-11-02T10:00:00Z"));
  assert.equal(result.status, "ok");
  assert.equal(calls[1].url, "https://nsiws.tuik.gov.tr/rest/data/TR,DF_UFE_INSAAT_V1,1.0?format=SDMX-CSV&startPeriod=2025");
  assert.equal(calls[1].auth, "Bearer belirtec");
  assert.doesNotMatch(JSON.stringify(result), new RegExp(`${KEY}|belirtec`));
});

test("identifiers that could change the request path are refused before any request", async () => {
  for (const [id, version] of [["../x", "1.0"], ["DF A", "1.0"], ["DF_X", "1/0"], ["", "1.0"]]) {
    const result = await probeTuikDataflow(KEY, id, version, async () => assert.fail("no request expected"));
    assert.deepEqual([result.status, result.errorCode], ["failed", "TUIK_INVALID_IDENTIFIER"]);
  }
});

test("a missing key and service failures are reported without the key", async () => {
  assert.equal((await probeTuikDataflow(" ", "DF_X", "1.0", async () => assert.fail("no request"))).status, "not_configured");
  const refused = await probeTuikDataflow(KEY, "DF_X", "1.0", async url => String(url).includes("/token") ? jsonResponse({ access_token: "t" }) : new Response("no", { status: 406 }));
  assert.equal(refused.errorCode, "TUIK_DATA_HTTP_406");
  const broken = await probeTuikDataflow(KEY, "DF_X", "1.0", async () => { throw new Error(`boom ${KEY}`); });
  assert.deepEqual([broken.status, broken.errorCode], ["failed", "TUIK_REQUEST_FAILED"]);
  assert.doesNotMatch(JSON.stringify(broken), new RegExp(KEY));
});

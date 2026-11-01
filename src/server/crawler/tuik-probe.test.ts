import assert from "node:assert/strict";
import test from "node:test";
import { probeTuikDataflow, summarizeTuikData } from "./tuik-probe";

const KEY = "gizli-anahtar-degeri";

const data = {
  data: {
    dataSets: [{ series: {
      "0:0": { observations: { "0": [1234.5] } },
      "1:0": { observations: { "0": [987.6] } },
    } }],
    structure: { dimensions: {
      series: [
        { id: "SERIES", name: "Seri", values: [{ id: "GENEL", name: "Genel" }, { id: "MALZEME", name: "Malzeme" }] },
        { id: "UNIT", name: "Birim", values: [{ id: "ENDEKS", name: "Endeks" }] },
      ],
      observation: [{ id: "TIME_PERIOD", name: "Dönem", values: [{ id: "2026-09", name: "2026-09" }] }],
    } },
  },
};

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

test("the summary lists dimensions and the latest value of each series", () => {
  const summary = summarizeTuikData(data);
  assert.deepEqual(summary.dimensions.map(dimension => [dimension.id, dimension.valueCount]), [["SERIES", 2], ["UNIT", 1]]);
  assert.equal(summary.seriesCount, 2);
  assert.deepEqual(summary.sampleSeries[0], { key: "SERIES=GENEL · UNIT=ENDEKS", period: "2026-09", value: 1234.5 });
  assert.equal(summary.sampleSeries[1].key, "SERIES=MALZEME · UNIT=ENDEKS");
});

test("a large response is cut to a short sample", () => {
  const series = Object.fromEntries(Array.from({ length: 300 }, (_, index) => [`${index}:0`, { observations: { "0": [index] } }]));
  const big = { data: { dataSets: [{ series }], structure: { dimensions: {
    series: [{ id: "S", values: Array.from({ length: 300 }, (_, index) => ({ id: `K${index}`, name: `Seri ${index}` })) }, { id: "U", values: [{ id: "E" }] }],
    observation: [{ id: "TIME_PERIOD", values: [{ id: "2026-09" }] }],
  } } } };
  const summary = summarizeTuikData(big);
  assert.equal(summary.seriesCount, 300);
  assert.equal(summary.sampleSeries.length, 12);
  assert.equal(summary.dimensions[0].sampleValues.length, 12);
});

test("an unrecognised payload is a coded error", () => {
  assert.throws(() => summarizeTuikData({}), /TUIK_DATA_UNRECOGNIZED/);
});

test("the probe asks for the last observation only, with the bearer token, and never exposes the key", async () => {
  const calls: Array<{ url: string; accept: string | null; auth: string | null }> = [];
  const result = await probeTuikDataflow(KEY, "DF_UFE_INSAAT_V1", "1.0", async (url, init) => {
    const headers = new Headers(init?.headers);
    calls.push({ url: String(url), accept: headers.get("accept"), auth: headers.get("authorization") });
    return String(url).includes("/token") ? jsonResponse({ access_token: "belirtec" }) : jsonResponse(data);
  });
  assert.equal(result.status, "ok");
  assert.equal(calls[1].url, "https://nsiws.tuik.gov.tr/rest/data/TR,DF_UFE_INSAAT_V1,1.0/all?lastNObservations=1");
  assert.match(calls[1].accept ?? "", /sdmx\.data\+json/);
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
  const forbidden = await probeTuikDataflow(KEY, "DF_X", "1.0", async url => String(url).includes("/token") ? jsonResponse({ access_token: "t" }) : new Response("no", { status: 403 }));
  assert.equal(forbidden.errorCode, "TUIK_DATA_HTTP_403");
  const broken = await probeTuikDataflow(KEY, "DF_X", "1.0", async () => { throw new Error(`boom ${KEY}`); });
  assert.deepEqual([broken.status, broken.errorCode], ["failed", "TUIK_REQUEST_FAILED"]);
  assert.doesNotMatch(JSON.stringify(broken), new RegExp(KEY));
});

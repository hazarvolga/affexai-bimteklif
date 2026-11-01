import assert from "node:assert/strict";
import test from "node:test";
import { checkTuikConnection, parseTuikDataflows, requestTuikToken } from "./tuik-connection";

const KEY = "gizli-anahtar-degeri";

const structure = `<mes:Structure xmlns:mes="m" xmlns:str="s" xmlns:com="c"><mes:Structures><str:Dataflows>
<str:Dataflow id="DF_YI_UFE" agencyID="TR" version="1.2"><com:Name xml:lang="en">Domestic PPI</com:Name><com:Name xml:lang="tr">Yurt İçi Üretici Fiyat Endeksi</com:Name></str:Dataflow>
<str:Dataflow id="DF_TUFE" agencyID="TR" version="2.0"><com:Name xml:lang="tr">Tüketici Fiyat Endeksi</com:Name></str:Dataflow>
<str:Dataflow id="DF_INSAAT_MALIYET" agencyID="TR" version="1.0"><com:Name xml:lang="tr">İnşaat Maliyet Endeksi</com:Name></str:Dataflow>
<str:Dataflow id="DF_EMISYON" agencyID="TR" version="1.1"><com:Name xml:lang="tr">Sera Gazı Emisyonu</com:Name></str:Dataflow>
</str:Dataflows></mes:Structures></mes:Structure>`;

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

test("the token request sends the API key as the service documents, and returns only the token", async () => {
  let sent = "";
  const token = await requestTuikToken(KEY, async (_url, init) => {
    sent = String(init?.body);
    return jsonResponse({ access_token: "belirtec" });
  });
  assert.equal(token, "belirtec");
  const form = new URLSearchParams(sent);
  assert.deepEqual([form.get("grant_type"), form.get("client_id"), form.get("api_key")], ["password", "nsi-ws-consumer", KEY]);
});

test("a rejected key is a coded failure", async () => {
  await assert.rejects(requestTuikToken(KEY, async () => jsonResponse({ error: "invalid_grant" }, 401)), /TUIK_TOKEN_REJECTED/);
  await assert.rejects(requestTuikToken(KEY, async () => jsonResponse({})), /TUIK_TOKEN_MISSING/);
});

test("dataflows keep their real ids and versions, and the Turkish name when there is one", () => {
  assert.deepEqual(parseTuikDataflows(structure)[0], { id: "DF_YI_UFE", agencyId: "TR", version: "1.2", name: "Yurt İçi Üretici Fiyat Endeksi" });
});

test("the check reports index dataflows and never exposes the key or token", async () => {
  const calls: string[] = [];
  const result = await checkTuikConnection(KEY, async (url, init) => {
    calls.push(String(url));
    if (String(url).includes("/token")) return jsonResponse({ access_token: "belirtec" });
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer belirtec");
    return new Response(structure);
  });
  assert.equal(result.status, "connected");
  assert.equal(result.totalDataflows, 4);
  assert.deepEqual(result.indexDataflows.map(flow => flow.id), ["DF_YI_UFE", "DF_TUFE", "DF_INSAAT_MALIYET"]);
  assert.ok(calls[1].startsWith("https://nsiws.tuik.gov.tr/rest/dataflow/TR/all/latest"));
  assert.doesNotMatch(JSON.stringify(result), new RegExp(`${KEY}|belirtec`));
});

test("a missing key says so without calling the service", async () => {
  const result = await checkTuikConnection("  ", async () => assert.fail("no request expected"));
  assert.deepEqual(result, { status: "not_configured", totalDataflows: 0, indexDataflows: [] });
});

test("failures keep their stage and never carry the key", async () => {
  const tokenFailure = await checkTuikConnection(KEY, async () => { throw new Error(`boom ${KEY}`); });
  assert.deepEqual(tokenFailure, { status: "failed", errorCode: "TUIK_REQUEST_FAILED", totalDataflows: 0, indexDataflows: [] });
  const listFailure = await checkTuikConnection(KEY, async url => String(url).includes("/token") ? jsonResponse({ access_token: "t" }) : new Response("no", { status: 403 }));
  assert.equal(listFailure.errorCode, "TUIK_DATAFLOWS_HTTP_403");
  const emptyList = await checkTuikConnection(KEY, async url => String(url).includes("/token") ? jsonResponse({ access_token: "t" }) : new Response("<a/>"));
  assert.equal(emptyList.errorCode, "TUIK_DATAFLOWS_UNRECOGNIZED");
});

import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { S3Client } from "@aws-sdk/client-s3";
import { S3StorageAdapter, uploadUrlExpirySeconds } from "./storage";

test("S3 Presigned URL - Content-Length and Expiry (P1-4)", async (t) => {
  await t.test("uploadUrlExpirySeconds defaults to 24 hours (86400s) and respects env", () => {
    assert.equal(uploadUrlExpirySeconds({}), 86400);
    assert.equal(uploadUrlExpirySeconds({ IFC_UPLOAD_URL_EXPIRY_SECONDS: "3600" }), 3600);
    assert.equal(uploadUrlExpirySeconds({ SMARTCHECK_UPLOAD_URL_EXPIRY_SECONDS: "7200" }), 7200);
    for (const invalid of ["invalid", "-50", "0", "86401", "1.5"]) {
      assert.throws(() => uploadUrlExpirySeconds({ IFC_UPLOAD_URL_EXPIRY_SECONDS: invalid }), /UPLOAD_URL_EXPIRY_INVALID/);
    }
  });

  await t.test("S3StorageAdapter.createUploadTarget signs Content-Length and sets 24h expiry", async () => {
    const s3 = new S3Client({
      region: "eu-central-1",
      credentials: { accessKeyId: "mock-key", secretAccessKey: "mock-secret" },
    });
    const adapter = new S3StorageAdapter({ bucket: "test-ifc-bucket", client: s3 });

    const target = await adapter.createUploadTarget("tenant/models/project.ifc", "model/ifc", {
      contentLength: 52428800, // 50 MB
    });

    assert.equal(target.method, "PUT");
    assert.equal(target.headers?.["content-type"], "model/ifc");
    assert.equal(target.headers?.["content-length"], "52428800");

    const parsedUrl = new URL(target.uploadUrl);
    // Expiry default 86400s (24h)
    assert.equal(parsedUrl.searchParams.get("X-Amz-Expires"), "86400");
    // SignedHeaders MUST include content-length, content-type, and host
    const signedHeaders = parsedUrl.searchParams.get("X-Amz-SignedHeaders") || "";
    assert.ok(signedHeaders.includes("content-length"), `SignedHeaders (${signedHeaders}) must include content-length`);
    assert.ok(signedHeaders.includes("content-type"), `SignedHeaders (${signedHeaders}) must include content-type`);
    assert.ok(signedHeaders.includes("host"), `SignedHeaders (${signedHeaders}) must include host`);
  });

  await t.test("S3 Mock server enforces URL expiration and signed Content-Length", async () => {
    // S3-compatible mock server that simulates AWS SigV4 expiration and signed-headers checks
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "", `http://${req.headers.host}`);
      const amzDateStr = url.searchParams.get("X-Amz-Date"); // e.g. 20261011T052220Z
      const amzExpires = parseInt(url.searchParams.get("X-Amz-Expires") || "0", 10);
      const signedHeaders = (url.searchParams.get("X-Amz-SignedHeaders") || "").split(";");

      if (amzDateStr && amzExpires) {
        const year = parseInt(amzDateStr.slice(0, 4), 10);
        const month = parseInt(amzDateStr.slice(4, 6), 10) - 1;
        const day = parseInt(amzDateStr.slice(6, 8), 10);
        const hour = parseInt(amzDateStr.slice(9, 11), 10);
        const min = parseInt(amzDateStr.slice(11, 13), 10);
        const sec = parseInt(amzDateStr.slice(13, 15), 10);
        const requestTime = Date.UTC(year, month, day, hour, min, sec);

        // Check if expired (simulated via query override for testing)
        const simulateExpired = url.searchParams.get("simulate_expired") === "true";
        if (simulateExpired || Date.now() > requestTime + amzExpires * 1000) {
          res.writeHead(403, { "Content-Type": "application/xml" });
          res.end("<Error><Code>AccessDenied</Code><Message>Request has expired</Message></Error>");
          return;
        }
      }

      // If content-length was signed, the incoming Content-Length must match the signed expectation
      if (signedHeaders.includes("content-length")) {
        const expectedLength = url.searchParams.get("expected_length");
        const actualLength = req.headers["content-length"];
        if (expectedLength && actualLength !== expectedLength) {
          res.writeHead(403, { "Content-Type": "application/xml" });
          res.end("<Error><Code>SignatureDoesNotMatch</Code><Message>The request signature we calculated does not match</Message></Error>");
          return;
        }
      }

      res.writeHead(200);
      res.end();
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    t.after(() => new Promise<void>((resolve) => { server.close(() => resolve()); server.closeAllConnections(); }));

    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const endpoint = `http://127.0.0.1:${address.port}`;

    const s3 = new S3Client({
      region: "us-east-1",
      endpoint,
      forcePathStyle: true,
      credentials: { accessKeyId: "mock-key", secretAccessKey: "mock-secret" },
    });

    const adapter = new S3StorageAdapter({ bucket: "mock-bucket", client: s3 });
    const signedTarget = await adapter.createUploadTarget("test.ifc", "model/ifc", {
      contentLength: 1024,
      expiresInSeconds: 86400,
    });

    // 1. Valid upload with exact Content-Length succeeds (200)
    const validUrl = `${signedTarget.uploadUrl}&expected_length=1024`;
    const resValid = await fetch(validUrl, {
      method: "PUT",
      headers: signedTarget.headers,
      body: Buffer.alloc(1024, "a"),
    });
    assert.equal(resValid.status, 200);

    // 2. Oversized or mismatched Content-Length is rejected (403 SignatureDoesNotMatch)
    const resMismatched = await fetch(validUrl, {
      method: "PUT",
      headers: {
        "content-type": "model/ifc",
        "content-length": "2048",
      },
      body: Buffer.alloc(2048, "b"),
    });
    assert.equal(resMismatched.status, 403);
    const mismatchedBody = await resMismatched.text();
    assert.ok(mismatchedBody.includes("SignatureDoesNotMatch"));

    // 3. Expired URL is rejected (403 Request has expired)
    const expiredUrl = `${signedTarget.uploadUrl}&simulate_expired=true`;
    const resExpired = await fetch(expiredUrl, {
      method: "PUT",
      headers: signedTarget.headers,
      body: Buffer.alloc(1024, "a"),
    });
    assert.equal(resExpired.status, 403);
    const expiredBody = await resExpired.text();
    assert.ok(expiredBody.includes("Request has expired"));
  });
});

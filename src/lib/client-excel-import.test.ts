/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  buildClientCsvTemplate,
  exportClientsToCsv,
  inferClientType,
  normalizeImportedClientStage,
  parseClientCsv,
  parseClientRows,
  parseClientXlsx,
} from "./client-excel-import";
import { buildClientXlsxTemplate, exportClientsToXlsx } from "./client-xlsx";
import {
  appendClientStageNote,
  formatClientNotesForExport,
  parseClientNotes,
} from "./client-notes";

test("aşama etiketli müşteri notları eski düz metinleri korur ve 6 aşamayı doğru ayrıştırır", () => {
  const legacy = "İlk şantiye ziyareti yapıldı, mimari paftalar beklenecek.";
  const notesFromLegacy = parseClientNotes(legacy, "contacted", "2026-10-20T10:00:00.000Z");
  assert.equal(notesFromLegacy.length, 1);
  assert.equal(notesFromLegacy[0].stage, "contacted");
  assert.equal(notesFromLegacy[0].content, legacy);

  const updatedRaw = appendClientStageNote(
    legacy,
    {
      stage: "quotation_sent",
      content: "Kaba yapı teklifi (14.2M TL) e-posta ile iletildi.",
      author: "Hazar Volga Ekiz",
      createdAt: "2026-10-27T12:00:00.000Z",
    },
    "contacted",
  );

  const parsed = parseClientNotes(updatedRaw, "quotation_sent");
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].stage, "quotation_sent");
  assert.equal(parsed[0].author, "Hazar Volga Ekiz");
  assert.match(parsed[0].content, /14\.2M TL/);
  assert.equal(parsed[1].stage, "contacted");

  const exported = formatClientNotesForExport(updatedRaw, "quotation_sent");
  assert.match(exported, /\[Teklifli/);
  assert.match(exported, /\[Görüşüldü/);
});

test("Katman 1: Müteahhit antetli farklı sütun başlıklı listeyi, serbest aşamaları ve şirket/bireysel tipini tanır", () => {
  const rows = [
    ["ALUPLAN YAPI MÜHENDİSLİK — 2026 ADAY İŞVEREN LİSTESİ", null, null, null, null, null],
    ["Tarih: 27.10.2026", null, null, null, null, null],
    [null, null, null, null, null, null],
    ["Cari Ünvan", "GSM", "E-Mail", "Şantiye Adresi", "Durum", "Proje Adı", "Vergi No"],
    [
      "Aras Yapı Denetim Ltd. Şti.",
      "0532 111 22 33",
      "info@arasyapi.com.tr",
      "Çankaya / Ankara",
      "Arandı / Toplantı Yapıldı",
      "Çankaya Konutları",
      "1234567890",
    ],
    [
      "Ahmet Yılmaz",
      "+90 542 999 88 77",
      "ahmet@yilmaz.com",
      "Urla / İzmir",
      "Teklif Verildi",
      "Urla Taş Villa",
      "",
    ],
    [
      "Kuzeyboru İnşaat A.Ş.",
      "0212 444 00 11",
      "ihale@kuzeyboru.com",
      "Maslak / İstanbul",
      "Sözleşme İmzalandı",
      "Lojistik Merkez",
      "9876543210",
    ],
  ];

  const result = parseClientRows(rows, "aday_isverenler.xlsx");
  assert.equal(result.errors.length, 0);
  assert.equal(result.totalImported, 3);
  assert.equal(result.detectedMapping.headerRowIndex, 3);

  const [c1, c2, c3] = result.clients;
  assert.equal(c1.name, "Aras Yapı Denetim Ltd. Şti.");
  assert.equal(c1.type, "company");
  assert.equal(c1.pipelineStage, "contacted");
  assert.equal(c1.email, "info@arasyapi.com.tr");
  assert.equal(c1.phone, "0532 111 22 33");
  assert.match(c1.notes ?? "", /Proje Adı: Çankaya Konutları/);
  assert.match(c1.notes ?? "", /Vergi No: 1234567890/);

  assert.equal(c2.name, "Ahmet Yılmaz");
  assert.equal(c2.type, "person");
  assert.equal(c2.pipelineStage, "quotation_sent");

  assert.equal(c3.name, "Kuzeyboru İnşaat A.Ş.");
  assert.equal(c3.type, "company");
  assert.equal(c3.pipelineStage, "won");
});

test("Katman 1 & 2: Ayrı Ad + Soyad + Firma sütunlarını birleştirir ve başlıksız e-posta/telefon sütunlarını içerikten yakalar", () => {
  const rows = [
    ["Ad", "Soyad", "Firma", "Bilgi 1", "Bilgi 2", "Aşama"],
    ["Selim", "Kaya", "Kaya Mimarlık Mühendislik Ltd.", "selim@kayamimarlik.com", "0533 444 55 66", "Pazarlık aşamasında"],
    ["Zeynep", "Demir", "", "zeynep.demir@ornek.org", "0544 777 88 99", "İptal edildi"],
  ];

  const res = parseClientRows(rows, "rehber.csv");
  assert.equal(res.totalImported, 2);
  assert.equal(res.clients[0].name, "Kaya Mimarlık Mühendislik Ltd.");
  assert.equal(res.clients[0].type, "company");
  assert.equal(res.clients[0].email, "selim@kayamimarlik.com");
  assert.equal(res.clients[0].phone, "0533 444 55 66");
  assert.equal(res.clients[0].pipelineStage, "negotiation");
  assert.match(res.clients[0].notes ?? "", /İlgili Kişi: Selim Kaya/);

  assert.equal(res.clients[1].name, "Zeynep Demir");
  assert.equal(res.clients[1].type, "person");
  assert.equal(res.clients[1].pipelineStage, "lost");
});

test("Katman 3: Kullanıcı sütun eşleştirmesini override ettiğinde yeni sütunları okur ve XLSX/CSV şablon döngüsü çalışır", async () => {
  const csvTemplate = buildClientCsvTemplate();
  const csvParsed = parseClientCsv(csvTemplate, "sablon.csv");
  assert.equal(csvParsed.totalImported, 3);
  assert.equal(csvParsed.clients[0].pipelineStage, "contacted");
  assert.equal(csvParsed.clients[1].pipelineStage, "quotation_sent");
  assert.equal(csvParsed.clients[2].pipelineStage, "lead");

  const xlsxBytes = await buildClientXlsxTemplate();
  const xlsxParsed = await parseClientXlsx(xlsxBytes, "musteri_sablon.xlsx");
  assert.equal(xlsxParsed.errors.length, 0);
  assert.equal(xlsxParsed.totalImported, 2);

  const exportedCsv = exportClientsToCsv(xlsxParsed.clients);
  assert.match(exportedCsv, /Aras Yapı Denetim/);

  const exportedXlsx = await exportClientsToXlsx(xlsxParsed.clients);
  assert.ok(exportedXlsx.byteLength > 1000);

  assert.equal(normalizeImportedClientStage("Görüşüldü"), "contacted");
  assert.equal(normalizeImportedClientStage("Teklif Hazır"), "quotation_sent");
  assert.equal(inferClientType("Büyükşehir Belediyesi Fen İşleri Müdürlüğü"), "company");
  assert.equal(inferClientType("Mehmet Akif"), "person");

  // Güvenlik (CWE-1236): XLSX dışa aktarımında formül enjeksiyonu nötralizasyonu
  const formulaXlsx = await exportClientsToXlsx([
    {
      name: "=CMD|' /C calc'!A0",
      type: "company",
      email: "+attacker@example.com",
      phone: "-905320000000",
      address: "@SUM(1+1)",
      pipelineStage: "lead",
      notes: "=HYPERLINK(\"http://evil.example\")",
    },
  ]);
  const reimported = await parseClientXlsx(formulaXlsx, "exported_safe.xlsx");
  assert.equal(reimported.clients.length, 1);
  assert.ok(reimported.clients[0].name.startsWith("'="));
  assert.ok((reimported.clients[0].email ?? "").startsWith("'+"));
  assert.ok((reimported.clients[0].address ?? "").startsWith("'@"));
});

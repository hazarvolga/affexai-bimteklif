/**
 * İndirilebilir Excel (.xlsx) şablonları (Faz 1, C-1/C-3). Kullanıcı Excel'den gelir: veri sayfası boş başlar,
 * açıklama ve örnekler ayrı sayfadadır; böylece örnek satırlar yanlışlıkla teklife veya kataloğa aktarılmaz.
 * Başlıklar içe aktarma okuyucularının (quote-excel-import, price-catalog-import) tanıdığı adlarla yazılır.
 * ExcelJS yalnız şablon istendiğinde dinamik yüklenir.
 */

export const QUOTE_SHEET = "Teklif Kalemleri";
export const PRICE_CATALOG_SHEET = "Fiyat Kataloğu";
export const PARCEL_SHEET = "Parseller";

/** Same units the quote importer recognises (quote-excel-import KNOWN_UNITS), in the spelling users expect. */
const UNIT_OPTIONS = ["m²", "m³", "mt", "ton", "kg", "adet", "set", "takım", "gün", "ay", "saat", "lt", "paket", "torba", "sefer"];
const DATA_ROWS = 500;

const HEADER_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } } as const;
const HEADER_FONT = { bold: true, color: { argb: "FFFFFFFF" } } as const;
const NUMBER_FORMAT = "#,##0.00";
const PERCENT_NUMBER_FORMAT = "0";

interface ColumnSpec {
  header: string;
  width: number;
  numFmt?: string;
  units?: boolean;
  /** Excel cell validation hint shown when the cell is selected. */
  prompt?: string;
}

type Workbook = import("exceljs").Workbook;
type Worksheet = import("exceljs").Worksheet;

function addDataSheet(workbook: Workbook, name: string, columns: readonly ColumnSpec[]): Worksheet {
  const sheet = workbook.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = columns.map((column) => ({ header: column.header, width: column.width }));
  const header = sheet.getRow(1);
  header.font = HEADER_FONT;
  header.fill = HEADER_FILL;
  header.alignment = { vertical: "middle", wrapText: true };
  header.height = 30;
  columns.forEach((column, index) => {
    const letter = sheet.getColumn(index + 1).letter;
    for (let row = 2; row <= DATA_ROWS + 1; row += 1) {
      const cell = sheet.getCell(`${letter}${row}`);
      if (column.numFmt) cell.numFmt = column.numFmt;
      if (column.units) {
        cell.dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [`"${UNIT_OPTIONS.join(",")}"`],
          showErrorMessage: false,
          showInputMessage: Boolean(column.prompt),
          promptTitle: column.header,
          prompt: column.prompt,
        };
      } else if (column.prompt) {
        // A formula that is always true: Excel shows the hint but never rejects input.
        cell.dataValidation = { type: "custom", allowBlank: true, formulae: ["TRUE"], showErrorMessage: false, showInputMessage: true, promptTitle: column.header, prompt: column.prompt };
      }
    }
  });
  return sheet;
}

function addTextSheet(workbook: Workbook, name: string, lines: readonly string[]): void {
  const sheet = workbook.addWorksheet(name);
  sheet.getColumn(1).width = 110;
  lines.forEach((line, index) => {
    const cell = sheet.getCell(index + 1, 1);
    cell.value = line;
    cell.alignment = { wrapText: true, vertical: "top" };
    if (index === 0) cell.font = { bold: true, size: 14 };
  });
}

function addExampleSheet(workbook: Workbook, name: string, header: readonly string[], rows: readonly (string | number)[][]): void {
  const sheet = workbook.addWorksheet(name);
  sheet.addRow(["Bu sayfa yalnız örnektir ve içe aktarılmaz. Kendi kalemlerinizi ilk sayfaya yazın."]).font = { italic: true };
  const headerRow = sheet.addRow([...header]);
  headerRow.font = { bold: true };
  rows.forEach((row) => sheet.addRow([...row]));
  header.forEach((_, index) => { sheet.getColumn(index + 1).width = index === 1 ? 46 : 16; });
}

async function toBytes(workbook: Workbook): Promise<Uint8Array> {
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}

async function newWorkbook(): Promise<Workbook> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "BIMMetraj";
  workbook.created = new Date();
  return workbook;
}

export async function buildQuoteXlsxTemplate(): Promise<Uint8Array> {
  const workbook = await newWorkbook();
  const columns: ColumnSpec[] = [
    { header: "Poz No", width: 16, prompt: "İsteğe bağlı. ÇŞB veya firma poz numarası." },
    { header: "İş Kalemi Açıklaması", width: 48, prompt: "Zorunlu. Kalemin adı." },
    { header: "Birim", width: 10, units: true, prompt: "Listeden seçin veya yazın." },
    { header: "Miktar", width: 14, numFmt: NUMBER_FORMAT, prompt: "Zorunlu. Sayı olarak yazın (örn. 412,5)." },
    { header: "Birim Fiyat (TL)", width: 18, numFmt: NUMBER_FORMAT, prompt: "İsteğe bağlı. KDV hariç birim fiyat." },
    { header: "KDV (%)", width: 10, numFmt: PERCENT_NUMBER_FORMAT, prompt: "Örn. 20. Boş bırakılırsa teklif ekranında ayarlanır." },
    { header: "İskonto (%)", width: 12, numFmt: PERCENT_NUMBER_FORMAT, prompt: "İsteğe bağlı." },
  ];
  addDataSheet(workbook, QUOTE_SHEET, columns);
  addTextSheet(workbook, "Nasıl Doldurulur", [
    "BIMMetraj teklif şablonu — nasıl doldurulur?",
    "1. Kalemlerinizi \"Teklif Kalemleri\" sayfasına, ilk satırdaki başlıkların altına yazın. Başlıkları değiştirmeyin.",
    "2. Zorunlu sütunlar: İş Kalemi Açıklaması ve Miktar. Poz No, Birim Fiyat, KDV ve İskonto isteğe bağlıdır.",
    "3. Sayıları Excel'in sayı biçiminde ya da Türkçe yazımla (1.250,50) girebilirsiniz.",
    "4. Birim sütununda listeden seçim yapabilirsiniz (m², m³, mt, ton, kg, adet …).",
    "5. Dosyayı .xlsx olarak kaydedip BIMMetraj'da Yeni Teklif → \"Excel'den aktar\" ile yükleyin.",
    "6. Aktarılan fiyatlar teklif ekranında kaynağıyla birlikte incelenir; dosyadaki fiyat otomatik onaylanmış sayılmaz.",
    "\"Örnek\" sayfası yalnız gösterim içindir ve içe aktarılmaz.",
  ]);
  addExampleSheet(workbook, "Örnek", columns.map((column) => column.header), [
    ["15.150.1006", "C30/37 hazır beton dökülmesi", "m³", 412.5, 3450, 20, 0],
    ["", "Plywood kalıp yapılması", "m²", 1860, 650, 20, 0],
    ["", "İç cephe alçı sıva", "m²", 2240, 185, 20, 0],
  ]);
  return toBytes(workbook);
}

export async function buildPriceCatalogXlsxTemplate(): Promise<Uint8Array> {
  const workbook = await newWorkbook();
  const columns: ColumnSpec[] = [
    { header: "Poz No", width: 16, prompt: "İsteğe bağlı." },
    { header: "Açıklama", width: 46, prompt: "Zorunlu." },
    { header: "Birim", width: 10, units: true, prompt: "Zorunlu. Listeden seçin veya yazın." },
    { header: "Birim Fiyat", width: 16, numFmt: NUMBER_FORMAT, prompt: "Zorunlu. KDV hariç, sıfırdan büyük." },
    { header: "Para Birimi", width: 12, prompt: "TRY, USD veya EUR. Boşsa TRY." },
    { header: "Geçerlilik Tarihi", width: 16, prompt: "İsteğe bağlı. YYYY-AA-GG (örn. 2026-12-31)." },
    { header: "Referans", width: 20, prompt: "İsteğe bağlı. Fatura, teklif veya belge numarası." },
  ];
  addDataSheet(workbook, PRICE_CATALOG_SHEET, columns);
  addTextSheet(workbook, "Nasıl Doldurulur", [
    "BIMMetraj firma fiyat kataloğu şablonu — nasıl doldurulur?",
    "1. Firmanızın kendi gerçekleşen fiyatlarını \"Fiyat Kataloğu\" sayfasına yazın. Başlıkları değiştirmeyin.",
    "2. Zorunlu sütunlar: Açıklama, Birim ve Birim Fiyat (sıfırdan büyük).",
    "3. Tedarikçi teklifleri bu şablonla değil, Tedarikçi & Piyasa ekranından ayrı incelemeyle eklenir.",
    "4. İçe aktarılan fiyatlar öneri niteliğindedir; kaleme bağlama kararı mühendiste kalır.",
    "\"Örnek\" sayfası yalnız gösterim içindir ve içe aktarılmaz.",
  ]);
  addExampleSheet(workbook, "Örnek", columns.map((column) => column.header), [
    ["15.150.1006", "C30/37 hazır beton", "m³", 3450, "TRY", "2026-12-31", "Fatura 2026/118"],
    ["", "Nervürlü donatı çeliği Ø12", "ton", 42000, "TRY", "2026-11-30", ""],
  ]);
  return toBytes(workbook);
}

/**
 * Parsel şablonu: okuyucu ilk sayfanın ilk satırını başlık sayar, bu yüzden veri sayfası ilk sıradadır.
 * Örnek satır YOK: şablon uydurma imar değeri taşımaz (pre-bim-feasibility ile aynı ilke).
 */
export async function buildParcelXlsxTemplate(): Promise<Uint8Array> {
  const { PARCEL_CSV_HEADER } = await import("./pre-bim-feasibility");
  const workbook = await newWorkbook();
  addDataSheet(workbook, PARCEL_SHEET, PARCEL_CSV_HEADER.map((header) => ({ header, width: header.endsWith("_kaynak") ? 28 : 16 })));
  addTextSheet(workbook, "Nasıl Doldurulur", [
    "BIMMetraj parsel şablonu — nasıl doldurulur?",
    "Her parsel bir satırdır. Başlıkları değiştirmeyin; boş bıraktığınız değer hesaplamada varsayılmaz.",
    "parsel_adi: parselin adı · alan_m2: parsel alanı · taks / kaks: imar durumundaki oranlar.",
    "emsale_dahil_m2 / sinirli_muaf_m2 / tam_muaf_m2: ilgili alanlar; her biri için _kaynak sütununa dayanağı (plan notu, madde) yazın.",
    "yerel_plan_kaynak, yerel_plan_tarih, yerel_plan_sinirli_muaf_orani: varsa yerel plan bilgisi.",
    "Dosyayı .xlsx olarak kaydedip Arsa & Ön Fizibilite ekranında \"Excel / CSV'den içe aktar\" ile yükleyin.",
  ]);
  return toBytes(workbook);
}

/** Triggers a browser download for generated workbook bytes. */
export function downloadXlsx(bytes: Uint8Array, fileName: string): void {
  const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

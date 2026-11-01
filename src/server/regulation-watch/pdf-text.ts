import { execFile } from "node:child_process";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fetchCrawlerBytes } from "../crawler/safe-fetch";

const run = promisify(execFile);
const MAX_PDF_BYTES = 30 * 1024 * 1024;
const MAX_OCR_PAGES = 20;
const PAGE_TIMEOUT_MS = 60_000;
const OCR_DPI = "150";
const MAX_TOOL_OUTPUT_BYTES = 4 * 1024 * 1024;

export interface PdfText { text: string; truncated: boolean }

export type ToolRunner = (tool: string, args: string[]) => Promise<string>;

const runTool: ToolRunner = async (tool, args) => {
  const { stdout } = await run(tool, args, {
    timeout: PAGE_TIMEOUT_MS,
    maxBuffer: MAX_TOOL_OUTPUT_BYTES,
    env: { PATH: process.env.PATH ?? "/usr/bin:/bin", OMP_THREAD_LIMIT: "1" },
  });
  return stdout;
};

export function pageCountFromPdfInfo(output: string): number {
  const pages = Number(output.match(/^Pages:\s*(\d+)/m)?.[1]);
  if (!Number.isSafeInteger(pages) || pages < 1) throw new Error("PDF_PAGE_COUNT_UNREADABLE");
  return pages;
}

/** Gazette PDFs are scanned images, so their text exists only through OCR. One page at a time keeps memory flat. */
export async function ocrPdfText(pdf: Buffer, tool: ToolRunner = runTool): Promise<PdfText> {
  const dir = await mkdtemp(path.join(tmpdir(), "regulation-pdf-"));
  try {
    const file = path.join(dir, "input.pdf");
    await writeFile(file, pdf);
    const pages = pageCountFromPdfInfo(await tool("pdfinfo", [file]));
    const lastPage = Math.min(pages, MAX_OCR_PAGES);
    const parts: string[] = [];
    for (let page = 1; page <= lastPage; page += 1) {
      const prefix = path.join(dir, `page-${page}`);
      await tool("pdftoppm", ["-r", OCR_DPI, "-gray", "-f", String(page), "-l", String(page), file, prefix]);
      for (const name of (await readdir(dir)).filter(entry => entry.startsWith(`page-${page}`))) {
        const image = path.join(dir, name);
        parts.push(await tool("tesseract", [image, "-", "-l", "tur"]));
        await rm(image, { force: true });
      }
    }
    return { text: parts.join("\n"), truncated: pages > MAX_OCR_PAGES };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function readGazettePdfText(url: string): Promise<PdfText> {
  return ocrPdfText(await fetchCrawlerBytes(url, MAX_PDF_BYTES));
}

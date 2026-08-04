/*
 * Spreadsheet reader for the product importer.
 *
 * Everything runs in the browser: the app is local-first and there is no
 * upload endpoint to hand a file to. XLSX is a zip of XML parts, so the zip
 * directory is walked by hand and DEFLATE is handed to the platform's
 * DecompressionStream — that keeps the bundle free of a spreadsheet library
 * for what is, in the end, two XML files.
 *
 * Also accepts the HTML-table ".xls" this app exports (see lib/export.ts) and
 * plain CSV, because a till operator will export, edit, and re-import.
 */

const ZIP_END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const ZIP_CENTRAL_FILE_HEADER = 0x02014b50;
const ZIP_STORED = 0;
const ZIP_DEFLATED = 8;

interface ZipEntry {
  name: string;
  compressionMethod: number;
  compressedSize: number;
  localHeaderOffset: number;
}

function findEndOfCentralDirectory(view: DataView): number {
  /* The record is at the tail, after a comment of up to 64 KB. */
  const earliest = Math.max(0, view.byteLength - 0xffff - 22);
  for (let offset = view.byteLength - 22; offset >= earliest; offset -= 1) {
    if (view.getUint32(offset, true) === ZIP_END_OF_CENTRAL_DIRECTORY) {
      return offset;
    }
  }
  return -1;
}

function readZipEntries(buffer: ArrayBuffer): ZipEntry[] {
  const view = new DataView(buffer);
  const end = findEndOfCentralDirectory(view);
  if (end < 0) throw new Error("Not a valid XLSX file");

  const entryCount = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true);
  const decoder = new TextDecoder();
  const entries: ZipEntry[] = [];

  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(offset, true) !== ZIP_CENTRAL_FILE_HEADER) break;

    const compressionMethod = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localHeaderOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(
      new Uint8Array(buffer, offset + 46, nameLength),
    );

    entries.push({ name, compressionMethod, compressedSize, localHeaderOffset });
    offset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("This browser cannot read compressed XLSX files");
  }
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readZipEntry(
  buffer: ArrayBuffer,
  entry: ZipEntry,
): Promise<string> {
  const view = new DataView(buffer);
  const nameLength = view.getUint16(entry.localHeaderOffset + 26, true);
  const extraLength = view.getUint16(entry.localHeaderOffset + 28, true);
  const start = entry.localHeaderOffset + 30 + nameLength + extraLength;
  const raw = new Uint8Array(buffer, start, entry.compressedSize);

  if (entry.compressionMethod === ZIP_STORED) {
    return new TextDecoder().decode(raw);
  }
  if (entry.compressionMethod === ZIP_DEFLATED) {
    return new TextDecoder().decode(await inflate(raw));
  }
  throw new Error(`Unsupported compression in ${entry.name}`);
}

export function decodeXmlText(value: string): string {
  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, digits: string) =>
      String.fromCodePoint(Number(digits)),
    )
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&");
}

/** "BC12" -> 54 (zero-based column index). */
export function columnIndexFromRef(reference: string): number {
  const letters = /^[A-Z]+/.exec(reference.toUpperCase())?.[0] ?? "A";
  let index = 0;
  for (const letter of letters) {
    index = index * 26 + (letter.charCodeAt(0) - 64);
  }
  return index - 1;
}

/** Shared strings are stored once per workbook and referenced by index. */
export function parseSharedStrings(xml: string): string[] {
  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((match) => {
    const parts = [...match[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)];
    return decodeXmlText(parts.map((part) => part[1]).join(""));
  });
}

export function parseSheetXml(xml: string, sharedStrings: string[]): string[][] {
  const grid: string[][] = [];

  for (const rowMatch of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells: string[] = [];

    for (const cellMatch of rowMatch[1].matchAll(
      /<c([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g,
    )) {
      const attributes = cellMatch[1];
      const body = cellMatch[2] ?? "";
      const reference = /r="([A-Z]+\d+)"/.exec(attributes)?.[1];
      const type = /t="([^"]+)"/.exec(attributes)?.[1];
      const index = reference ? columnIndexFromRef(reference) : cells.length;

      let value = "";
      if (type === "inlineStr") {
        value = decodeXmlText(
          [...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)]
            .map((part) => part[1])
            .join(""),
        );
      } else {
        const raw = /<v[^>]*>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? "";
        value =
          type === "s"
            ? sharedStrings[Number(raw)] ?? ""
            : decodeXmlText(raw);
      }

      while (cells.length < index) cells.push("");
      cells[index] = value.trim();
    }

    grid.push(cells);
  }

  return grid;
}

export function parseCsv(text: string): string[][] {
  const grid: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (character === "\n") {
      row.push(cell.trim());
      grid.push(row);
      row = [];
      cell = "";
    } else if (character !== "\r") {
      cell += character;
    }
  }

  if (cell || row.length > 0) {
    row.push(cell.trim());
    grid.push(row);
  }

  /* A trailing newline leaves one empty row; drop rows that hold nothing. */
  return grid.filter((entry) => entry.some((value) => value !== ""));
}

/*
 * The ".xls" this app exports is an HTML table with an Excel MIME type, and
 * Excel itself saves "Web Page" workbooks the same way.
 */
export function parseHtmlTable(html: string): string[][] {
  const document = new DOMParser().parseFromString(html, "text/html");
  const table = document.querySelector("table");
  if (!table) throw new Error("No table found in the file");

  return [...table.querySelectorAll("tr")].map((row) =>
    [...row.querySelectorAll("th,td")].map(
      (cell) => cell.textContent?.trim() ?? "",
    ),
  );
}

async function parseXlsx(buffer: ArrayBuffer): Promise<string[][]> {
  const entries = readZipEntries(buffer);
  const sheet =
    entries.find((entry) => entry.name === "xl/worksheets/sheet1.xml") ??
    entries.find((entry) => entry.name.startsWith("xl/worksheets/"));
  if (!sheet) throw new Error("The workbook has no worksheet");

  const sharedStringsEntry = entries.find(
    (entry) => entry.name === "xl/sharedStrings.xml",
  );
  const sharedStrings = sharedStringsEntry
    ? parseSharedStrings(await readZipEntry(buffer, sharedStringsEntry))
    : [];

  return parseSheetXml(await readZipEntry(buffer, sheet), sharedStrings);
}

/**
 * Reads the first worksheet of `file` as a grid of trimmed cell strings,
 * header row included. Blank trailing rows are dropped.
 */
export async function readWorkbook(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".csv")) {
    return parseCsv(await file.text());
  }

  const buffer = await file.arrayBuffer();
  const signature = new Uint8Array(buffer, 0, Math.min(2, buffer.byteLength));

  /* "PK" marks a real zip container, which is what XLSX is. */
  if (signature[0] === 0x50 && signature[1] === 0x4b) {
    const grid = await parseXlsx(buffer);
    return grid.filter((row) => row.some((value) => value !== ""));
  }

  const text = new TextDecoder().decode(new Uint8Array(buffer));
  if (/<table/i.test(text)) {
    return parseHtmlTable(text).filter((row) =>
      row.some((value) => value !== ""),
    );
  }

  if (text.includes(",")) return parseCsv(text);

  throw new Error(
    "Unreadable file — export it as .xlsx or .csv and try again",
  );
}

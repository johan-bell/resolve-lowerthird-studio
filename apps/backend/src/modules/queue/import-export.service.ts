import { Injectable } from '@nestjs/common';
import type { ImportFormat, QueueItem } from '@lower-thirds/shared';

/** One row that survived parsing. */
export interface ParsedRow {
  name: string;
  title: string;
}

export interface ParseReport {
  rows: ParsedRow[];
  /** Human-readable notes about rows that were skipped or repaired. */
  warnings: string[];
}

/** Column headers accepted for each field, lower-cased. */
const NAME_HEADERS = ['name', 'person', 'speaker', 'guest', 'full name'];
const TITLE_HEADERS = ['title', 'subtitle', 'role', 'position', 'job title', 'description'];

/**
 * Parses a single RFC 4180 line, honouring quoted fields and doubled quotes.
 * Written by hand rather than pulled from a dependency: the format is small,
 * and this keeps the import path free of supply-chain surface.
 */
const splitCsvLine = (line: string): string[] => {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  fields.push(current);
  return fields.map((f) => f.trim());
};

const escapeCsvField = (value: string): string =>
  /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

@Injectable()
export class ImportExportService {
  /** Turn raw file contents into rows, reporting anything that looked wrong. */
  parse(format: ImportFormat, content: string): ParseReport {
    return format === 'csv' ? this.parseCsv(content) : this.parseJson(content);
  }

  private parseCsv(content: string): ParseReport {
    const warnings: string[] = [];
    const lines = content
      .split(/\r\n|\n|\r/)
      .filter((line, index) => line.trim().length > 0 || index === 0);

    if (lines.length === 0) return { rows: [], warnings: ['The file was empty.'] };

    const header = splitCsvLine(lines[0] ?? '').map((h) => h.toLowerCase());
    let nameIndex = header.findIndex((h) => NAME_HEADERS.includes(h));
    let titleIndex = header.findIndex((h) => TITLE_HEADERS.includes(h));
    let firstDataLine = 1;

    // No recognisable header: assume the file is bare "name,title" data.
    if (nameIndex === -1) {
      nameIndex = 0;
      titleIndex = header.length > 1 ? 1 : -1;
      firstDataLine = 0;
      warnings.push('No header row was recognised — using the first column as Name.');
    }

    const rows: ParsedRow[] = [];
    for (let i = firstDataLine; i < lines.length; i += 1) {
      const raw = lines[i];
      if (raw === undefined || raw.trim().length === 0) continue;

      const fields = splitCsvLine(raw);
      const name = (fields[nameIndex] ?? '').trim();
      const title = titleIndex >= 0 ? (fields[titleIndex] ?? '').trim() : '';

      if (name.length === 0) {
        warnings.push(`Line ${String(i + 1)} skipped: no name.`);
        continue;
      }
      rows.push({ name: name.slice(0, 200), title: title.slice(0, 300) });
    }

    if (rows.length === 0) warnings.push('No usable rows were found.');
    return { rows, warnings };
  }

  private parseJson(content: string): ParseReport {
    const warnings: string[] = [];
    let parsed: unknown;

    try {
      parsed = JSON.parse(content);
    } catch (err) {
      return {
        rows: [],
        warnings: [`Not valid JSON: ${err instanceof Error ? err.message : 'parse failed'}`],
      };
    }

    // Accept either a bare array or { items: [...] }.
    const candidates: unknown = Array.isArray(parsed)
      ? parsed
      : typeof parsed === 'object' && parsed !== null && 'items' in parsed
        ? (parsed as { items: unknown }).items
        : null;

    if (!Array.isArray(candidates)) {
      return { rows: [], warnings: ['Expected an array of rows, or an object with an "items" array.'] };
    }

    const rows: ParsedRow[] = [];
    candidates.forEach((entry, index) => {
      if (typeof entry !== 'object' || entry === null) {
        warnings.push(`Entry ${String(index + 1)} skipped: not an object.`);
        return;
      }

      const record = entry as Record<string, unknown>;
      const nameKey = Object.keys(record).find((k) => NAME_HEADERS.includes(k.toLowerCase()));
      const titleKey = Object.keys(record).find((k) => TITLE_HEADERS.includes(k.toLowerCase()));
      const name = typeof nameKey === 'string' ? String(record[nameKey] ?? '').trim() : '';
      const title = typeof titleKey === 'string' ? String(record[titleKey] ?? '').trim() : '';

      if (name.length === 0) {
        warnings.push(`Entry ${String(index + 1)} skipped: no name field.`);
        return;
      }
      rows.push({ name: name.slice(0, 200), title: title.slice(0, 300) });
    });

    if (rows.length === 0) warnings.push('No usable entries were found.');
    return { rows, warnings };
  }

  toCsv(items: QueueItem[]): string {
    const lines = ['name,title'];
    for (const item of items) {
      lines.push(`${escapeCsvField(item.name)},${escapeCsvField(item.title)}`);
    }
    return lines.join('\n');
  }

  toJson(items: QueueItem[]): string {
    return JSON.stringify(
      { items: items.map(({ name, title, order }) => ({ name, title, order })) },
      null,
      2,
    );
  }
}

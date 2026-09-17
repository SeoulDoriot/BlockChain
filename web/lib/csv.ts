/**
 * A small CSV reader/writer.
 *
 * Deliberately not a dependency: the bulk-issue file is produced by staff in
 * Excel or Sheets, so it needs quoted fields, embedded commas, escaped quotes
 * ("" inside a quoted field) and CRLF line endings — and nothing more exotic
 * than that.
 */

export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  // Strip a UTF-8 BOM, which Excel writes and which would otherwise become
  // part of the first header name.
  const text = input.replace(/^﻿/, "");

  for (let i = 0; i < text.length; i++) {
    const char = text[i]!;

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      // swallow the \n of a \r\n pair
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }

  // last field / row, unless the file ended with a newline
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

export function toCsv(rows: Array<Array<string | number | null>>): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = cell === null || cell === undefined ? "" : String(cell);
          return /[",\r\n]/.test(value)
            ? `"${value.replace(/"/g, '""')}"`
            : value;
        })
        .join(","),
    )
    .join("\r\n");
}

export interface BulkRow {
  line: number;
  courseCode: string;
  recipientName: string;
  recipientEmail: string;
  issuedOn: string;
  expiresOn: string | null;
}

export interface BulkParseResult {
  rows: BulkRow[];
  errors: Array<{ line: number; message: string }>;
}

const REQUIRED_HEADERS = [
  "course_code",
  "recipient_name",
  "recipient_email",
] as const;

/**
 * Parse and validate a bulk-issue file.
 *
 * Header row is required. `issued_on` defaults to today and `expires_on` may
 * be blank, meaning the certificate never expires.
 */
export function parseBulkCsv(input: string, today: string): BulkParseResult {
  const table = parseCsv(input);
  const errors: Array<{ line: number; message: string }> = [];

  if (table.length === 0) {
    return { rows: [], errors: [{ line: 0, message: "The file is empty." }] };
  }

  const headers = table[0]!.map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));

  if (missing.length > 0) {
    return {
      rows: [],
      errors: [
        {
          line: 1,
          message: `Missing column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}. Expected header: ${REQUIRED_HEADERS.join(", ")}, issued_on, expires_on`,
        },
      ],
    };
  }

  const index = (name: string) => headers.indexOf(name);
  const rows: BulkRow[] = [];
  const seenEmails = new Map<string, number>();
  const DATE = /^\d{4}-\d{2}-\d{2}$/;

  for (let i = 1; i < table.length; i++) {
    const cells = table[i]!;
    const line = i + 1;
    const get = (name: string) => (cells[index(name)] ?? "").trim();

    const courseCode = get("course_code").toUpperCase();
    const recipientName = get("recipient_name");
    const recipientEmail = get("recipient_email").toLowerCase();
    const issuedOn = get("issued_on") || today;
    const expiresRaw = get("expires_on");
    const expiresOn = expiresRaw === "" ? null : expiresRaw;

    if (!courseCode) errors.push({ line, message: "course_code is required." });
    if (!recipientName) errors.push({ line, message: "recipient_name is required." });
    if (!recipientEmail) {
      errors.push({ line, message: "recipient_email is required." });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      errors.push({ line, message: `"${recipientEmail}" is not a valid email.` });
    }
    if (!DATE.test(issuedOn)) {
      errors.push({ line, message: `issued_on "${issuedOn}" must be YYYY-MM-DD.` });
    }
    if (expiresOn && !DATE.test(expiresOn)) {
      errors.push({ line, message: `expires_on "${expiresOn}" must be YYYY-MM-DD.` });
    }
    if (expiresOn && DATE.test(expiresOn) && expiresOn <= issuedOn) {
      errors.push({ line, message: "expires_on must be after issued_on." });
    }

    // A duplicate inside one file is almost always a copy-paste slip, and it
    // would otherwise issue two certificates to the same person.
    const key = `${courseCode}|${recipientEmail}`;
    if (seenEmails.has(key)) {
      errors.push({
        line,
        message: `Duplicate of line ${seenEmails.get(key)} (same course and email).`,
      });
    } else if (recipientEmail && courseCode) {
      seenEmails.set(key, line);
    }

    rows.push({ line, courseCode, recipientName, recipientEmail, issuedOn, expiresOn });
  }

  return { rows, errors };
}

export const BULK_TEMPLATE = toCsv([
  ["course_code", "recipient_name", "recipient_email", "issued_on", "expires_on"],
  ["CS101", "Sok Dara", "sok.dara@example.com", "2026-09-17", "2029-09-17"],
  ["CS220", "Chan Sophea", "chan.sophea@example.com", "2026-09-17", ""],
]);

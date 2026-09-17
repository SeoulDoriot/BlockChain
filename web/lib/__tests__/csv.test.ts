import { describe, it, expect } from "vitest";
import { parseCsv, toCsv, parseBulkCsv } from "@/lib/csv";

const TODAY = "2026-09-17";

describe("parseCsv", () => {
  it("parses a simple table", () => {
    expect(parseCsv("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("handles quoted fields containing commas", () => {
    expect(parseCsv('a,b\n"Sok, Dara",2')).toEqual([
      ["a", "b"],
      ["Sok, Dara", "2"],
    ]);
  });

  it("handles escaped quotes inside a quoted field", () => {
    expect(parseCsv('a\n"She said ""hi"""')).toEqual([["a"], ['She said "hi"']]);
  });

  it("handles CRLF line endings", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("strips a UTF-8 BOM", () => {
    expect(parseCsv("﻿a,b\n1,2")[0]).toEqual(["a", "b"]);
  });

  it("skips blank lines", () => {
    expect(parseCsv("a,b\n\n1,2\n\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("keeps empty trailing fields", () => {
    expect(parseCsv("a,b,c\n1,,3")).toEqual([
      ["a", "b", "c"],
      ["1", "", "3"],
    ]);
  });
});

describe("toCsv", () => {
  it("quotes fields containing a comma, quote or newline", () => {
    expect(toCsv([["plain", "has,comma", 'has"quote', "has\nnewline"]])).toBe(
      'plain,"has,comma","has""quote","has\nnewline"',
    );
  });

  it("writes null as an empty field", () => {
    expect(toCsv([["a", null]])).toBe("a,");
  });

  it("round-trips through parseCsv", () => {
    const rows = [["name", "note"], ["Sok, Dara", 'said "hi"']];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });
});

describe("parseBulkCsv", () => {
  const header = "course_code,recipient_name,recipient_email,issued_on,expires_on";

  it("parses a valid file", () => {
    const result = parseBulkCsv(
      `${header}\nCS101,Sok Dara,sok@example.com,2026-09-17,2029-09-17`,
      TODAY,
    );
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      courseCode: "CS101",
      recipientName: "Sok Dara",
      recipientEmail: "sok@example.com",
      issuedOn: "2026-09-17",
      expiresOn: "2029-09-17",
    });
  });

  it("treats a blank expiry as no expiry", () => {
    const result = parseBulkCsv(`${header}\nCS101,Sok,sok@example.com,2026-09-17,`, TODAY);
    expect(result.errors).toEqual([]);
    expect(result.rows[0]!.expiresOn).toBeNull();
  });

  it("defaults issued_on to today when blank", () => {
    const result = parseBulkCsv(`${header}\nCS101,Sok,sok@example.com,,`, TODAY);
    expect(result.rows[0]!.issuedOn).toBe(TODAY);
  });

  it("uppercases the course code and lowercases the email", () => {
    const result = parseBulkCsv(`${header}\ncs101,Sok,SOK@Example.COM,,`, TODAY);
    expect(result.rows[0]!.courseCode).toBe("CS101");
    expect(result.rows[0]!.recipientEmail).toBe("sok@example.com");
  });

  it("reports a missing required column", () => {
    const result = parseBulkCsv("course_code,recipient_name\nCS101,Sok", TODAY);
    expect(result.errors[0]!.message).toMatch(/recipient_email/);
    expect(result.rows).toEqual([]);
  });

  it("reports an empty file", () => {
    expect(parseBulkCsv("", TODAY).errors[0]!.message).toMatch(/empty/i);
  });

  it("rejects a malformed email", () => {
    const result = parseBulkCsv(`${header}\nCS101,Sok,not-an-email,,`, TODAY);
    expect(result.errors.some((e) => /not a valid email/.test(e.message))).toBe(true);
  });

  it("rejects an expiry that is not after the issue date", () => {
    const result = parseBulkCsv(
      `${header}\nCS101,Sok,sok@example.com,2026-09-17,2026-09-17`,
      TODAY,
    );
    expect(result.errors.some((e) => /after issued_on/.test(e.message))).toBe(true);
  });

  it("rejects a malformed date", () => {
    const result = parseBulkCsv(`${header}\nCS101,Sok,sok@example.com,17/09/2026,`, TODAY);
    expect(result.errors.some((e) => /YYYY-MM-DD/.test(e.message))).toBe(true);
  });

  it("flags a duplicate course+email pair and names the first line", () => {
    const result = parseBulkCsv(
      `${header}\nCS101,Sok,sok@example.com,,\nCS101,Sok,sok@example.com,,`,
      TODAY,
    );
    expect(result.errors.some((e) => /Duplicate of line 2/.test(e.message))).toBe(true);
  });

  it("allows the same person on two different courses", () => {
    const result = parseBulkCsv(
      `${header}\nCS101,Sok,sok@example.com,,\nCS220,Sok,sok@example.com,,`,
      TODAY,
    );
    expect(result.errors).toEqual([]);
  });

  it("reports the spreadsheet line number, not the array index", () => {
    const result = parseBulkCsv(`${header}\nCS101,,sok@example.com,,`, TODAY);
    expect(result.errors[0]!.line).toBe(2);
  });

  it("tolerates header casing and spaces", () => {
    const result = parseBulkCsv(
      "Course Code,Recipient Name,Recipient Email\nCS101,Sok,sok@example.com",
      TODAY,
    );
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(1);
  });
});

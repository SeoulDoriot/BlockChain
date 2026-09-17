"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BULK_TEMPLATE, parseBulkCsv, toCsv, type BulkRow } from "@/lib/csv";
import type { CourseSummary } from "@/lib/data/reference";

type RowOutcome =
  | { state: "pending" }
  | { state: "working" }
  | { state: "done"; certificateId: string; txHash: string }
  | { state: "failed"; error: string };

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function download(filename: string, contents: string, type = "text/csv") {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function BulkIssue({ courses }: { courses: CourseSummary[] }) {
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [parseErrors, setParseErrors] = useState<
    Array<{ line: number; message: string }>
  >([]);
  const [outcomes, setOutcomes] = useState<Record<number, RowOutcome>>({});
  const [running, setRunning] = useState(false);
  const cancelled = useRef(false);

  const courseByCode = useMemo(() => {
    const map = new Map<string, CourseSummary>();
    for (const course of courses) map.set(course.code.toUpperCase(), course);
    return map;
  }, [courses]);

  // Rows naming a course this organisation does not have cannot be issued.
  const unknownCourses = useMemo(
    () =>
      rows
        .filter((row) => !courseByCode.has(row.courseCode))
        .map((row) => ({ line: row.line, message: `Unknown course "${row.courseCode}".` })),
    [rows, courseByCode],
  );

  const blocking = [...parseErrors, ...unknownCourses].sort((a, b) => a.line - b.line);
  const canRun = rows.length > 0 && blocking.length === 0 && !running;

  const completed = Object.values(outcomes).filter(
    (o) => o.state === "done" || o.state === "failed",
  ).length;
  const succeeded = Object.values(outcomes).filter((o) => o.state === "done").length;
  const failed = Object.values(outcomes).filter((o) => o.state === "failed").length;
  const progress = rows.length === 0 ? 0 : Math.round((completed / rows.length) * 100);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const result = parseBulkCsv(text, today());
    setRows(result.rows);
    setParseErrors(result.errors);
    setOutcomes({});
  }

  async function run() {
    setRunning(true);
    cancelled.current = false;

    // Sequential on purpose: each row is a blockchain transaction from the
    // same wallet, and firing them in parallel would race on the nonce.
    for (const row of rows) {
      if (cancelled.current) break;

      setOutcomes((prev) => ({ ...prev, [row.line]: { state: "working" } }));
      const course = courseByCode.get(row.courseCode)!;

      try {
        const response = await fetch("/api/certificates/issue", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            courseId: course.id,
            recipientName: row.recipientName,
            recipientEmail: row.recipientEmail,
            issuedOn: row.issuedOn,
            expiresOn: row.expiresOn,
          }),
        });
        const body = await response.json();

        setOutcomes((prev) => ({
          ...prev,
          [row.line]: response.ok
            ? { state: "done", certificateId: body.id, txHash: body.txHash }
            : { state: "failed", error: body.error ?? `HTTP ${response.status}` },
        }));
      } catch (error) {
        setOutcomes((prev) => ({
          ...prev,
          [row.line]: { state: "failed", error: (error as Error).message },
        }));
      }
    }

    setRunning(false);
  }

  function downloadResults() {
    const table: Array<Array<string | null>> = [
      [
        "line",
        "course_code",
        "recipient_name",
        "recipient_email",
        "issued_on",
        "expires_on",
        "result",
        "certificate_id",
        "tx_hash",
        "error",
      ],
    ];

    for (const row of rows) {
      const outcome = outcomes[row.line];
      table.push([
        String(row.line),
        row.courseCode,
        row.recipientName,
        row.recipientEmail,
        row.issuedOn,
        row.expiresOn,
        outcome?.state === "done"
          ? "issued"
          : outcome?.state === "failed"
            ? "failed"
            : "not attempted",
        outcome?.state === "done" ? outcome.certificateId : "",
        outcome?.state === "done" ? outcome.txHash : "",
        outcome?.state === "failed" ? outcome.error : "",
      ]);
    }

    download(`bulk-issue-results-${today()}.csv`, toCsv(table));
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="csv">CSV file</Label>
        <input
          id="csv"
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
          disabled={running}
          className="block w-full text-sm file:mr-3 file:rounded-md file:border file:bg-transparent file:px-3 file:py-1.5 file:text-sm"
          aria-describedby="csv-hint"
        />
        <p id="csv-hint" className="text-xs text-muted-foreground">
          Columns: course_code, recipient_name, recipient_email, issued_on,
          expires_on. The dates may be left blank — issued_on defaults to today
          and a blank expires_on means the certificate never expires.
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => download("bulk-issue-template.csv", BULK_TEMPLATE)}
        >
          Download a template
        </Button>
      </div>

      {blocking.length > 0 ? (
        <Alert variant="destructive">
          <AlertTitle>
            {blocking.length} problem{blocking.length > 1 ? "s" : ""} in the file
          </AlertTitle>
          <AlertDescription>
            <ul className="mt-1 list-disc space-y-0.5 ps-4">
              {blocking.slice(0, 12).map((error, index) => (
                <li key={index}>
                  Line {error.line}: {error.message}
                </li>
              ))}
              {blocking.length > 12 ? (
                <li>…and {blocking.length - 12} more.</li>
              ) : null}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      {rows.length > 0 ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={run} disabled={!canRun}>
              {running
                ? `Issuing ${completed + 1} of ${rows.length}…`
                : `Issue ${rows.length} certificate${rows.length > 1 ? "s" : ""}`}
            </Button>
            {running ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  cancelled.current = true;
                }}
              >
                Stop after this one
              </Button>
            ) : null}
            {completed > 0 && !running ? (
              <Button variant="outline" size="sm" onClick={downloadResults}>
                Download results CSV
              </Button>
            ) : null}
          </div>

          {completed > 0 || running ? (
            <div className="space-y-2">
              <div
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Bulk issue progress"
                className="h-2 w-full overflow-hidden rounded-full bg-muted"
              >
                <div
                  className="h-full bg-primary transition-[width] duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {completed} of {rows.length} processed · {succeeded} issued
                {failed > 0 ? ` · ${failed} failed` : ""}
              </p>
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <Table>
              <caption className="sr-only">Rows found in the uploaded file</caption>
              <TableHeader>
                <TableRow>
                  <TableHead>Line</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const outcome = outcomes[row.line];
                  return (
                    <TableRow key={row.line}>
                      <TableCell className="tabular-nums">{row.line}</TableCell>
                      <TableCell>
                        <div className="font-medium">{row.recipientName}</div>
                        <div className="text-xs text-muted-foreground">
                          {row.recipientEmail}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {row.courseCode}
                      </TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {row.expiresOn ?? "never"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {!outcome || outcome.state === "pending" ? (
                          <span className="text-muted-foreground">—</span>
                        ) : outcome.state === "working" ? (
                          <span className="text-muted-foreground">Issuing…</span>
                        ) : outcome.state === "done" ? (
                          <Link
                            href={`/dashboard/certificates/${outcome.certificateId}`}
                            className="underline-offset-4 hover:underline"
                          >
                            Issued
                          </Link>
                        ) : (
                          <span className="text-destructive">{outcome.error}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      ) : null}
    </div>
  );
}

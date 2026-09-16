"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CourseSummary } from "@/lib/data/reference";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function IssueCertificateForm({ courses }: { courses: CourseSummary[] }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const expiresOn = String(form.get("expiresOn") ?? "").trim();

    const payload = {
      courseId: String(form.get("courseId") ?? ""),
      recipientName: String(form.get("recipientName") ?? ""),
      recipientEmail: String(form.get("recipientEmail") ?? ""),
      issuedOn: String(form.get("issuedOn") ?? ""),
      expiresOn: expiresOn === "" ? null : expiresOn,
    };

    try {
      const response = await fetch("/api/certificates/issue", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await response.json();

      if (!response.ok) {
        if (Array.isArray(body.issues)) {
          const mapped: Record<string, string> = {};
          for (const issue of body.issues) {
            const key = issue.path?.[0];
            if (typeof key === "string") mapped[key] = issue.message;
          }
          setErrors(mapped);
        }
        toast.error(body.error ?? "Could not issue the certificate.");
        return;
      }

      toast.success("Certificate issued and anchored on-chain.");
      router.push(`/dashboard/certificates/${body.id}`);
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (courses.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No courses exist yet. Run the seed script or add a course first.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor="courseId">Course</Label>
        <select
          id="courseId"
          name="courseId"
          required
          defaultValue={courses[0]?.id}
          className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
          aria-invalid={Boolean(errors.courseId)}
          aria-describedby={errors.courseId ? "courseId-error" : undefined}
        >
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.code} — {course.title}
            </option>
          ))}
        </select>
        {errors.courseId ? (
          <p id="courseId-error" role="alert" className="text-sm text-destructive">
            {errors.courseId}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="recipientName">Recipient name</Label>
        <Input
          id="recipientName"
          name="recipientName"
          required
          autoComplete="off"
          aria-invalid={Boolean(errors.recipientName)}
          aria-describedby={
            errors.recipientName ? "recipientName-error" : "recipientName-hint"
          }
        />
        <p id="recipientName-hint" className="text-xs text-muted-foreground">
          Exactly as it should appear on the certificate. This is part of the
          hash, so it cannot be changed later.
        </p>
        {errors.recipientName ? (
          <p id="recipientName-error" role="alert" className="text-sm text-destructive">
            {errors.recipientName}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="recipientEmail">Recipient email</Label>
        <Input
          id="recipientEmail"
          name="recipientEmail"
          type="email"
          required
          autoComplete="off"
          aria-invalid={Boolean(errors.recipientEmail)}
          aria-describedby={errors.recipientEmail ? "recipientEmail-error" : undefined}
        />
        {errors.recipientEmail ? (
          <p id="recipientEmail-error" role="alert" className="text-sm text-destructive">
            {errors.recipientEmail}
          </p>
        ) : null}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="issuedOn">Issue date</Label>
          <Input
            id="issuedOn"
            name="issuedOn"
            type="date"
            required
            defaultValue={today()}
            aria-invalid={Boolean(errors.issuedOn)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expiresOn">Expiry date</Label>
          <Input
            id="expiresOn"
            name="expiresOn"
            type="date"
            aria-describedby="expiresOn-hint"
            aria-invalid={Boolean(errors.expiresOn)}
          />
          <p id="expiresOn-hint" className="text-xs text-muted-foreground">
            Leave blank for no expiry.
          </p>
          {errors.expiresOn ? (
            <p id="expiresOn-error" role="alert" className="text-sm text-destructive">
              {errors.expiresOn}
            </p>
          ) : null}
        </div>
      </div>

      <Button type="submit" disabled={submitting}>
        {submitting ? "Anchoring on-chain…" : "Issue certificate"}
      </Button>
    </form>
  );
}

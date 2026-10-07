"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CertificatePreview } from "@/components/certificate-preview";
import { DEFAULT_CERTIFICATE_TITLE, DEFAULT_DESCRIPTION, type CertificateTemplate } from "@/lib/cert/template-layout";
import { Textarea } from "@/components/ui/textarea";
import type { CourseSummary } from "@/lib/data/reference";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const SELECT =
  "h-10 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none transition-colors duration-200 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 aria-invalid:border-destructive";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-2xl border bg-card p-5 sm:p-6">
      <h2 className="text-base font-medium">{title}</h2>
      {children}
    </section>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} role="alert" className="text-sm text-destructive">
      {message}
    </p>
  ) : null;
}

export function IssueCertificateForm({
  courses,
  orgName,
  signatoryName,
  signatoryTitle,
  signatureSrc,
  isAdmin = false,
}: {
  courses: CourseSummary[];
  orgName: string;
  signatoryName?: string | null;
  signatoryTitle?: string | null;
  signatureSrc?: string;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "issue" | "draft">(null);
  const [confirming, setConfirming] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [issuedOn, setIssuedOn] = useState(today());
  const [expiresOn, setExpiresOn] = useState("");
  const [templateId, setTemplateId] = useState<CertificateTemplate>("kit-red");
  const [certificateTitle, setCertificateTitle] = useState(DEFAULT_CERTIFICATE_TITLE);
  const [description, setDescription] = useState(DEFAULT_DESCRIPTION);

  const course = courses.find((c) => c.id === courseId);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!certificateTitle.trim()) next.certificateTitle = "Enter a certificate heading.";
    if (!description.trim()) next.description = "Enter a description.";
    if (!recipientName.trim()) next.recipientName = "Enter the recipient's name.";
    if (!/^\S+@\S+\.\S+$/.test(recipientEmail.trim())) next.recipientEmail = "Enter a valid email.";
    if (!issuedOn) next.issuedOn = "Choose an issue date.";
    if (expiresOn && expiresOn <= issuedOn) next.expiresOn = "Expiry must be after the issue date.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(mode: "issue" | "draft") {
    setErrors({});
    setBusy(mode);

    const payload = {
      templateId,
      certificateTitle,
      description,
      courseId,
      recipientName,
      recipientEmail,
      issuedOn,
      expiresOn: expiresOn === "" ? null : expiresOn,
      ...(mode === "draft" ? { draft: true } : {}),
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
        setConfirming(false);
        return;
      }

      toast.success(mode === "draft" ? "Draft saved." : "Certificate issued.");
      router.push(`/dashboard/certificates/${body.id}`);
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (courses.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center">
        <p className="font-medium">No courses yet</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          Certificates are issued for a course. {isAdmin ? "Add your first one to get started." : "Ask an admin to add one."}
        </p>
        {isAdmin ? (
          <Button asChild className="mt-5">
            <Link href="/dashboard/courses">Add a course</Link>
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (validate()) setConfirming(true);
        }}
        className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]"
        noValidate
      >
        <div className="space-y-5">
          <Section title="Recipient information">
            <div className="space-y-2">
              <Label htmlFor="recipientName">Recipient name</Label>
              <Input
                id="recipientName"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                autoComplete="off"
                placeholder="Sokha Chan"
                aria-invalid={Boolean(errors.recipientName)}
                aria-describedby="recipientName-hint recipientName-error"
              />
              <p id="recipientName-hint" className="text-xs text-muted-foreground">
                Exactly as it should appear. It cannot be changed after issuing.
              </p>
              <FieldError id="recipientName-error" message={errors.recipientName} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipientEmail">Email address</Label>
              <Input
                id="recipientEmail"
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                autoComplete="off"
                placeholder="name@example.com"
                aria-invalid={Boolean(errors.recipientEmail)}
                aria-describedby="recipientEmail-error"
              />
              <FieldError id="recipientEmail-error" message={errors.recipientEmail} />
            </div>
          </Section>

          <Section title="Certificate information">
            <div className="space-y-2">
              <Label htmlFor="courseId">Course / Program name</Label>
              <select
                id="courseId"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className={SELECT}
                aria-invalid={Boolean(errors.courseId)}
                aria-describedby="courseId-error"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.code})
                  </option>
                ))}
              </select>
              <FieldError id="courseId-error" message={errors.courseId} />
              {isAdmin ? (
                <p className="text-xs text-muted-foreground">
                  Not listed?{" "}
                  <Link href="/dashboard/courses" className="text-foreground underline underline-offset-4">
                    Add a course
                  </Link>
                </p>
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="issuedOn">Issue date</Label>
                <Input
                  id="issuedOn"
                  type="date"
                  value={issuedOn}
                  onChange={(e) => setIssuedOn(e.target.value)}
                  aria-invalid={Boolean(errors.issuedOn)}
                  aria-describedby="issuedOn-error"
                />
                <FieldError id="issuedOn-error" message={errors.issuedOn} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiresOn">Expiration date</Label>
                <Input
                  id="expiresOn"
                  type="date"
                  value={expiresOn}
                  onChange={(e) => setExpiresOn(e.target.value)}
                  aria-invalid={Boolean(errors.expiresOn)}
                  aria-describedby="expiresOn-hint expiresOn-error"
                />
                <p id="expiresOn-hint" className="text-xs text-muted-foreground">
                  Optional. Leave blank if it never expires.
                </p>
                <FieldError id="expiresOn-error" message={errors.expiresOn} />
              </div>
            </div>
          </Section>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" size="lg" className="flex-1 sm:flex-none" disabled={busy !== null}>
              Issue Certificate
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="flex-1 sm:flex-none"
              disabled={busy !== null || !recipientName.trim() || !/^\S+@\S+\.\S+$/.test(recipientEmail.trim())}
              onClick={() => { if (validate()) submit("draft"); }}
            >
              {busy === "draft" ? "Saving…" : "Save Draft"}
            </Button>
          </div>
        </div>

        <div className="space-y-5 lg:sticky lg:top-8">
          <Section title="Live preview">
            <CertificatePreview
              templateId={templateId}
              certificateTitle={certificateTitle.trim()}
              description={description.trim()}
              orgName={orgName}
              recipientName={recipientName.trim()}
              title={course?.title}
              issuedOn={issuedOn}
              expiresOn={expiresOn || null}
              signatoryName={signatoryName}
              signatoryTitle={signatoryTitle}
              signatureSrc={signatureSrc}
            />
          </Section>
          <Section title="Template settings">
            <div className="space-y-2">
              <Label htmlFor="templateId">Certificate template</Label>
              <select id="templateId" value={templateId} onChange={(e) => setTemplateId(e.target.value as CertificateTemplate)} className={SELECT}>
                <option value="kit-red">KIT — Red institutional</option>
                <option value="classic">Classic — Minimal</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="certificateTitle">Certificate heading</Label>
              <Input id="certificateTitle" value={certificateTitle} maxLength={100}
                onChange={(e) => setCertificateTitle(e.target.value)}
                aria-invalid={Boolean(errors.certificateTitle)} aria-describedby="certificateTitle-error" />
              <FieldError id="certificateTitle-error" message={errors.certificateTitle} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description text</Label>
              <Textarea id="description" value={description} maxLength={180} rows={2}
                onChange={(e) => setDescription(e.target.value)}
                aria-invalid={Boolean(errors.description)} aria-describedby="description-error" />
              <FieldError id="description-error" message={errors.description} />
            </div>
          </Section>
        </div>
      </form>

      <Dialog open={confirming} onOpenChange={(open) => (busy ? null : setConfirming(open))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-secondary">
              <ShieldCheck className="size-5" strokeWidth={1.75} />
            </div>
            <DialogTitle className="text-base">Issue this certificate?</DialogTitle>
            <DialogDescription>
              A fingerprint of this certificate will be permanently recorded on
              the blockchain. It can be revoked later, but never edited or
              erased.
            </DialogDescription>
          </DialogHeader>
          <dl className="divide-y rounded-xl border text-sm">
            {[
              ["Recipient", recipientName.trim()],
              ["Heading", certificateTitle.trim()],
              ["Certificate", course?.title ?? "—"],
              ["Issue date", issuedOn],
              ["Expiration", expiresOn || "Does not expire"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 px-4 py-2.5">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-right font-medium">{value}</dd>
              </div>
            ))}
          </dl>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="outline" disabled={busy !== null} onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button disabled={busy !== null} onClick={() => submit("issue")}>
              {busy === "issue" ? "Issuing…" : "Confirm and issue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

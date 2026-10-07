"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
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

export interface CourseRow {
  id: string;
  code: string;
  title: string;
  certificates: number;
}

type Editing = { mode: "create" } | { mode: "edit"; course: CourseRow } | null;

export function CourseManager({
  courses,
  canEdit,
}: {
  courses: CourseRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<CourseRow | null>(null);
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function open(next: Editing) {
    setError(null);
    setCode(next?.mode === "edit" ? next.course.code : "");
    setTitle(next?.mode === "edit" ? next.course.title : "");
    setEditing(next);
  }

  async function request(url: string, method: string, body?: unknown) {
    const response = await fetch(url, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  }

  async function save() {
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      const result =
        editing.mode === "create"
          ? await request("/api/courses", "POST", { code, title })
          : await request(`/api/courses/${editing.course.id}`, "PATCH", {
              ...(code !== editing.course.code ? { code } : {}),
              ...(title !== editing.course.title ? { title } : {}),
            });

      if (!result.ok) {
        setError(result.data.error ?? "Could not save the course.");
        return;
      }
      toast.success(editing.mode === "create" ? "Course added." : "Course updated.");
      setEditing(null);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      const result = await request(`/api/courses/${deleting.id}`, "DELETE");
      if (!result.ok) {
        toast.error(result.data.error ?? "Could not delete the course.");
        return;
      }
      toast.success("Course deleted.");
      setDeleting(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const codeLocked = editing?.mode === "edit" && editing.course.certificates > 0;

  return (
    <>
      <div className="flex justify-end">
        {canEdit ? (
          <Button onClick={() => open({ mode: "create" })}>
            <Plus strokeWidth={2} /> Add course
          </Button>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card">
        {courses.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="font-medium">No courses yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {canEdit
                ? "Add your first course, then you can issue certificates for it."
                : "Ask an admin to add the courses you issue certificates for."}
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {courses.map((course) => (
              <li
                key={course.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-4 transition-colors duration-150 hover:bg-muted/50 sm:px-5"
              >
                <span className="w-24 shrink-0 font-mono text-sm">{course.code}</span>
                <span className="min-w-0 flex-1 basis-48 font-medium">{course.title}</span>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {course.certificates} certificate{course.certificates === 1 ? "" : "s"}
                </span>
                {canEdit ? (
                  <span className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit ${course.code}`}
                      onClick={() => open({ mode: "edit", course })}
                    >
                      <Pencil strokeWidth={1.75} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${course.code}`}
                      disabled={course.certificates > 0}
                      title={
                        course.certificates > 0
                          ? "In use, so it can't be deleted"
                          : "Delete course"
                      }
                      onClick={() => setDeleting(course)}
                    >
                      <Trash2 strokeWidth={1.75} />
                    </Button>
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={editing !== null} onOpenChange={(o) => (busy ? null : !o && setEditing(null))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              {editing?.mode === "edit" ? "Edit course" : "Add a course"}
            </DialogTitle>
            <DialogDescription>
              {editing?.mode === "edit"
                ? "Renaming is always safe. The code is locked once certificates use it."
                : "Certificates are issued against a course. The code is permanent once used."}
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="course-code">Course code</Label>
              <Input
                id="course-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="CS101"
                autoComplete="off"
                disabled={codeLocked}
                className="font-mono"
              />
              {codeLocked ? (
                <p className="text-xs text-muted-foreground">
                  Locked: {editing.course.certificates} certificate
                  {editing.course.certificates === 1 ? " uses" : "s use"} this code.
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-title">Course title</Label>
              <Input
                id="course-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Introduction to Computer Science"
                autoComplete="off"
              />
            </div>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <DialogFooter className="gap-2 sm:justify-end">
              <Button type="button" variant="outline" disabled={busy} onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy || code.trim().length < 2 || title.trim().length < 2}>
                {busy ? "Saving…" : editing?.mode === "edit" ? "Save changes" : "Add course"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleting !== null} onOpenChange={(o) => (busy ? null : !o && setDeleting(null))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Delete this course?</DialogTitle>
            <DialogDescription>
              {deleting?.code} — {deleting?.title}. No certificates use it, so nothing else is affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="outline" disabled={busy} onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={busy} onClick={() => void remove()}>
              {busy ? "Deleting…" : "Delete course"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

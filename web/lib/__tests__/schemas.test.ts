import { describe, expect, it } from "vitest";
import {
  createCourseSchema,
  signatorySchema,
  updateCourseSchema,
} from "@/lib/schemas";

describe("course schemas", () => {
  it("normalises the code to upper case and trims the title", () => {
    const parsed = createCourseSchema.parse({ code: " cs101 ", title: "  Intro to CS " });
    expect(parsed).toEqual({ code: "CS101", title: "Intro to CS" });
  });

  it.each(["", "A", "has space", "bad/slash", "x".repeat(21), "-LEADING"])(
    "rejects the invalid code %j",
    (code) => {
      expect(createCourseSchema.safeParse({ code, title: "Fine title" }).success).toBe(false);
    },
  );

  it("accepts dots, dashes and underscores inside a code", () => {
    expect(createCourseSchema.safeParse({ code: "CS-101_a.b", title: "Fine title" }).success).toBe(true);
  });

  it("requires a title of at least two characters", () => {
    expect(createCourseSchema.safeParse({ code: "CS101", title: "x" }).success).toBe(false);
  });

  it("an update must change something", () => {
    expect(updateCourseSchema.safeParse({}).success).toBe(false);
    expect(updateCourseSchema.safeParse({ title: "New title" }).success).toBe(true);
    expect(updateCourseSchema.safeParse({ code: "new1" }).data).toEqual({ code: "NEW1" });
  });
});

describe("signatory schema", () => {
  it("accepts a name and title", () => {
    expect(signatorySchema.safeParse({ name: "Dr. Sok Pisey", title: "Chairman" }).success).toBe(true);
  });

  it("rejects an empty name or title", () => {
    expect(signatorySchema.safeParse({ name: "", title: "Chairman" }).success).toBe(false);
    expect(signatorySchema.safeParse({ name: "Dr. Sok", title: " " }).success).toBe(false);
  });
});

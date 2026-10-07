import { z } from "zod";
import { DEFAULT_CERTIFICATE_TITLE, DEFAULT_DESCRIPTION } from "@/lib/cert/template-layout";

const DATE = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD.");

export const issueCertificateSchema = z
  .object({
    templateId: z.enum(["classic", "kit-red"]).default("kit-red"),
    certificateTitle: z.string().trim().min(1).max(100).default(DEFAULT_CERTIFICATE_TITLE),
    description: z.string().trim().min(1).max(180).default(DEFAULT_DESCRIPTION),
    courseId: z.string().uuid("Choose a course."),
    recipientName: z.string().trim().min(1, "Enter the recipient's name.").max(200),
    recipientEmail: z.string().trim().toLowerCase().email("Enter a valid email."),
    issuedOn: DATE,
    expiresOn: DATE.nullable().optional(),
    /** Save the row without anchoring it; "retry" issues it later. */
    draft: z.boolean().optional(),
  })
  .refine(
    (value) => !value.expiresOn || value.expiresOn > value.issuedOn,
    { message: "Expiry must be after the issue date.", path: ["expiresOn"] },
  );

export type IssueCertificateInput = z.infer<typeof issueCertificateSchema>;

export const revokeSchema = z.object({
  reason: z.string().trim().min(3, "Give a reason.").max(500),
});

export const renewSchema = z.object({
  expiresOn: DATE,
});

export const grantIssuerSchema = z.object({
  address: z
    .string()
    .trim()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Enter a valid wallet address."),
});

/** Course codes are part of the certificate hash, so keep them tidy and stable. */
export const courseCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    /^[A-Z0-9][A-Z0-9._-]{1,19}$/,
    "Use 2–20 letters, numbers, dots, dashes or underscores.",
  );

export const courseTitleSchema = z
  .string()
  .trim()
  .min(2, "Enter a course title.")
  .max(120, "Keep the title under 120 characters.");

export const createCourseSchema = z.object({
  code: courseCodeSchema,
  title: courseTitleSchema,
});

export const updateCourseSchema = z
  .object({
    code: courseCodeSchema.optional(),
    title: courseTitleSchema.optional(),
  })
  .refine((v) => v.code !== undefined || v.title !== undefined, {
    message: "Nothing to update.",
  });

export const signatorySchema = z.object({
  name: z.string().trim().min(2, "Enter the signatory's name.").max(80),
  title: z.string().trim().min(2, "Enter their title, e.g. Chairman.").max(80),
});

/** Signature images are small by design; they are embedded in every PDF. */
export const SIGNATURE_MAX_BYTES = 400 * 1024;

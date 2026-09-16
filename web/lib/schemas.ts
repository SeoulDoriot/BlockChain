import { z } from "zod";

const DATE = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD.");

export const issueCertificateSchema = z
  .object({
    courseId: z.string().uuid("Choose a course."),
    recipientName: z.string().trim().min(1, "Enter the recipient's name.").max(200),
    recipientEmail: z.string().trim().toLowerCase().email("Enter a valid email."),
    issuedOn: DATE,
    expiresOn: DATE.nullable().optional(),
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

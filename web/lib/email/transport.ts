import "server-only";

import nodemailer, { type Transporter } from "nodemailer";
import { serverEnv } from "@/lib/env.server";

/**
 * Nodemailer transport singleton.
 *
 * A Transporter holds a connection pool. Creating one per email would open a
 * fresh TCP + TLS handshake to the SMTP server every time, which is the
 * slowest part of sending.
 */
const globalForMail = globalThis as unknown as {
  __mailTransport?: Transporter;
};

export function getTransport(): Transporter {
  if (!globalForMail.__mailTransport) {
    // A local mail catcher (Mailpit, used by `supabase start`) accepts mail
    // without authentication and rejects the AUTH command outright, so skip
    // credentials there.
    const isLocalSmtp =
      serverEnv.SMTP_HOST === "127.0.0.1" || serverEnv.SMTP_HOST === "localhost";

    globalForMail.__mailTransport = nodemailer.createTransport({
      host: serverEnv.SMTP_HOST,
      port: serverEnv.SMTP_PORT,
      secure: serverEnv.SMTP_PORT === 465,
      ignoreTLS: isLocalSmtp,
      auth: isLocalSmtp
        ? undefined
        : {
            user: serverEnv.SMTP_USER,
            pass: serverEnv.SMTP_PASSWORD,
          },
      pool: true,
      maxConnections: 3,
    });
  }
  return globalForMail.__mailTransport;
}

import { cookies } from "next/headers";

/**
 * A tiny two-locale dictionary for the public pages.
 *
 * The locale lives in a cookie and is read on the server, so pages render in
 * the right language on the first paint — no flash of English, and no
 * translation bundle shipped to the browser.
 *
 * Only the public verification surface is translated: a member of the public
 * checking a certificate may well be a Khmer speaker, while the staff
 * dashboard is used by people who chose to work in English.
 */
export const LOCALES = ["en", "km"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_COOKIE = "locale";

export const DICTIONARY = {
  en: {
    localeName: "English",
    otherLocaleName: "ភាសាខ្មែរ",
    siteTitle: "Certificate verification",
    org: "Kirirom Institute of Technology",
    tagline:
      "Every certificate issued here is anchored on the Polygon blockchain. Change one character of a certificate and it stops verifying. Checking one is free and needs no account.",
    certificateId: "Certificate ID",
    certificateIdHint: "Printed on the certificate, under the QR code.",
    verify: "Verify",
    scanQr: "Scan a QR code",
    checkPdf: "Check a PDF for tampering",
    staffSignIn: "Staff sign in",
    verifyAnother: "← Verify another",
    verificationResult: "Verification result",
    certificate: "Certificate",
    blockchainRecord: "Blockchain record",
    recipient: "Recipient",
    course: "Course",
    issuedBy: "Issued by",
    issuedOn: "Issued on",
    expires: "Expires",
    doesNotExpire: "Does not expire",
    revocationReason: "Reason for revocation",
    anchoredHash: "Anchored hash",
    recomputedHash: "Recomputed hash",
    transaction: "Transaction",
    network: "Network",
    anchoredAt: "Anchored at",
    contract: "Contract",
    notAnchored: "Not anchored",
    match: "✓ match",
    mismatch: "✗ mismatch",
    tamperedWarning:
      "The details stored for this certificate no longer match the fingerprint recorded on the blockchain. It has been altered since it was issued.",
    noMatch:
      "No certificate matches this identifier. Check it was copied in full.",
    addToLinkedIn: "Add to LinkedIn profile",
    share: "Share",
    copy: "Copy link",
    copied: "Copied",
    status: {
      active: { label: "Valid", blurb: "This certificate is genuine and currently valid." },
      expired: { label: "Expired", blurb: "This certificate is genuine, but its validity period has ended." },
      revoked: { label: "Revoked", blurb: "This certificate was withdrawn by the issuing institution." },
      tampered: { label: "Tampered", blurb: "The certificate details do not match what was recorded on the blockchain." },
      not_found: { label: "Not found", blurb: "No certificate with this identifier has been issued." },
      draft: { label: "Not yet issued", blurb: "This certificate exists as a draft and has not been anchored." },
    },
  },
  km: {
    localeName: "ភាសាខ្មែរ",
    otherLocaleName: "English",
    siteTitle: "ការផ្ទៀងផ្ទាត់វិញ្ញាបនបត្រ",
    org: "វិទ្យាស្ថានបច្ចេកវិទ្យាគិរីរម្យ",
    tagline:
      "វិញ្ញាបនបត្រទាំងអស់ត្រូវបានកត់ត្រាលើប្លុកឆេន Polygon។ បើផ្លាស់ប្តូរតួអក្សរតែមួយ ការផ្ទៀងផ្ទាត់នឹងបរាជ័យ។ ការពិនិត្យគឺឥតគិតថ្លៃ និងមិនត្រូវការគណនីឡើយ។",
    certificateId: "លេខសម្គាល់វិញ្ញាបនបត្រ",
    certificateIdHint: "បោះពុម្ពនៅលើវិញ្ញាបនបត្រ ក្រោមកូដ QR។",
    verify: "ផ្ទៀងផ្ទាត់",
    scanQr: "ស្កេនកូដ QR",
    checkPdf: "ពិនិត្យឯកសារ PDF",
    staffSignIn: "បុគ្គលិកចូលប្រើ",
    verifyAnother: "← ផ្ទៀងផ្ទាត់មួយទៀត",
    verificationResult: "លទ្ធផលផ្ទៀងផ្ទាត់",
    certificate: "វិញ្ញាបនបត្រ",
    blockchainRecord: "កំណត់ត្រាប្លុកឆេន",
    recipient: "អ្នកទទួល",
    course: "វគ្គសិក្សា",
    issuedBy: "ចេញដោយ",
    issuedOn: "ចេញនៅថ្ងៃ",
    expires: "ផុតកំណត់",
    doesNotExpire: "មិនផុតកំណត់",
    revocationReason: "មូលហេតុនៃការដកហូត",
    anchoredHash: "សញ្ញាសម្គាល់ដែលបានកត់ត្រា",
    recomputedHash: "សញ្ញាសម្គាល់ដែលគណនាឡើងវិញ",
    transaction: "ប្រតិបត្តិការ",
    network: "បណ្តាញ",
    anchoredAt: "កត់ត្រានៅ",
    contract: "កិច្ចសន្យាឆ្លាតវៃ",
    notAnchored: "មិនទាន់កត់ត្រា",
    match: "✓ ត្រូវគ្នា",
    mismatch: "✗ មិនត្រូវគ្នា",
    tamperedWarning:
      "ព័ត៌មានរបស់វិញ្ញាបនបត្រនេះលែងត្រូវគ្នានឹងអ្វីដែលបានកត់ត្រាលើប្លុកឆេនទៀតហើយ។ វាត្រូវបានកែប្រែបន្ទាប់ពីការចេញ។",
    noMatch: "រកមិនឃើញវិញ្ញាបនបត្រតាមលេខសម្គាល់នេះទេ។ សូមពិនិត្យថាបានចម្លងពេញលេញ។",
    addToLinkedIn: "បញ្ចូលទៅ LinkedIn",
    share: "ចែករំលែក",
    copy: "ចម្លងតំណ",
    copied: "បានចម្លង",
    status: {
      active: { label: "ត្រឹមត្រូវ", blurb: "វិញ្ញាបនបត្រនេះពិតប្រាកដ និងនៅមានសុពលភាព។" },
      expired: { label: "ផុតកំណត់", blurb: "វិញ្ញាបនបត្រនេះពិតប្រាកដ ប៉ុន្តែអស់សុពលភាពហើយ។" },
      revoked: { label: "ត្រូវបានដកហូត", blurb: "វិញ្ញាបនបត្រនេះត្រូវបានដកហូតដោយស្ថាប័នចេញ។" },
      tampered: { label: "ត្រូវបានកែប្រែ", blurb: "ព័ត៌មានវិញ្ញាបនបត្រមិនត្រូវគ្នានឹងកំណត់ត្រាលើប្លុកឆេនទេ។" },
      not_found: { label: "រកមិនឃើញ", blurb: "គ្មានវិញ្ញាបនបត្រណាមួយដែលមានលេខសម្គាល់នេះទេ។" },
      draft: { label: "មិនទាន់ចេញ", blurb: "វិញ្ញាបនបត្រនេះនៅជាសេចក្តីព្រាង មិនទាន់កត់ត្រាទេ។" },
    },
  },
} as const;

export type Dictionary = (typeof DICTIONARY)["en"];

export function isLocale(value: string | undefined): value is Locale {
  return value === "en" || value === "km";
}

/** The visitor's locale, from the cookie. Defaults to English. */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : "en";
}

export async function getDictionary(): Promise<{ locale: Locale; t: Dictionary }> {
  const locale = await getLocale();
  return { locale, t: DICTIONARY[locale] as Dictionary };
}

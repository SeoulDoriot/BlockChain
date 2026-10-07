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
    idHint:
      "Enter the full 36-character ID, like 3f1a7b2c-8d4e-4f60-9a1b-2c3d4e5f6071, or paste the verify link. A shortened ID will not work.",
    orLabel: "or",
    trust1Title: "Tamper-evident",
    trust1Body: "Change a single character and verification fails.",
    trust2Title: "Publicly recorded",
    trust2Body: "A fingerprint is anchored on a public blockchain.",
    trust3Title: "No account needed",
    trust3Body: "Free for anyone to check, at any time.",
    privacyNote: "Only a fingerprint is recorded on the blockchain. Names and personal details never leave the issuer.",
    verifyHeading: "Verify a certificate",
    verifyDescription:
      "Check the authenticity of a digital certificate issued through our platform.",
    enterCertificateId: "Enter Certificate ID",
    trustNote: "Securely verified on blockchain.",
    heroTitle: "Certificates you can trust at a glance.",
    howTitle: "How it works",
    howToUse: "How to use",
    how1Title: "Issued",
    how1Body: "An organization issues a certificate and the recipient receives a PDF with a QR code.",
    how2Title: "Recorded",
    how2Body: "A fingerprint of the certificate is recorded on a public blockchain. No personal details are stored there.",
    how3Title: "Verified",
    how3Body: "Anyone can scan the QR code or enter the ID to confirm the certificate is genuine. No account needed.",
    certificateDetails: "Certificate",
    blockchainProof: "Blockchain Proof",
    issuingOrganization: "Issuing Organization",
    programLabel: "Certificate / Program",
    backHome: "Back to home",
    status: {
      active: { label: "Certificate verified", blurb: "This certificate is authentic and has been successfully verified." },
      expired: { label: "Certificate expired", blurb: "This certificate is authentic, but its validity period has ended." },
      revoked: { label: "Certificate revoked", blurb: "This certificate was withdrawn by the issuing organization." },
      tampered: { label: "Tampered", blurb: "The certificate details do not match what was recorded on the blockchain." },
      not_found: { label: "Not found", blurb: "No certificate with this identifier has been issued." },
      unrecorded: { label: "Not verified", blurb: "This certificate is in our records, but its fingerprint is not on the blockchain, so it cannot be confirmed as genuine." },
      unavailable: { label: "Can't verify right now", blurb: "We couldn't reach the blockchain to check this certificate. Please try again in a moment." },
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
    idHint:
      "សូមបញ្ចូលលេខសម្គាល់ពេញលេញ ៣៦ តួអក្សរ ដូចជា 3f1a7b2c-8d4e-4f60-9a1b-2c3d4e5f6071 ឬបិទភ្ជាប់តំណផ្ទៀងផ្ទាត់។ លេខសម្គាល់ខ្លីមិនអាចប្រើបានទេ។",
    orLabel: "ឬ",
    trust1Title: "ងាយបង្ហាញការកែប្រែ",
    trust1Body: "ប្តូរតួអក្សរតែមួយ ការផ្ទៀងផ្ទាត់នឹងបរាជ័យ។",
    trust2Title: "កត់ត្រាជាសាធារណៈ",
    trust2Body: "សញ្ញាសម្គាល់ត្រូវបានកត់ត្រាលើប្លុកឆេនសាធារណៈ។",
    trust3Title: "មិនត្រូវការគណនី",
    trust3Body: "ឥតគិតថ្លៃសម្រាប់អ្នកគ្រប់គ្នា គ្រប់ពេល។",
    privacyNote: "មានតែសញ្ញាសម្គាល់ប៉ុណ្ណោះដែលត្រូវបានកត់ត្រាលើប្លុកឆេន។ ឈ្មោះ និងព័ត៌មានផ្ទាល់ខ្លួនមិនដែលចេញពីស្ថាប័នឡើយ។",
    verifyHeading: "ផ្ទៀងផ្ទាត់វិញ្ញាបនបត្រ",
    verifyDescription:
      "ពិនិត្យភាពត្រឹមត្រូវនៃវិញ្ញាបនបត្រឌីជីថលដែលចេញតាមរយៈប្រព័ន្ធរបស់យើង។",
    enterCertificateId: "បញ្ចូលលេខសម្គាល់វិញ្ញាបនបត្រ",
    trustNote: "បានផ្ទៀងផ្ទាត់ដោយសុវត្ថិភាពលើប្លុកឆេន។",
    heroTitle: "វិញ្ញាបនបត្រដែលអ្នកអាចទុកចិត្តបានភ្លាមៗ។",
    howTitle: "របៀបដំណើរការ",
    howToUse: "របៀបប្រើប្រាស់",
    how1Title: "ចេញ",
    how1Body: "ស្ថាប័នចេញវិញ្ញាបនបត្រ ហើយអ្នកទទួលបានឯកសារ PDF ជាមួយកូដ QR។",
    how2Title: "កត់ត្រា",
    how2Body: "សញ្ញាសម្គាល់នៃវិញ្ញាបនបត្រត្រូវបានកត់ត្រាលើប្លុកឆេនសាធារណៈ ដោយគ្មានព័ត៌មានផ្ទាល់ខ្លួន។",
    how3Title: "ផ្ទៀងផ្ទាត់",
    how3Body: "អ្នកណាក៏អាចស្កេនកូដ QR ឬបញ្ចូលលេខសម្គាល់ ដើម្បីបញ្ជាក់ភាពពិត។ មិនត្រូវការគណនីទេ។",
    certificateDetails: "វិញ្ញាបនបត្រ",
    blockchainProof: "ភស្តុតាងប្លុកឆេន",
    issuingOrganization: "ស្ថាប័នចេញ",
    programLabel: "វិញ្ញាបនបត្រ / កម្មវិធី",
    backHome: "ត្រឡប់ទៅទំព័រដើម",
    status: {
      active: { label: "វិញ្ញាបនបត្រត្រូវបានផ្ទៀងផ្ទាត់", blurb: "វិញ្ញាបនបត្រនេះពិតប្រាកដ ហើយត្រូវបានផ្ទៀងផ្ទាត់ដោយជោគជ័យ។" },
      expired: { label: "ផុតកំណត់", blurb: "វិញ្ញាបនបត្រនេះពិតប្រាកដ ប៉ុន្តែអស់សុពលភាពហើយ។" },
      revoked: { label: "ត្រូវបានដកហូត", blurb: "វិញ្ញាបនបត្រនេះត្រូវបានដកហូតដោយស្ថាប័នចេញ។" },
      tampered: { label: "ត្រូវបានកែប្រែ", blurb: "ព័ត៌មានវិញ្ញាបនបត្រមិនត្រូវគ្នានឹងកំណត់ត្រាលើប្លុកឆេនទេ។" },
      not_found: { label: "រកមិនឃើញ", blurb: "គ្មានវិញ្ញាបនបត្រណាមួយដែលមានលេខសម្គាល់នេះទេ។" },
      unrecorded: { label: "មិនទាន់បានផ្ទៀងផ្ទាត់", blurb: "វិញ្ញាបនបត្រនេះមាននៅក្នុងកំណត់ត្រារបស់យើង ប៉ុន្តែសញ្ញាសម្គាល់របស់វាមិនមាននៅលើប្លុកឆេនទេ ដូច្នេះមិនអាចបញ្ជាក់ថាពិតប្រាកដបានឡើយ។" },
      unavailable: { label: "មិនអាចផ្ទៀងផ្ទាត់បានឥឡូវនេះ", blurb: "យើងមិនអាចភ្ជាប់ទៅប្លុកឆេនដើម្បីពិនិត្យវិញ្ញាបនបត្រនេះបានទេ។ សូមព្យាយាមម្តងទៀតបន្តិចទៀត។" },
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

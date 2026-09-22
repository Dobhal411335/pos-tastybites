import { cache } from "react";
import connectDB from "@/lib/db";
import CompanyBasicInfo from "@/models/Web/CompanyBasicInfo";

const FALLBACK_METADATA = {
  siteName: "Example Company",
  title: "",
  description: "",
  ogDescription: "",
  keywords: [],
  domain: process.env.NEXT_PUBLIC_SITE_URL,
  ogImage: "",
};

function serializeImage(image) {
  return {
    url: image?.url || "",
    key: image?.key || "",
  };
}

function serializeCompanyBasicInfo(record) {
  if (!record) return null;

  return {
    _id: String(record._id),
    id: String(record._id),
    companyName: record.companyName || "",
    companyDomainName: record.companyDomainName || "",
    contactNumbers: Array.isArray(record.contactNumbers)
      ? record.contactNumbers.filter(Boolean)
      : [],
    whatsappNumber: record.whatsappNumber || "",
    mainLogo: serializeImage(record.mainLogo),
    footerLogo: serializeImage(record.footerLogo),
    mobileUiLogo: serializeImage(record.mobileUiLogo),
    emails: Array.isArray(record.emails) ? record.emails.filter(Boolean) : [],
    officeAddresses: Array.isArray(record.officeAddresses)
      ? record.officeAddresses.filter(Boolean)
      : [],
    googleAddress: record.googleAddress || "",
    googleUrl: record.googleUrl || "",
    googleLink: record.googleLink || "",
    facebookLink: record.facebookLink || "",
    instagramLink: record.instagramLink || "",
    youtubeLink: record.youtubeLink || "",
    googleMapLink: record.googleMapLink || "",
    googleTrackingTag: record.googleTrackingTag || "",
    titleTagForMainLandingPage: record.titleTagForMainLandingPage || "",
    keywords: Array.isArray(record.keywords)
      ? record.keywords.filter(Boolean)
      : [],
  };
}

function normalizeSiteUrl(domainName) {
  const value = String(domainName || "").trim();
  if (!value) return FALLBACK_METADATA.domain;

  if (/^https?:\/\//i.test(value)) {
    return value.replace(/\/$/, "");
  }

  return `https://${value.replace(/\/$/, "")}`;
}

export const getCompanyBasicInfo = cache(async () => {
  try {
    await connectDB();
    const record = await CompanyBasicInfo.findOne()
      .sort({ updatedAt: -1 })
      .lean();
    return serializeCompanyBasicInfo(record);
  } catch (error) {
    console.error("Failed to load company basic info:", error);
    return null;
  }
});

export function buildCompanyMetadata(company) {
  const siteName = company?.companyName || FALLBACK_METADATA.siteName;
  const title = company?.titleTagForMainLandingPage || FALLBACK_METADATA.title;
  const keywords =
    company?.keywords?.length > 0
      ? company.keywords
      : FALLBACK_METADATA.keywords;
  const siteUrl = normalizeSiteUrl(company?.companyDomainName);
  const ogImage = company?.mainLogo?.url || FALLBACK_METADATA.ogImage;

  let metadataBase;
  try {
    metadataBase = new URL(siteUrl);
  } catch {
    metadataBase = new URL(FALLBACK_METADATA.domain);
  }

  return {
    metadataBase,
    title: {
      default: title,
      template: `%s | ${siteName}`,
    },
    description: FALLBACK_METADATA.description,
    keywords,
    icons: {
      icon: [
        { url: "/favicon.ico" },
        {
          url: "/favicon-16x16.png",
          sizes: "16x16",
          type: "image/png",
        },
        {
          url: "/favicon-32x32.png",
          sizes: "32x32",
          type: "image/png",
        },
      ],
      apple: "/apple-touch-icon.png",
    },
    manifest: "/site.webmanifest",
    openGraph: {
      title,
      description: FALLBACK_METADATA.ogDescription,
      images: [ogImage],
      url: siteUrl,
      siteName,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: FALLBACK_METADATA.description,
      images: [ogImage],
    },
    authors: [{ name: siteName }],
    robots: {
      index: true,
      follow: true,
    },
  };
}

export { FALLBACK_METADATA };

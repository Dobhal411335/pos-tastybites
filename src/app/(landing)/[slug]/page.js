import connectDB from "@/lib/db";
import Webpage from "@/models/Web/Webpage";
import WebPage from "@/components/Web/Webpage";
import { getCompanyBasicInfo } from "@/components/services/companyBasicInfo.service.js";

function serializeData(data) {
  if (!data) return null;
  return JSON.parse(JSON.stringify(data));
}

function stripText(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildWebpageDescription(webpage) {
  const candidates = [
    webpage?.firstTitle,
    webpage?.secondTitle,
    webpage?.design5MainHeading,
    webpage?.design6MainHeading,
    webpage?.design6SubHeading,
    webpage?.design7MainHeading,
    webpage?.design8Description,
    webpage?.design9Description,
    webpage?.blockquoteDescription,
    webpage?.paragraphSections?.[0]?.description,
    webpage?.paragraphSections?.[0]?.title,
  ];

  for (const candidate of candidates) {
    const text = stripText(candidate);
    if (text) return text.slice(0, 160);
  }

  return "";
}

function getWebpageOgImage(webpage, company) {
  return (
    webpage?.bannerImage?.url ||
    webpage?.imageFirst?.url ||
    webpage?.bannerImageMobile?.url ||
    webpage?.imageFirstMobile?.url ||
    company?.mainLogo?.url ||
    ""
  );
}

async function getWebpageBySlug(slug) {
  try {
    await connectDB();
    const webpage = await Webpage.findOne({
      slug: decodeURIComponent(slug).toLowerCase(),
      active: true,
    }).lean();
    return serializeData(webpage);
  } catch (error) {
    console.error("Failed to fetch webpage:", error);
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const webpage = await getWebpageBySlug(slug);
  const company = await getCompanyBasicInfo();

  if (!webpage) {
    return { title: "Page" };
  }

  const title = webpage.titleLine || webpage.title || "Page";
  const description = buildWebpageDescription(webpage);
  const keywords = Array.isArray(webpage.keywords)
    ? webpage.keywords.filter(Boolean)
    : [];
  const ogImage = getWebpageOgImage(webpage, company);
  const siteName = company?.companyName || "";
  const pageUrl = `/${webpage.slug || slug}`;

  return {
    title,
    description,
    ...(keywords.length > 0 ? { keywords } : {}),
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName,
      type: "website",
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export default async function ActivityPage({ params }) {
  const { slug } = await params;
  const data = await getWebpageBySlug(slug);
  if (!data) return <div>Page Not found</div>;
  return <WebPage data={data} />;
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  Globe,
  Link as LinkIcon,
  Quote,
  Share2,
} from "lucide-react";
import { FaFacebook, FaInstagram, FaLinkedin } from "react-icons/fa";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { toast } from "sonner";

const isFilledText = (value) => typeof value === "string" && value.replace(/<[^>]*>/g, "").trim().length > 0;

const cleanTextArray = (items = []) => items.filter((item) => isFilledText(item));

const cleanObjectArray = (items = [], keys = []) =>
  items.filter((item) => keys.some((key) => isFilledText(item?.[key])));

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const HtmlBlock = ({ html, className = "" }) => {
  if (!isFilledText(html)) return null;
  return (
    <div
      className={`prose prose-sm max-w-none leading-6 text-lg ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

const StaticSidebarCard = ({ data }) => {
  const adImage = data.advertisementImage?.url;
  const adUrl = data.advertisementUrl;

  if (adImage) {
    const card = (
      <div className="overflow-hidden h-fit bg-white">
        <img src={adImage} alt={data.title || "Advertisement"} className="h-full w-full object-contain" />
      </div>
    );

    if (adUrl) {
      return (
        <a href={adUrl} target="_blank" rel="noreferrer" className="block transition hover:opacity-95">
          {card}
        </a>
      );
    }

    return card;
  }

};

const AuthorCard = ({ data }) => {
  const authorName = data.sideThumbName || "";
  const authorRole = data.sideThumbDesignation || "";
  const authorDescription = data.sideThumbDescription || "";
  const authorImage = data.sideThumbImage?.url || data.mainProfileImage?.url || data.bannerImage?.url;
  const socials = [
    data.facebookUrl ? { href: data.facebookUrl, label: "Facebook", icon: FaFacebook } : null,
    data.instaUrl ? { href: data.instaUrl, label: "Instagram", icon: FaInstagram } : null,
    data.youtubeUrl ? { href: data.youtubeUrl, label: "Website", icon: Globe } : null,
    data.googleUrl ? { href: data.googleUrl, label: "LinkedIn", icon: FaLinkedin } : null,
  ].filter(Boolean);

  return (
    <div className="rounded-md border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-400">About</p>
      <div className="mt-4 flex items-start gap-3">
        {authorImage ? (
          <img src={authorImage} alt={authorName} className="h-12 w-12 rounded-full object-cover" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ebe7ff] text-base font-bold text-[#4f46e5]">
            {authorName.charAt(0)}
          </div>
        )}
        <div>
          <h3 className="font-semibold text-gray-900">{authorName}</h3>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">{authorRole}</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-gray-600">
        {authorDescription}
      </p>
      <div className="mt-5 flex items-center gap-3">
        {socials.length > 0 ? (
          socials.map(({ href, label, icon: Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:border-[#4f46e5] hover:text-[#4f46e5]"
              aria-label={label}
            >
              <Icon className="h-4 w-4" />
            </a>
          ))
        ) : (
          <>
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-600"><Globe className="h-4 w-4" /></span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-600"><FaInstagram className="h-4 w-4" /></span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-600"><FaLinkedin className="h-4 w-4" /></span>
          </>
        )}
      </div>
    </div>
  );
};

const ShareCard = ({ slug }) => {
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/${slug}` : "";

  const sharePage = async () => {
    if (!shareUrl) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Kag Premium Homes Webpage",
          url: shareUrl,
        });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied for sharing");
    } catch (error) {
      if (error?.name !== "AbortError") {
        toast.error("Unable to share this page");
      }
    }
  };

  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-gray-900">Share this package</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <button
          onClick={sharePage}
          className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700"
        >
          <Share2 className="h-4 w-4" />
          Share
        </button>
        <button
          onClick={copyLink}
          className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-2 py-3 text-sm font-medium text-gray-700"
        >
          <LinkIcon className="h-4 w-4" />
          Copy Link
        </button>
      </div>
    </div>
  );
};

const PopularDestinations = () => {
  const [hotels, setHotels] = useState([]);
  const [hotelCategories, setHotelCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [hotelsLoading, setHotelsLoading] = useState(true);

  useEffect(() => {
    const fetchHotels = async () => {
      setHotelsLoading(true);
      try {
        const [hotelsRes, catsRes] = await Promise.all([
          fetch("/api/property/createHotel"),
          fetch("/api/property/hotelCategory"),
        ]);
        const hotelsData = await hotelsRes.json();
        const catsData = await catsRes.json();
        setHotels(Array.isArray(hotelsData) ? hotelsData : []);
        setHotelCategories(Array.isArray(catsData) ? catsData : []);
      } catch {
        setHotels([]);
        setHotelCategories([]);
      } finally {
        setHotelsLoading(false);
      }
    };

    // fetchHotels();
  }, []);

  const filteredHotels =
    activeCategory === "All" ? hotels : hotels.filter((hotel) => hotel.category === activeCategory);

  return (
    <>
      {(filteredHotels.length > 0 || hotelsLoading) && (
        <section className="w-full border-t border-[#ece7df] bg-white px-2 py-10 md:px-20">
          <h2 className="font-recoleta text-2xl font-bold text-gray-900 md:text-3xl">
            Your style. These stays. A perfect match.
          </h2>
          <p className="mb-5 mt-1 font-sans text-sm text-gray-500">
            Handpicked Popular Destination curated just for you
          </p>

          <div className="mb-6 flex gap-5 overflow-x-auto border-b border-gray-200">
            <button
              onClick={() => setActiveCategory("All")}
              className={`whitespace-nowrap border-b-2 pb-2.5 px-1 text-sm font-medium transition-colors ${activeCategory === "All"
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
            >
              All
            </button>
            {hotelCategories.map((cat, key) => (
              <button
                key={cat._id || key}
                onClick={() => setActiveCategory(cat.name)}
                className={`whitespace-nowrap border-b-2 pb-2.5 px-1 text-sm font-medium transition-colors ${activeCategory === cat.name
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {hotelsLoading ? (
            <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="mb-3 h-48 w-full rounded-xl bg-gray-200" />
                  <div className="mb-2 h-4 w-3/4 rounded bg-gray-200" />
                  <div className="h-3 w-1/2 rounded bg-gray-200" />
                </div>
              ))}
            </div>
          ) : filteredHotels.length > 0 ? (
            <Carousel className="w-full" opts={{ align: "start" }}>
              <CarouselContent className="-ml-3">
                {filteredHotels.map((hotel) => (
                  <CarouselItem key={hotel._id} className="pl-3 md:basis-1/4">
                    <Link
                      href={hotel.imageClickLink || "#"}
                      target={hotel.imageClickLink ? "_blank" : "_self"}
                      rel="noopener noreferrer"
                      className="group block cursor-pointer"
                    >
                      <div className="relative mb-3 md:h-60 h-80 w-full overflow-hidden rounded-xl">
                        {hotel.image?.url ? (
                          <img
                            src={hotel.image.url}
                            alt={hotel.name}
                            className="h-full w-full object-contain md:object-contain transition-transform duration-500 group-hover:scale-110"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
                            No Image
                          </div>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 md:text-base">{hotel.name}</h3>
                      <p className="text-xs text-gray-500 md:text-sm">{hotel.location}</p>
                    </Link>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="!-left-3 !top-1/3 z-10 !-translate-y-1/2 rounded-full bg-white/90 shadow-md hover:bg-white" />
              <CarouselNext className="!-right-3 !top-1/3 z-10 !-translate-y-1/2 rounded-full bg-white/90 shadow-md hover:bg-white" />
            </Carousel>
          ) : (
            <p className="py-8 text-center text-gray-400">No popular destinations found in this category.</p>
          )}
        </section>
      )}
    </>
  );
};

const WebPage = ({ data }) => {
  // console.log(data)
  const [openAccordion, setOpenAccordion] = useState(0);
  const isDesignTwo = data.templateType === "design1";
  const isDesignThree = data.templateType === "design3";

  const tags = useMemo(() => cleanTextArray(data.createTags), [data.createTags]);
  const paragraphs = useMemo(
    () => cleanObjectArray(data.paragraphSections, ["title", "description"]),
    [data.paragraphSections]
  );
  const tableRows = useMemo(() => cleanObjectArray(data.tableRows, ["column1", "column2"]), [data.tableRows]);
  const highlights = useMemo(() => cleanObjectArray(data.highlights, ["title", "point"]), [data.highlights]);
  const accordionItems = useMemo(
    () => cleanObjectArray(data.accordionTags, ["left", "right"]),
    [data.accordionTags]
  );
  const blockquoteTags = useMemo(() => cleanTextArray(data.blockquoteTags), [data.blockquoteTags]);

  const paragraphImages = [data.paragraphFirstImage?.url, data.paragraphSecondImage?.url].filter(Boolean);
  const getSectionImages = (section) => {
    const sectionImages = [section?.firstImage?.url, section?.secondImage?.url].filter(Boolean);
    return sectionImages.length > 0 ? sectionImages : paragraphImages;
  };
  const hasTopMetaContent =
    isFilledText(data.firstTitle) ||
    isFilledText(data.secondTitle) ||
    tags.length > 0;
  const hasMainTopImage = !!data.imageFirst?.url;
  const hasTopHeaderContent = hasTopMetaContent || hasMainTopImage;
  const isBannerOnlyTop = !isDesignThree && !!data.bannerImage?.url && !hasTopHeaderContent;
  const headerImage = data.imageFirst?.url || paragraphImages[0] || data.sideThumbImage?.url;
  const leadParagraph = isDesignTwo ? paragraphs[0] : null;
  const contentParagraphs = isDesignTwo ? paragraphs.slice(1) : paragraphs;
  const designOneLeadParagraph = !isDesignTwo && !isDesignThree ? paragraphs[0] : null;
  const leadParagraphImages = leadParagraph ? getSectionImages(leadParagraph) : paragraphImages;
  const designOneLeadParagraphImages = designOneLeadParagraph ? getSectionImages(designOneLeadParagraph) : paragraphImages;
  const designOneRemainingParagraphs = !isDesignTwo && !isDesignThree ? paragraphs.slice(1) : contentParagraphs;
  const designThreeHeroImages = [
    data.imageFirst?.url,
    data.mainProfileImage?.url,
    data.bannerImage?.url,
    ...(data.imageGallery || []).map((item) => item?.url).filter(Boolean),
  ].filter(Boolean).slice(0, 3);
  const introHighlight = isDesignThree ? highlights[0] : null;
  const remainingHighlights = isDesignThree ? highlights.slice(1) : highlights;
  const isDesignFour = data.templateType === "design4";
  const isDesignFive = data.templateType === "design5";
  const isDesignSix = data.templateType === "design6";
  const isDesignSeven = data.templateType === "design7";

  if (isDesignFour) {
    const design4Paragraph = paragraphs[0] || {};
    const design4Images = getSectionImages(design4Paragraph);
    return (
      <div className="min-h-screen bg-[#fcfcfc] font-geist text-gray-900">
        {/* Top Banner */}
        <div
          className="relative h-[250px] md:h-100 w-full bg-cover bg-center flex items-end pb-10 pl-6 md:pl-20"
          style={{ backgroundImage: `url(${data.bannerImage?.url || data.imageFirst?.url || ''})` }}
        >
          <div className="absolute inset-0 bg-black/5"></div>
          <div className="relative z-10 text-white">
            <h1 className="text-4xl md:text-5xl font-bold mb-2">{data.secondTitle || ""}</h1>
            <p className="text-md md:text-lg font-semibold">Home : {data.firstTitle || ""}</p>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10">

          {/* Left Column */}
          <div className="space-y-8 border-r border-gray-900 px-5">
            {/* Heading & Paragraph */}
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">{design4Paragraph.title}</h2>
              <HtmlBlock html={design4Paragraph.description} className="text-gray-600 mb-6" />

              {/* Bullet Points */}
              {design4Paragraph.bulletPoints?.length > 0 && (
                <ul className="space-y-3 mt-4">
                  {design4Paragraph.bulletPoints.map((point, idx) => (
                    isFilledText(point) && (
                      <li key={idx} className="flex gap-3 text-gray-600">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                        <span dangerouslySetInnerHTML={{ __html: point }}></span>
                      </li>
                    )
                  ))}
                </ul>
              )}
            </div>

            {/* Notices */}
            {data.notices?.length > 0 && (
              <div className="space-y-4">
                {data.notices.map((notice, idx) => {
                  const getNoticeStyles = (type) => {
                    switch (type) {
                      case 'warning': return 'border-orange-200 bg-orange-50 text-orange-800';
                      case 'info': return 'border-blue-200 bg-blue-50 text-blue-800';
                      case 'danger': return 'border-red-200 bg-red-50 text-red-800';
                      case 'success': return 'border-green-200 bg-green-50 text-green-800';
                      default: return 'border-orange-200 bg-orange-50 text-orange-800';
                    }
                  };
                  return (
                    <div key={idx} className={`border rounded-md p-4 text-sm font-medium ${getNoticeStyles(notice.type)}`}>
                      <span className="mr-2 text-lg">⚠</span>
                      {notice.title && <strong>{notice.title} - </strong>}
                      <span>{notice.description}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quote Block */}
            {(isFilledText(data.blockquoteDescription) || isFilledText(data.blockquoteLeftTitle)) && (
              <div className="flex flex-col items-center text-center mt-10">
                <div className="bg-[#4c4489] text-white p-3 rounded-full mb-4">
                  <Quote className="h-6 w-6" />
                </div>
                <div className="text-gray-700 max-w-2xl text-lg mb-4">
                  <HtmlBlock html={data.blockquoteDescription} />
                </div>
                {isFilledText(data.blockquoteLeftTitle) && (
                  <div className="flex items-center gap-4 text-sm font-bold text-gray-900 mt-2">
                    <span className="h-px w-8 bg-gray-300"></span>
                    {data.blockquoteLeftTitle}
                  </div>
                )}
              </div>
            )}

            {/* Bold Paragraph */}
            {isFilledText(data.boldParagraph) && (
              <p className="font-bold text-gray-900 text-base md:text-lg leading-relaxed mt-8">
                {data.boldParagraph}
              </p>
            )}

            {/* Table Data */}
            {tableRows.length > 0 && (
              <div className="mt-8 border-t border-[#ece7df]">
                <table className="w-full text-left text-sm">
                  <tbody>
                    {tableRows.map((row, index) => (
                      <tr key={index} className="border-b border-[#ece7df]">
                        <td className="w-1/3 py-4 pr-4 font-semibold text-gray-700 border-r border-[#ece7df] align-top">
                          {row.column1}
                        </td>
                        <td className="w-2/3 py-4 pl-4 text-gray-600 align-top">
                          {row.column2}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Images */}
            {design4Images.map((imgUrl, idx) => (
              <img key={idx} src={imgUrl} alt={`Section Image ${idx + 1}`} className="w-full h-auto object-cover rounded-md" />
            ))}

            {data.advertisementImage?.url && (
              <img src={data.advertisementImage.url} alt="Advertisement" className="w-full h-auto object-cover rounded-md mt-4" />
            )}

            {/* Search Location Table */}
            {data.searchLocations?.length > 0 && (
              <div className="mt-8">
                <h3 className="font-bold text-gray-900 text-lg mb-2">Search Location</h3>
                <div className="bg-white border-t border-black border-b">
                  <div className="flex justify-between items-center border-b border-black px-2 py-2 text-xs font-bold text-black">
                    <span>Location 1</span>
                    <span>Total Count &gt;</span>
                  </div>
                  {data.searchLocations.map((loc, idx) => (
                    <div key={idx} className="flex justify-between items-center border-b border-gray-300 last:border-b-0 px-2 py-2 text-xs font-semibold text-black">
                      <span>{loc.locationName}</span>
                      <span className="flex items-center gap-4">
                        {loc.count} <span className="text-gray-500 font-normal">&gt;</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* <PopularDestinations /> */}
      </div>
    );
  }

  if (isDesignFive) {
    return (
      <div className="min-h-screen bg-[#f9f9f9] font-geist text-gray-900">
        {/* Top Banner */}
        <div
          className="relative h-[250px] md:h-100 w-full bg-cover bg-center flex items-end pb-10 pl-6 md:pl-20"
          style={{ backgroundImage: `url(${data.bannerImage?.url || data.imageFirst?.url || ''})` }}
        >
          <div className="absolute inset-0 bg-black/40"></div>
          <div className="relative z-10 text-white">
            <h1 className="text-4xl md:text-5xl font-bold mb-2">{data.secondTitle || ""}</h1>
            <p className="text-md md:text-lg font-semibold">{data.firstTitle || ""}</p>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">

          {/* Top Text Section */}
          <div className="mb-12 max-w-3xl">
            {isFilledText(data.design5Chip) && (
              <div className="inline-block border border-gray-400 rounded-full px-4 py-1 text-sm font-medium text-gray-600 mb-6">
                {data.design5Chip}
              </div>
            )}

            {isFilledText(data.design5MainHeading) && (
              <h2 className="text-2xl md:text-4xl font-serif text-gray-800 leading-snug">
                {data.design5MainHeading}
              </h2>
            )}
          </div>

          {/* Grid Cards Section */}
          {data.gridCards?.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
              {data.gridCards.map((card, idx) => (
                <div key={idx} className="group flex flex-col cursor-pointer">
                  <div className="w-full h-64 md:h-80 overflow-hidden mb-6">
                    {card.image?.url ? (
                      <img
                        src={card.image.url}
                        alt={card.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
                        No Image
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-start">
                    <div>
                      {isFilledText(card.chipName) && (
                        <div className="inline-block border border-gray-400 rounded-full px-3 py-0.5 text-xs font-medium text-gray-600 mb-4">
                          {card.chipName}
                        </div>
                      )}

                      <h3 className="text-xl md:text-2xl font-semibold text-gray-800">
                        {card.title}
                      </h3>
                    </div>

                    {isFilledText(card.link) && (
                      <a href={card.link} className="flex items-center gap-1 text-sm font-semibold text-gray-700 hover:text-black mt-2">
                        Explore More
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* <PopularDestinations /> */}
      </div>
    );
  }

  if (isDesignSix) {
    return (
      <div className="min-h-screen bg-[#f9f9f9] font-geist text-gray-900">
        {/* Top Banner */}
        <div
          className="relative h-[250px] md:h-100 w-full bg-cover bg-center flex items-end pb-10 pl-6 md:pl-20"
          style={{ backgroundImage: `url(${data.bannerImage?.url || data.imageFirst?.url || ''})` }}
        >
          <div className="absolute inset-0 bg-black/5"></div>
          <div className="relative z-10 text-white">
            <h1 className="text-4xl md:text-5xl font-bold mb-2">{data.secondTitle || ""}</h1>
            <p className="text-md md:text-lg font-semibold">{data.firstTitle | ""}</p>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">

          {/* Top Section */}
          <div className="mb-12 max-w-7xl">
            <div className="flex justify-between items-start mb-6">
              {isFilledText(data.design6Chip) && (
                <div className="inline-block border border-gray-400 rounded-full px-4 py-1 text-sm font-medium text-gray-600">
                  {data.design6Chip}
                </div>
              )}
              {isFilledText(data.design6ExploreLink) && (
                <a href={data.design6ExploreLink} className="flex items-center gap-1 text-sm font-semibold text-gray-700 hover:text-black border border-gray-200 px-4 py-1 rounded-md">
                  Explore Area
                  <svg className="w-4 h-4 ml-1 transform -rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </a>
              )}
            </div>

            {isFilledText(data.design6MainHeading) && (
              <h2 className="text-3xl md:text-5xl font-serif text-gray-800 leading-tight mb-6">
                {data.design6MainHeading}
              </h2>
            )}

            {isFilledText(data.design6SubHeading) && (
              <p className="text-gray-600 text-lg md:text-xl leading-relaxed mb-8 max-w-3xl">
                {data.design6SubHeading}
              </p>
            )}

            {isFilledText(data.design6Author) && (
              <p className="text-sm font-medium text-gray-800">
                {data.design6Author}
              </p>
            )}
          </div>

          <hr className="my-10 border-gray-300" />

          {/* Mid Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
            {isFilledText(data.design6MidHeading) && (
              <h2 className="text-2xl md:text-4xl font-serif text-gray-800 leading-snug max-w-2xl">
                {data.design6MidHeading}
              </h2>
            )}
            {isFilledText(data.design6MidLink) && (
              <a href={data.design6MidLink} className="bg-[#3b438c] text-white px-6 py-2 rounded-sm text-sm font-semibold hover:bg-opacity-90 flex items-center gap-2">
                Explore People
                <svg className="w-4 h-4 transform -rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
            )}
          </div>

          {/* Team Cards Grid */}
          {data.teamCards?.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {data.teamCards.map((card, idx) => (
                <div key={idx} className="bg-white border border-gray-200 rounded-sm overflow-hidden flex flex-col">
                  <div className="w-full aspect-[4/5] overflow-hidden bg-gray-100 hover:scale-105 duration-300 ease-in-out">
                    {card.image?.url ? (
                      <img
                        src={card.image.url}
                        alt={card.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        No Image
                      </div>
                    )}
                  </div>

                  <div className="p-4 flex-grow flex flex-col justify-center text-start items-start">
                    <h3 className="text-lg font-bold text-gray-800 mb-1">
                      {card.name}
                    </h3>
                    {isFilledText(card.designation) && (
                      <p className="text-xs text-gray-500 font-medium">
                        {card.designation}
                      </p>
                    )}
                  </div>

                  <div className="bg-gray-50 px-4 py-3 flex justify-between items-center border-t border-gray-200">
                    {isFilledText(card.phone) ? (
                      <a href={`tel:${card.phone.replace(/[^0-9+]/g, '')}`} className="flex items-center gap-2 text-sm font-bold text-gray-700 hover:text-black">
                        <svg className="w-6 h-6 bg-blue-100 text-blue-800 p-1 rounded-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {card.phone}
                      </a>
                    ) : (
                      <div></div>
                    )}

                    <div className="flex gap-2">
                      {isFilledText(card.facebook) && (
                        <a href={card.facebook} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-600">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                            <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                          </svg>
                        </a>
                      )}
                      {isFilledText(card.instagram) && (
                        <a href={card.instagram} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-pink-600">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                            <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                          </svg>
                        </a>
                      )}
                      {isFilledText(card.youtube) && (
                        <a href={card.youtube} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-red-600">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                            <path fillRule="evenodd" d="M21.582 6.186a2.686 2.686 0 00-1.884-1.895C17.986 3.84 12 3.84 12 3.84s-5.986 0-7.698.451a2.686 2.686 0 00-1.884 1.895C2 7.897 2 12 2 12s0 4.103.418 5.814a2.686 2.686 0 001.884 1.895C6.014 20.16 12 20.16 12 20.16s5.986 0 7.698-.451a2.686 2.686 0 001.884-1.895C22 16.103 22 12 22 12s0-4.103-.418-5.814zM9.953 15.228V8.772l5.518 3.228-5.518 3.228z" clipRule="evenodd" />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* <PopularDestinations /> */}
      </div>
    );
  }

  if (isDesignSeven) {
    return (
      <div className="min-h-screen bg-[#fcfaf7] font-geist text-gray-900">
        {/* Top Banner */}
        <div
          className="relative h-[250px] md:h-100 w-full bg-cover bg-center flex items-end pb-10 pl-6 md:pl-20"
          style={{ backgroundImage: `url(${data.bannerImage?.url || data.imageFirst?.url || ''})` }}
        >
          <div className="absolute inset-0 bg-black/40"></div>
          <div className="relative z-10 text-white">
            <h1 className="text-4xl md:text-5xl font-bold mb-2">{data.secondTitle || ""}</h1>
            <p className="text-md md:text-lg font-semibold">{data.firstTitle || ""}</p>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">

          {/* Top Section */}
          <div className="mb-12 max-w-7xl">
            <div className="flex justify-between items-start mb-6">
              {isFilledText(data.design7Chip) && (
                <div className="inline-block border border-gray-400 rounded-full px-4 py-1 text-sm font-medium text-gray-600">
                  {data.design7Chip}
                </div>
              )}
              {isFilledText(data.design7ExploreLink) && (
                <a href={data.design7ExploreLink} className="flex items-center gap-1 text-sm font-semibold text-gray-700 hover:text-black border border-gray-200 px-4 py-1 rounded-md">
                  Explore Area
                  <svg className="w-4 h-4 ml-1 transform -rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </a>
              )}
            </div>

            {isFilledText(data.design7MainHeading) && (
              <h2 className="text-3xl md:text-5xl font-serif text-gray-800 leading-tight mb-6 max-w-3xl">
                {data.design7MainHeading}
              </h2>
            )}

            <hr className="my-10 border-gray-300" />

          </div>

          {/* Gallery Grid */}
          {data.gridCards?.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {data.gridCards.map((card, idx) => (
                <div key={idx} className="relative group overflow-hidden bg-gray-100 aspect-square">
                  {card.image?.url ? (
                    <img
                      src={card.image.url}
                      alt={card.title}
                      className="w-full h-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No Image
                    </div>
                  )}

                  {/* Hover Overlay Box */}
                  <div className="absolute bottom-0 left-0 w-[90%] bg-white p-5 transform translate-y-[100%] transition-transform duration-500 ease-in-out group-hover:translate-y-0 shadow-lg">
                    {isFilledText(card.chipName) && (
                      <div className="inline-block border border-gray-400 rounded-full px-3 py-0.5 text-xs font-medium text-gray-600 mb-2">
                        {card.chipName}
                      </div>
                    )}
                    {isFilledText(card.title) && (
                      <a href={(card.gallerySlug ? `/gallery/${card.gallerySlug}` : '#')} className="block text-lg font-serif text-[#3b438c] hover:text-black">
                        {card.title}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* <PopularDestinations /> */}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-geist font-semibold text-gray-900">
      <div className={`w-full border-b border-[#ece7df] ${!isDesignThree ? "bg-[#efefef]" : "bg-[#f7f3ed]"}`}>
        <div className="mx-auto max-w-7xl md:px-4 md:py-5 sm:px-6 lg:px-8">
          <div className={`grid gap-2 ${isDesignThree ? "grid-cols-1" : isBannerOnlyTop ? "grid-cols-1" : "lg:grid-cols-[520px_minmax(0,1fr)] lg:items-center"}`}>
            {isDesignThree ? (
              <div className="flex items-center">
                {designThreeHeroImages[0] && (
                  <img src={designThreeHeroImages[0]} alt={data.title} className="md:h-[350px] w-full object-contain" />
                )}
              </div>
            ) : isBannerOnlyTop ? (
              <div className="overflow-hidden">
                <img src={data.bannerImage.url} alt={data.title} className="h-[240px] md:h-[350px] w-full object-cover" />
              </div>
            ) : (
              <div className="overflow-hidden">
                {headerImage && (
                  <img src={headerImage} alt={data.title} className="h-[220px] w-full object-contain md:h-[250px]" />
                )}
              </div>
            )}
            {!isDesignThree && (
              <div className="px-5 md:px-2 py-2 md:py-0">
                {isFilledText(data.firstTitle) && (
                  <span className="hidden text-md my-3 font-medium text-gray-600 md:block">{data.firstTitle}</span>
                )}
                <h1 className="max-w-4xl text-2xl font-geist font-semibold leading-[1.05] tracking-tight text-black sm:text-5xl">
                  {data.title}
                </h1>
                {isFilledText(data.secondTitle) && (
                  <p className="mt-2 max-w-3xl text-md leading-8 text-gray-700">{data.secondTitle}</p>
                )}
                {tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {tags.map((tag, idx) => (
                      <span
                        key={tag + idx}
                        className="rounded-md border border-[#d4d4d4] bg-[#efefef] px-2 py-1 text-sm font-medium text-black"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-7 flex flex-wrap items-center gap-4 text-md text-black">
                  <div className="flex items-center gap-4">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e8e4ff] text-sm font-bold text-[#4f46e5]">
                      {(data.sideThumbName || "E").charAt(0)}
                    </span>
                    <span className="text-sm">{data.sideThumbName || "Editorial Team"}</span>
                  </div>
                  <span className="h-6 w-px bg-gray-400" />
                  <span className="text-sm">{formatDate(data.updatedAt || data.createdAt) || ""}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="mx-auto w-full md:max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
        <div className=" bg-white">
          {isDesignThree && (
            <section className="grid gap-6 py-4 md:px-5 md:py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">{data.title}</h1>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                  <span>{data.postedBy?.admin ? "By Admin" : data.sideThumbName || "By Admin"}</span>
                  <span className="h-1 w-1 rounded-full bg-gray-300" />
                  <span>{formatDate(data.updatedAt || data.createdAt) || ""}</span>
                </div>
                {tags.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {tags.map((tag, idx) => (
                      <span
                        key={tag + idx}
                        className="rounded-full border border-[#e3dbe8] bg-[#faf7ff] px-3 py-1 text-xs font-semibold text-gray-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="lg:justify-self-end">
                <ShareCard slug={data.slug} />
              </div>
            </section>
          )}

          {designOneLeadParagraph && (
            <section className="space-y-5 md:px-5 py-4 md:py-4 sm:px-8">
              {isFilledText(designOneLeadParagraph.title) && (
                <h2 className="text-3xl font-bold leading-tight text-gray-950">{designOneLeadParagraph.title}</h2>
              )}
              <HtmlBlock html={designOneLeadParagraph.description} />
              {designOneLeadParagraphImages.length > 0 && (
                <div className="space-y-4">
                  <div className={`grid gap-4 ${designOneLeadParagraphImages.length > 1 ? "sm:grid-cols-[2fr_1fr]" : "grid-cols-1"}`}>
                    {designOneLeadParagraphImages.map((image, index) => (
                      <div key={`${image}-${index}`} className="overflow-hidden rounded-md bg-[#f8f5ef]">
                        <img
                          src={image}
                          alt={designOneLeadParagraph.title || `Lead image ${index + 1}`}
                          className="md:h-[350px] w-full object-cover sm:h-[200px]"
                        />
                      </div>
                    ))}
                  </div>
                  {/* Bullet Points Section */}
                  {designOneLeadParagraph.bulletPoints && designOneLeadParagraph.bulletPoints.length > 0 && designOneLeadParagraph.bulletPoints.some(point => isFilledText(point)) && (
                    <div className="space-y-3 mt-4">
                      {designOneLeadParagraph.bulletPoints.map((point, bulletIdx) => (
                        isFilledText(point) && (
                          <div key={bulletIdx} className="flex gap-3">
                            <span className="h-2 w-2 rounded-full bg-[#6156b0] mt-2 flex-shrink-0" />
                            <p className="text-md leading-6 text-gray-600">{point}</p>
                          </div>
                        )
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          <div className={`grid gap-10 md:p-5 sm:px-8 ${isDesignThree ? "grid-cols-1" : isDesignTwo ? "lg:grid-cols-[330px_minmax(0,1fr)] lg:items-start" : "lg:grid-cols-[400px_1fr]"}`}>
            {isDesignThree ? (
              <>
                <main className="space-y-10">
                  {contentParagraphs.length > 0 &&
                    contentParagraphs.map((section, index) => {
                      const sectionImages = getSectionImages(section);
                      return (
                        <section key={`${section.title}-${index}`} className="space-y-3">
                          {isFilledText(section.title) && (
                            <h2 className="text-2xl font-bold leading-tight text-gray-950">{section.title}</h2>
                          )}
                          <HtmlBlock html={section.description} />
                          {sectionImages.length > 0 && (
                            <div className={`grid gap-4 ${sectionImages.length > 1 ? "sm:grid-cols-[2fr_1fr]" : "grid-cols-1"}`}>
                              {sectionImages.map((image, imgIndex) => (
                                <div key={`${image}-${imgIndex}`} className="overflow-hidden rounded-[10px] bg-[#f8f5ef]">
                                  <img
                                    src={image}
                                    alt={section.title || `Section image ${imgIndex + 1}`}
                                    className="md:h-[300px] w-full object-cover h-fit"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                          {section.bulletPoints &&
                            section.bulletPoints.length > 0 &&
                            section.bulletPoints.some((point) => isFilledText(point)) && (
                              <div className="space-y-3 py-3">
                                {section.bulletPoints.map((point, bulletIdx) => (
                                  isFilledText(point) && (
                                    <div key={bulletIdx} className="flex gap-3">
                                      <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-[#6156b0]" />
                                      <p className="text-md leading-6 text-gray-600">{point}</p>
                                    </div>
                                  )
                                ))}
                              </div>
                            )}
                        </section>
                      );
                    })}

                  {tableRows.length > 0 && (
                    <section className="space-y-4">
                      <h2 className="text-xl font-bold text-gray-950">{data.tableTitle || "Table Information"}</h2>
                      <div className="overflow-hidden bg-white">
                        <table className="w-full text-left text-sm">
                          <tbody>
                            {tableRows.map((row, index) => (
                              <tr
                                key={`${row.column1}-${row.column2}-${index}`}
                                className={`border-b border-[#ece7df] last:border-b-0 ${index % 2 === 0 ? "bg-gray-200" : "bg-gray-50"
                                  }`}
                              >
                                <td className="w-1/2 px-4 py-3 text-black border-b border-r border-black">
                                  {row.column1 || "-"}
                                </td>
                                <td className="w-1/2 px-4 py-3 text-gray-600 border-b border-black">
                                  {row.column2 || "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  )}

                  {(isFilledText(data.blockquoteDescription) || isFilledText(data.blockquoteMainTitle)) && (
                    <section className={`rounded bg-gray-100 px-2 gap-2 flex flex-col py-5 text-black ${isDesignTwo ? "max-w-3xl" : ""}`}>
                      <div className={`rounded-[24px] bg-[linear-gradient(135deg,#3f3a7a,#4c4489,#6156b0)] px-6 py-7 text-white shadow-[0_25px_60px_rgba(79,70,229,0.2)]`}>

                        <Quote className="h-7 w-7 text-white/80" />
                        {isFilledText(data.blockquoteMainTitle) && (
                          <h2 className="mt-3 text-2xl font-bold leading-tight mb-2">{data.blockquoteMainTitle}</h2>
                        )}
                        {isFilledText(data.blockquoteLeftTitle) && <span>{data.blockquoteLeftTitle}</span>}
                      </div>
                      <div className="px-1">
                        <div className="my-4 text-black">
                          <HtmlBlock html={data.blockquoteDescription} className="!text-black" />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {blockquoteTags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-md w-fit border border-gray-500 px-3 py-2 text-[12px] text-black"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </section>
                  )}
                  {remainingHighlights.length > 0 && (
                    <section className="space-y-5">
                      {introHighlight && (
                        <div className="rounded-md border border-[#e6dccf] bg-[#f4ede3] px-5 py-6 shadow-sm">
                          {isFilledText(introHighlight.title) && (
                            <h2 className="text-2xl font-bold leading-tight text-gray-950">{introHighlight.title}</h2>
                          )}
                          {isFilledText(introHighlight.point) && (
                            <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">{introHighlight.point}</p>
                          )}
                        </div>
                      )}
                      <div className="flex flex-col gap-4">
                        {remainingHighlights.map((item, index) => (
                          <div
                            key={`${item.title}-${index}`}
                            className="rounded-md border border-gray-200 bg-white px-5 py-5 shadow-sm"
                          >
                            {isFilledText(item.title) && (
                              <h3 className="text-xl font-bold leading-tight text-gray-950">{item.title}</h3>
                            )}
                            {isFilledText(item.point) && (
                              <p className="mt-2 text-sm leading-7 text-gray-600">{item.point}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </main>
              </>
            ) : (
              <>
                <aside className="space-y-5 lg:sticky lg:top-20">
                  <StaticSidebarCard data={data} />
                  <AuthorCard data={data} />
                  <ShareCard slug={data.slug} />
                </aside>

                <main className="space-y-10">
                  {isDesignTwo && leadParagraph && (
                    <section className="space-y-5">
                      {isFilledText(leadParagraph.description) && (
                        <HtmlBlock html={leadParagraph.description} className="max-w-none text-left" />
                      )}
                      {isFilledText(leadParagraph.title) && (
                        <h2 className="text-4xl font-bold leading-tight text-gray-950">{leadParagraph.title}</h2>
                      )}

                      {/* Bullet Points Section */}
                      {leadParagraph.bulletPoints && leadParagraph.bulletPoints.length > 0 && leadParagraph.bulletPoints.some(point => isFilledText(point)) && (
                        <div className="space-y-3 mt-4">
                          {leadParagraph.bulletPoints.map((point, bulletIdx) => (
                            isFilledText(point) && (
                              <div key={bulletIdx} className="flex gap-3">
                                <span className="h-2 w-2 rounded-full bg-[#6156b0] mt-2 flex-shrink-0" />
                                <p className="text-sm leading-6 text-gray-600">{point}</p>
                              </div>
                            )
                          ))}
                        </div>
                      )}
                      {leadParagraphImages.length > 0 && (
                        <div className={`grid gap-4 ${leadParagraphImages.length > 1 ? "sm:grid-cols-[2fr_1fr]" : "grid-cols-1"}`}>
                          {leadParagraphImages.map((image, index) => (
                            <div key={`${image}-${index}`} className="overflow-hidden rounded-md bg-[#f8f5ef]">
                              <img
                                src={image}
                                alt={leadParagraph.title || `Lead image ${index + 1}`}
                                className="md:h-[250px] w-full object-cover sm:h-[200px]"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  )}

                  {(isDesignTwo ? contentParagraphs : designOneRemainingParagraphs).length > 0 &&
                    (isDesignTwo ? contentParagraphs : designOneRemainingParagraphs).map((section, index) => {
                      const sectionImages = getSectionImages(section);
                      return (
                        <section key={`${section.title}-${index}`} className="space-y-5">
                          {isFilledText(section.title) && (
                            <h2 className={`${isDesignTwo ? "text-2xl" : "text-3xl"} font-bold leading-tight text-gray-950`}>
                              {section.title}
                            </h2>
                          )}
                          <HtmlBlock html={section.description} />
                          {sectionImages.length > 0 && (
                            <div className={`grid gap-4 ${sectionImages.length > 1 ? "sm:grid-cols-[2fr_1fr]" : "grid-cols-1"}`}>
                              {sectionImages.map((image, imageIndex) => (
                                <div key={`${image}-${imageIndex}`} className="overflow-hidden rounded-md bg-[#f8f5ef]">
                                  <img
                                    src={image}
                                    alt={section.title || `Section image ${imageIndex + 1}`}
                                    className="md:h-[250px] w-full object-cover sm:h-[200px]"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                          {/* Bullet Points Section */}
                          {section.bulletPoints && section.bulletPoints.length > 0 && section.bulletPoints.some(point => isFilledText(point)) && (
                            <div className="space-y-3 mt-4">
                              {section.bulletPoints.map((point, bulletIdx) => (
                                isFilledText(point) && (
                                  <div key={bulletIdx} className="flex gap-3">
                                    <span className="h-2 w-2 rounded-full bg-[#6156b0] mt-2 flex-shrink-0" />
                                    <p className="text-sm leading-6 text-gray-600">{point}</p>
                                  </div>
                                )
                              ))}
                            </div>
                          )}
                        </section>
                      );
                    })}

                  {tableRows.length > 0 && (
                    <section className="space-y-4">
                      <h2 className="text-2xl font-bold text-gray-950">{data.tableTitle || "Table Information"}</h2>
                      <div className="overflow-hidden  border-[#ddd5ca] bg-white">
                        <table className="w-full text-left text-sm">
                          <tbody>
                            {tableRows.map((row, index) => (
                              <tr
                                key={`${row.column1}-${row.column2}-${index}`}
                                className={`border-b border-[#ece7df] last:border-b-0 ${index % 2 === 0 ? "bg-gray-200" : "bg-gray-50"
                                  }`}
                              >
                                <td className="w-1/2 px-4 py-3 font-medium text-black border-r border-b border-gray-400">{row.column1 || "-"}</td>
                                <td className="w-1/2 px-4 py-3 text-black font-medium border-b border-gray-400">{row.column2 || "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  )}


                  {(isFilledText(data.blockquoteDescription) || isFilledText(data.blockquoteMainTitle)) && (
                    <section className={`rounded bg-gray-100 px-2 gap-2 flex flex-col py-5 text-black ${isDesignTwo ? "max-w-3xl" : ""}`}>
                      <div className={`rounded-[24px] bg-[linear-gradient(135deg,#3f3a7a,#4c4489,#6156b0)] px-6 py-7 text-white shadow-[0_25px_60px_rgba(79,70,229,0.2)]`}>

                        <Quote className="h-7 w-7 text-white/80" />
                        {isFilledText(data.blockquoteMainTitle) && (
                          <h2 className="mt-3 text-2xl font-bold leading-tight mb-2">{data.blockquoteMainTitle}</h2>
                        )}
                        {isFilledText(data.blockquoteLeftTitle) && <span>{data.blockquoteLeftTitle}</span>}
                      </div>
                      <div className="px-1">
                        <div className="my-4 text-black">
                          <HtmlBlock html={data.blockquoteDescription} className="!text-black" />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {blockquoteTags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-md w-fit border border-gray-500 px-3 py-2 text-[12px] text-black"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </section>
                  )}

                  {highlights.length > 0 && (
                    <section className="space-y-4">
                      <h2 className="text-2xl font-bold text-gray-950">More details</h2>
                      <div className="grid gap-4 md:grid-cols-1">
                        {highlights.map((item, index) => (
                          <div key={`${item.title}-${index}`} className="rounded-md border border-gray-800 bg-[#fcfaf6] p-5">
                            {isFilledText(item.title) && <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>}
                            {isFilledText(item.point) && <p className="mt-2 text-sm leading-7 text-gray-600">{item.point}</p>}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {accordionItems.length > 0 && (
                    <section className="space-y-6">
                      <h2 className="text-3xl font-bold text-gray-950">Special Note</h2>
                      <div className="space-y-2.5">
                        {accordionItems.map((item, index) => {
                          const isOpen = openAccordion === index;
                          return (
                            <div
                              key={`${item.left}-${index}`}
                              className={`overflow-hidden rounded-lg border transition-all duration-300 ${isOpen
                                ? "border-[#6156b0] bg-gradient-to-br from-[#f9f8fd] to-[#fcfaf6]"
                                : "border-[#e6dccf] bg-white"
                                }`}
                              style={{
                                transformOrigin: "top",
                                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => setOpenAccordion(isOpen ? -1 : index)}
                                className={`flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-all duration-300 ${isOpen
                                  ? "bg-gradient-to-r from-[#6156b0]/5 to-transparent"
                                  : "hover:bg-[#faf8f5]"
                                  }`}
                              >
                                <span className={`font-semibold transition-colors duration-300 ${isOpen ? "text-[#6156b0]" : "text-gray-900 group-hover:text-gray-950"}`}>
                                  {item.left || `Question ${index + 1}`}
                                </span>
                                <ChevronDown
                                  className={`h-5 w-5 shrink-0 transition-all duration-500 ${isOpen ? "rotate-180 text-[#6156b0]" : "text-gray-500"
                                    }`}
                                />
                              </button>
                              <div
                                className={`grid transition-all duration-500 ease-in-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                                  }`}
                              >
                                <div className="overflow-hidden">
                                  <div className="border-t border-[#e6dccf] px-6 py-5 text-sm leading-7 text-gray-700">
                                    {item.right || "No details added yet."}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}
                </main>
              </>
            )}
          </div>
          {/* <PopularDestinations /> */}
        </div>
      </div>
    </div>
  );
};

export default WebPage;

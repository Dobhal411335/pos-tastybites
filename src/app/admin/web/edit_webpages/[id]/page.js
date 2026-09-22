"use client";
import {
  ArrowLeftIcon,
  Trash2,
  Plus,
  Sparkles,
  Image as ImageIcon,
  Settings,
  FileText,
  Check,
  AlertCircle,
  Share2,
  Phone,
  AlignLeft,
  Info,
  HelpCircle,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import React from "react";

import { useState } from "react";
import { useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import { FontFamily } from "@tiptap/extension-font-family";
import Typography from "@tiptap/extension-typography";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { Color } from "@tiptap/extension-color";
import ListItem from "@tiptap/extension-list-item";
import { toast } from "sonner";
import { useRouter, useParams } from "next/navigation";
import SeoFields from "@/components/common/SeoFields";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { ROOM_AMENITY_CATEGORIES } from "@/lib/roomAmenityCategories.js";
import { getHotelAmenityIcon } from "@/lib/hotelAmenityIcons.js";
import { getRoomAmenityCategoryIcon } from "@/lib/roomAmenityIcons.js";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Heading1,
  Heading2,
  Heading3,
  PilcrowSquare,
} from "lucide-react";

const initialCreateTags = [""];
const initialHighlights = [{ title: "", point: "" }];
const createEmptyParagraphSection = () => ({
  title: "",
  description: "",
  firstImage: { url: "", key: "" },
  secondImage: { url: "", key: "" },
  bulletPoints: [""],
});
const initialParagraphSections = [createEmptyParagraphSection()];
const initialTableRows = [{ column1: "", column2: "" }];
const initialAccordionTags = [{ left: "", right: "" }];
const initialNotices = [{ title: "", description: "", type: "warning" }];
const initialSearchLocations = [{ locationName: "", count: "", url: "" }];
const initialGridCards = [
  {
    image: { url: "", key: "" },
    chipName: "",
    title: "",
    link: "",
    galleryDate: "",
    postedBy: "",
    galleryDescription: "",
    bentoImages: [],
    youtubeShorts: [],
    youtubeVideos: [],
  },
];
const initialTeamCards = [
  {
    image: { url: "", key: "" },
    name: "",
    designation: "",
    qualification: "",
    specialization: "",
    phone: "",
    facebook: "",
    instagram: "",
    youtube: "",
  },
];
const createEmptyDesign9Card = () => ({
  heading: "",
  description: "",
  images: [],
});
const initialDesign9Cards = [createEmptyDesign9Card()];

const normalizeTeamCards = (cards) => {
  if (!Array.isArray(cards) || cards.length === 0) {
    return initialTeamCards;
  }
  return cards.map((card) => ({
    image: card?.image || { url: "", key: "" },
    name: card?.name || "",
    designation: card?.designation || "",
    qualification: card?.qualification || "",
    specialization: card?.specialization || "",
    phone: card?.phone || "",
    facebook: card?.facebook || "",
    instagram: card?.instagram || "",
    youtube: card?.youtube || "",
  }));
};

const normalizeDesign9Cards = (cards) => {
  if (!Array.isArray(cards) || cards.length === 0) {
    return initialDesign9Cards;
  }
  return cards.map((card) => ({
    heading: card?.heading || "",
    description: card?.description || "",
    images: Array.isArray(card?.images) ? card.images : [],
  }));
};

const mapDesignEightNineFields = (data) => ({
  design8Heading: data.design8Heading || "",
  design8Description: data.design8Description || "",
  design8HotelAmenities: Array.isArray(data.design8HotelAmenities)
    ? data.design8HotelAmenities
    : [],
  design8RoomDescription: data.design8RoomDescription || "",
  design8RoomAmenities: Array.isArray(data.design8RoomAmenities)
    ? data.design8RoomAmenities
    : [],
  design9MiniHeading: data.design9MiniHeading || "",
  design9MainHeading: data.design9MainHeading || "",
  design9Description: data.design9Description || "",
  design9Cards: normalizeDesign9Cards(data.design9Cards),
});

const initialAdvertisements = [{ image: { url: "", key: "" }, url: "" }];

const normalizeParagraphSections = (sections) => {
  if (!Array.isArray(sections) || sections.length === 0) {
    return initialParagraphSections;
  }
  return sections.map((section) => ({
    title: section?.title || "",
    description: section?.description || "",
    firstImage: section?.firstImage || { url: "", key: "" },
    secondImage: section?.secondImage || { url: "", key: "" },
    bulletPoints:
      Array.isArray(section?.bulletPoints) && section.bulletPoints.length > 0
        ? section.bulletPoints
        : [""],
  }));
};

const mapWebpageToForm = (data = {}) => ({
  ...data,
  templateType: data.templateType || "design1",
  titleLine: data.titleLine || "",
  keywords:
    Array.isArray(data.keywords) && data.keywords.filter(Boolean).length > 0
      ? data.keywords.filter(Boolean)
      : [""],
  imageFirst: data.imageFirst || { url: "", key: "" },
  imageFirstMobile: data.imageFirstMobile || { url: "", key: "" },
  bannerImage: data.bannerImage || { url: "", key: "" },
  bannerImageMobile: data.bannerImageMobile || { url: "", key: "" },
  mainProfileImage: data.mainProfileImage || { url: "", key: "" },
  paragraphFirstImage: data.paragraphFirstImage || { url: "", key: "" },
  paragraphSecondImage: data.paragraphSecondImage || { url: "", key: "" },
  advertisementImage: data.advertisementImage || { url: "", key: "" },
  advertisementUrl: data.advertisementUrl || "",
  advertisements:
    Array.isArray(data.advertisements) && data.advertisements.length > 0
      ? data.advertisements
      : data.advertisementImage?.url || data.advertisementUrl
        ? [
            {
              image: data.advertisementImage || { url: "", key: "" },
              url: data.advertisementUrl || "",
            },
          ]
        : initialAdvertisements,
  imageGallery: Array.isArray(data.imageGallery) ? data.imageGallery : [],
  createTags:
    Array.isArray(data.createTags) && data.createTags.length > 0
      ? data.createTags
      : initialCreateTags,
  postedBy: data.postedBy || { admin: false, user: false },
  highlights:
    Array.isArray(data.highlights) && data.highlights.length > 0
      ? data.highlights
      : initialHighlights,
  paragraphSections: normalizeParagraphSections(data.paragraphSections),
  tableTitle: data.tableTitle || "",
  tableRows:
    Array.isArray(data.tableRows) && data.tableRows.length > 0
      ? data.tableRows
      : initialTableRows,
  blockquoteMainTitle: data.blockquoteMainTitle || "",
  blockquoteLeftTitle: data.blockquoteLeftTitle || "",
  blockquoteDescription: data.blockquoteDescription || "",
  blockquoteTags:
    Array.isArray(data.blockquoteTags) && data.blockquoteTags.length > 0
      ? data.blockquoteTags
      : initialCreateTags,
  accordionTags:
    Array.isArray(data.accordionTags) && data.accordionTags.length > 0
      ? data.accordionTags
      : initialAccordionTags,
  sideThumbImage:
    typeof data.sideThumbImage === "string"
      ? data.sideThumbImage
      : data.sideThumbImage?.url || "",
  sideThumbImageKey:
    data.sideThumbImageKey ||
    (typeof data.sideThumbImage === "object"
      ? data.sideThumbImage?.key || ""
      : ""),
  sideThumbName: data.sideThumbName || "",
  sideThumbDesignation: data.sideThumbDesignation || "",
  sideThumbDescription: data.sideThumbDescription || "",
  facebookUrl: data.facebookUrl || "",
  youtubeUrl: data.youtubeUrl || "",
  instaUrl: data.instaUrl || "",
  googleUrl: data.googleUrl || "",
  notices:
    Array.isArray(data.notices) && data.notices.length > 0
      ? data.notices
      : initialNotices,
  searchLocations:
    Array.isArray(data.searchLocations) && data.searchLocations.length > 0
      ? data.searchLocations
      : initialSearchLocations,
  design5Chip: data.design5Chip || "",
  design5MainHeading: data.design5MainHeading || "",
  gridCards:
    Array.isArray(data.gridCards) && data.gridCards.length > 0
      ? data.gridCards
      : initialGridCards,
  design6Chip: data.design6Chip || "",
  design6ExploreLink: data.design6ExploreLink || "",
  design6MainHeading: data.design6MainHeading || "",
  design6SubHeading: data.design6SubHeading || "",
  design6Author: data.design6Author || "",
  design6MidHeading: data.design6MidHeading || "",
  design6MidLink: data.design6MidLink || "",
  teamCards: normalizeTeamCards(data.teamCards),
  design7Chip: data.design7Chip || "",
  design7ExploreLink: data.design7ExploreLink || "",
  design7MainHeading: data.design7MainHeading || "",
  ...mapDesignEightNineFields(data),
});

const InlineRichTextEditor = ({ value, onChange }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      FontFamily,
      Typography,
      TextAlign,
      Underline,
      Link,
      Color,
      ListItem,
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "min-h-[120px] max-h-[300px] overflow-y-auto border border-slate-200/80 rounded-b-xl p-3 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900/5 focus:border-slate-400 transition-all font-normal text-sm [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-semibold [&_p]:my-1 [&_ul]:list-disc [&_ul]:ml-6 [&_ol]:list-decimal [&_ol]:ml-6 [&_blockquote]:border-l-4 [&_blockquote]:border-gray-500 [&_blockquote]:pl-3 [&_blockquote]:italic",
      },
    },
    onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.getHTML()),
  });

  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "", false);
    }
  }, [editor, value]);

  if (!editor) return null;

  return (
    <div className="w-full border border-slate-200/80 rounded-xl overflow-hidden shadow-sm">
      <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border-b border-slate-200/80">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded hover:bg-slate-200/50 transition-colors ${editor.isActive("bold") ? "bg-slate-200 text-slate-955 font-bold" : "text-slate-600"}`}
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded hover:bg-slate-200/50 transition-colors ${editor.isActive("italic") ? "bg-slate-200 text-slate-955 font-bold" : "text-slate-600"}`}
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-1.5 rounded hover:bg-slate-200/50 transition-colors ${editor.isActive("underline") ? "bg-slate-200 text-slate-955 font-bold" : "text-slate-600"}`}
        >
          <UnderlineIcon className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setParagraph().run()}
          className={`p-1.5 rounded hover:bg-slate-200/50 transition-colors ${editor.isActive("paragraph") ? "bg-slate-200 text-slate-955 font-bold" : "text-slate-600"}`}
        >
          <PilcrowSquare className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          className={`p-1.5 rounded hover:bg-slate-200/50 transition-colors ${editor.isActive("heading", { level: 1 }) ? "bg-slate-200 text-slate-955 font-bold" : "text-slate-600"}`}
        >
          <Heading1 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className={`p-1.5 rounded hover:bg-slate-200/50 transition-colors ${editor.isActive("heading", { level: 2 }) ? "bg-slate-200 text-slate-955 font-bold" : "text-slate-600"}`}
        >
          <Heading2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          className={`p-1.5 rounded hover:bg-slate-200/50 transition-colors ${editor.isActive("heading", { level: 3 }) ? "bg-slate-200 text-slate-955 font-bold" : "text-slate-600"}`}
        >
          <Heading3 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded hover:bg-slate-200/50 transition-colors ${editor.isActive("bulletList") ? "bg-slate-200 text-slate-955 font-bold" : "text-slate-600"}`}
        >
          <List className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded hover:bg-slate-200/50 transition-colors ${editor.isActive("orderedList") ? "bg-slate-200 text-slate-955 font-bold" : "text-slate-600"}`}
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-1.5 rounded hover:bg-slate-200/50 transition-colors ${editor.isActive("blockquote") ? "bg-slate-200 text-slate-955 font-bold" : "text-slate-600"}`}
        >
          <Quote className="w-3.5 h-3.5" />
        </button>
        <div className="w-[1px] h-4 bg-slate-200 my-auto mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          className="p-1.5 rounded hover:bg-slate-200/50 transition-colors text-slate-600"
        >
          <Undo className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          className="p-1.5 rounded hover:bg-slate-200/50 transition-colors text-slate-600"
        >
          <Redo className="w-3.5 h-3.5" />
        </button>
      </div>
      <EditorContent
        editor={editor}
        className="[&_.ProseMirror]:min-h-[120px] [&_.ProseMirror]:p-3 [&_.ProseMirror]:focus:outline-none"
      />
    </div>
  );
};

const BannerImageField = ({
  value,
  uploading,
  onChange,
  onDelete,
  inputId,
  label = "Header Banner Image",
  hint = "Recommended size: 1200x400 px",
  buttonLabel = "Choose Banner Image",
}) => (
  <div className="space-y-2">
    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
      {label}
    </label>
    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 bg-slate-50/30 flex flex-col items-center justify-center text-center">
      <input
        type="file"
        accept="image/*"
        onChange={onChange}
        className="hidden"
        id={inputId}
      />
      <div className="mb-3 rounded-full bg-slate-100 p-2.5 text-slate-600 border border-slate-200/50">
        <ImageIcon className="w-5 h-5" />
      </div>
      <label
        htmlFor={inputId}
        className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-sm transition-colors mb-1"
      >
        {buttonLabel}
      </label>
      <p className="text-[11px] text-slate-400">{hint}</p>
      {uploading && (
        <div className="text-blue-600 text-xs font-semibold mt-2 animate-pulse">
          Uploading to Cloudinary...
        </div>
      )}
      {value?.url && (
        <div className="relative w-full max-w-md h-44 border border-slate-200/80 rounded-xl overflow-hidden mt-4 bg-white shadow-sm">
          <img
            src={value.url}
            alt="Banner Preview"
            className="object-cover w-full h-full"
          />
          <button
            type="button"
            onClick={onDelete}
            className="absolute top-2 right-2 bg-white/95 hover:bg-rose-50 border border-slate-200 text-rose-600 rounded-lg p-2 transition-colors shadow-sm"
            title="Remove image"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  </div>
);

const EditWebpages = () => {
  const router = useRouter();
  const params = useParams();
  const activityId = params?.id;
  const imageFirstInputRef = useRef(null);
  const imageFirstMobileInputRef = useRef(null);
  const bannerImageInputRef = useRef(null);
  const bannerImageMobileInputRef = useRef(null);

  // Loading and error state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch webpage data on mount
  React.useEffect(() => {
    if (!activityId) {
      setError("Webpage id is missing");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/web/create_webpage/${activityId}`)
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || data?.error || data?.success === false) {
          setError(
            data?.error || data?.message || "Could not load webpage",
          );
          setLoading(false);
          return;
        }
        setForm((prev) => ({ ...prev, ...mapWebpageToForm(data) }));
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError("Failed to fetch webpage: " + err.message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activityId]);

  const [uploadingImageFirst, setUploadingImageFirst] = useState(false);
  const [uploadingImageFirstMobile, setUploadingImageFirstMobile] =
    useState(false);
  const [uploadingBannerImage, setUploadingBannerImage] = useState(false);
  const [uploadingBannerImageMobile, setUploadingBannerImageMobile] =
    useState(false);
  const galleryInputRef = useRef(null);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const mainProfileImageInputRef = useRef(null);
  const [uploadingMainProfileImage, setUploadingMainProfileImage] =
    useState(false);
  const sideThumbImageInputRef = useRef(null);
  const [uploadingSideThumbImage, setUploadingSideThumbImage] = useState(false);
  const advertisementImageInputRef = useRef(null);
  const [uploadingParagraphFirstImage, setUploadingParagraphFirstImage] =
    useState(false);
  const [uploadingParagraphSecondImage, setUploadingParagraphSecondImage] =
    useState(false);
  const [uploadingAdvertisementImage, setUploadingAdvertisementImage] =
    useState(false);

  const handleCloudinaryImageChange = async (e, key) => {
    const file = e.target.files[0];
    if (!file) return;
    if (key === "imageFirst") setUploadingImageFirst(true);
    if (key === "imageFirstMobile") setUploadingImageFirstMobile(true);
    if (key === "bannerImage") setUploadingBannerImage(true);
    if (key === "bannerImageMobile") setUploadingBannerImageMobile(true);
    if (key === "mainProfileImage") setUploadingMainProfileImage(true);
    if (key === "sideThumbImage") setUploadingSideThumbImage(true);
    if (key === "paragraphFirstImage") setUploadingParagraphFirstImage(true);
    if (key === "paragraphSecondImage") setUploadingParagraphSecondImage(true);
    if (key === "advertisementImage") setUploadingAdvertisementImage(true);

    const formDataUpload = new FormData();
    formDataUpload.append("file", file);
    try {
      const res = await fetch("/api/cloudinary", {
        method: "POST",
        body: formDataUpload,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setForm((prev) => ({
          ...prev,
          ...(key === "sideThumbImage"
            ? {
                sideThumbImage: data.url,
                sideThumbImageKey: data.key || "",
              }
            : {
                [key]: { url: data.url, key: data.key || "" },
              }),
        }));
        toast.success("Image uploaded!");
      } else {
        toast.error(
          "Cloudinary upload failed: " + (data.error || "Unknown error"),
        );
      }
    } catch (err) {
      toast.error("Cloudinary upload error: " + err.message);
    }
    if (key === "imageFirst") setUploadingImageFirst(false);
    if (key === "imageFirstMobile") setUploadingImageFirstMobile(false);
    if (key === "bannerImage") setUploadingBannerImage(false);
    if (key === "bannerImageMobile") setUploadingBannerImageMobile(false);
    if (key === "mainProfileImage") setUploadingMainProfileImage(false);
    if (key === "sideThumbImage") setUploadingSideThumbImage(false);
    if (key === "paragraphFirstImage") setUploadingParagraphFirstImage(false);
    if (key === "paragraphSecondImage") setUploadingParagraphSecondImage(false);
    if (key === "advertisementImage") setUploadingAdvertisementImage(false);
  };

  const handleDeleteCloudinaryImage = async (key) => {
    if (key === "sideThumbImage") {
      const sideThumbImageKey = form.sideThumbImageKey;
      if (!sideThumbImageKey) {
        setForm((prev) => ({
          ...prev,
          sideThumbImage: "",
          sideThumbImageKey: "",
        }));
        return;
      }
      try {
        const res = await fetch("/api/cloudinary", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicId: sideThumbImageKey }),
        });
        if (res.ok) {
          setForm((prev) => ({
            ...prev,
            sideThumbImage: "",
            sideThumbImageKey: "",
          }));
          toast.success("Image deleted!");
        }
      } catch (err) {
        toast.error("Delete error: " + err.message);
      }
      return;
    }

    const image = form[key];
    if (image && image.key) {
      try {
        await fetch("/api/cloudinary", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicId: image.key }),
        });
        setForm((prev) => ({ ...prev, [key]: { url: "", key: "" } }));
        toast.success("Image deleted!");
      } catch (err) {
        toast.error("Delete error: " + err.message);
      }
    }
  };

  const handleGridCardImageChange = async (e, index) => {
    const file = e.target.files[0];
    if (!file) return;
    const formDataUpload = new FormData();
    formDataUpload.append("file", file);
    try {
      const res = await fetch(`/api/cloudinary`, {
        method: "POST",
        body: formDataUpload,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        const newCards = [...form.gridCards];
        newCards[index] = {
          ...newCards[index],
          image: { url: data.url, key: data.key || "" },
        };
        setForm((prev) => ({ ...prev, gridCards: newCards }));
        toast.success("Grid card image uploaded!");
      } else {
        toast.error("Upload failed: " + (data.error || "Unknown"));
      }
    } catch (err) {
      toast.error("Upload error: " + err.message);
    }
  };

  const handleDeleteGridCardImage = async (index) => {
    const card = form.gridCards[index];
    if (card && card.image && card.image.key) {
      try {
        await fetch("/api/cloudinary", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicId: card.image.key }),
        });
      } catch (err) {
        console.error("Failed to delete grid card image from Cloudinary", err);
      }
    }
    const newCards = [...form.gridCards];
    newCards[index] = { ...newCards[index], image: { url: "", key: "" } };
    setForm((prev) => ({ ...prev, gridCards: newCards }));
  };

  const handleAdvertisementImageChange = async (e, index) => {
    const file = e.target.files[0];
    if (!file) return;
    const formDataUpload = new FormData();
    formDataUpload.append("file", file);
    try {
      const res = await fetch(`/api/cloudinary`, {
        method: "POST",
        body: formDataUpload,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        const newAdvertisements = [...form.advertisements];
        newAdvertisements[index] = {
          ...newAdvertisements[index],
          image: { url: data.url, key: data.key || "" },
        };
        setForm((prev) => ({ ...prev, advertisements: newAdvertisements }));
        toast.success("Advertisement image uploaded!");
      } else {
        toast.error("Upload failed: " + (data.error || "Unknown"));
      }
    } catch (err) {
      toast.error("Upload error: " + err.message);
    }
  };

  const handleDeleteAdvertisementImage = async (index) => {
    const ad = form.advertisements[index];
    if (ad && ad.image && ad.image.key) {
      try {
        await fetch("/api/cloudinary", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicId: ad.image.key }),
        });
      } catch (err) {
        console.error(
          "Failed to delete advertisement image from Cloudinary",
          err,
        );
      }
    }
    const newAdvertisements = [...form.advertisements];
    newAdvertisements[index] = {
      ...newAdvertisements[index],
      image: { url: "", key: "" },
    };
    setForm((prev) => ({ ...prev, advertisements: newAdvertisements }));
  };

  const handleBentoImageChange = async (e, cardIndex) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    try {
      const uploadPromises = files.map(async (file) => {
        const formDataUpload = new FormData();
        formDataUpload.append("file", file);
        const res = await fetch(`/api/cloudinary`, {
          method: "POST",
          body: formDataUpload,
        });
        const data = await res.json();
        if (res.ok && data.url) {
          return { url: data.url, key: data.key || "" };
        } else {
          throw new Error(data.error || "Unknown error");
        }
      });

      const uploadedImages = await Promise.all(uploadPromises);

      setForm((prev) => {
        const newCards = [...prev.gridCards];
        const bentoImages = newCards[cardIndex].bentoImages || [];
        newCards[cardIndex] = {
          ...newCards[cardIndex],
          bentoImages: [...bentoImages, ...uploadedImages],
        };
        return { ...prev, gridCards: newCards };
      });
      toast.success(`${uploadedImages.length} Bento image(s) uploaded!`);
    } catch (err) {
      toast.error("Upload error: " + err.message);
    }
  };

  const handleDeleteBentoImage = async (cardIndex, imgIndex) => {
    const card = form.gridCards[cardIndex];
    if (
      card &&
      card.bentoImages &&
      card.bentoImages[imgIndex] &&
      card.bentoImages[imgIndex].key
    ) {
      try {
        await fetch("/api/cloudinary", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicId: card.bentoImages[imgIndex].key }),
        });
      } catch (err) {
        console.error("Failed to delete bento image from Cloudinary", err);
      }
    }
    setForm((prev) => {
      const newCards = [...prev.gridCards];
      const newBentoImages = [...(newCards[cardIndex].bentoImages || [])];
      newBentoImages.splice(imgIndex, 1);
      newCards[cardIndex] = {
        ...newCards[cardIndex],
        bentoImages: newBentoImages,
      };
      return { ...prev, gridCards: newCards };
    });
  };

  const handleTeamCardImageChange = async (e, index) => {
    const file = e.target.files[0];
    if (!file) return;
    const formDataUpload = new FormData();
    formDataUpload.append("file", file);
    try {
      const res = await fetch(`/api/cloudinary`, {
        method: "POST",
        body: formDataUpload,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        const newCards = [...form.teamCards];
        newCards[index] = {
          ...newCards[index],
          image: { url: data.url, key: data.key || "" },
        };
        setForm((prev) => ({ ...prev, teamCards: newCards }));
        toast.success("Team card image uploaded!");
      } else {
        toast.error("Upload failed: " + (data.error || "Unknown"));
      }
    } catch (err) {
      toast.error("Upload error: " + err.message);
    }
  };

  const handleDeleteTeamCardImage = async (index) => {
    const card = form.teamCards[index];
    if (card && card.image && card.image.key) {
      try {
        await fetch("/api/cloudinary", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicId: card.image.key }),
        });
      } catch (err) {
        console.error("Failed to delete team card image from Cloudinary", err);
      }
    }
    const newCards = [...form.teamCards];
    newCards[index] = { ...newCards[index], image: { url: "", key: "" } };
    setForm((prev) => ({ ...prev, teamCards: newCards }));
  };

  const handleDesign9CardImagesChange = async (e, cardIndex) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    try {
      const uploadPromises = files.map(async (file) => {
        const formDataUpload = new FormData();
        formDataUpload.append("file", file);
        const res = await fetch("/api/cloudinary", {
          method: "POST",
          body: formDataUpload,
        });
        const data = await res.json();
        if (res.ok && data.url) {
          return { url: data.url, key: data.key || "" };
        }
        throw new Error(data.error || "Unknown error");
      });
      const uploadedImages = await Promise.all(uploadPromises);
      setForm((prev) => {
        const nextCards = [...(prev.design9Cards || [])];
        const images = nextCards[cardIndex]?.images || [];
        nextCards[cardIndex] = {
          ...nextCards[cardIndex],
          images: [...images, ...uploadedImages],
        };
        return { ...prev, design9Cards: nextCards };
      });
      toast.success(`${uploadedImages.length} image(s) uploaded!`);
    } catch (err) {
      toast.error("Upload error: " + err.message);
    }
    e.target.value = "";
  };

  const handleDeleteDesign9CardImage = async (cardIndex, imgIndex) => {
    const card = form.design9Cards?.[cardIndex];
    const image = card?.images?.[imgIndex];
    if (image?.key) {
      try {
        await fetch("/api/cloudinary", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicId: image.key }),
        });
      } catch (err) {
        console.error(
          "Failed to delete design 9 card image from Cloudinary",
          err,
        );
      }
    }
    setForm((prev) => {
      const nextCards = [...(prev.design9Cards || [])];
      const nextImages = [...(nextCards[cardIndex]?.images || [])];
      nextImages.splice(imgIndex, 1);
      nextCards[cardIndex] = { ...nextCards[cardIndex], images: nextImages };
      return { ...prev, design9Cards: nextCards };
    });
  };

  const initialForm = {
    title: "",
    slug: "",
    active: true,
    titleLine: "",
    keywords: [""],
    templateType: "design1",
    firstTitle: "",
    imageFirst: { url: "", key: "" },
    imageFirstMobile: { url: "", key: "" },
    bannerImage: { url: "", key: "" },
    bannerImageMobile: { url: "", key: "" },
    secondTitle: "",
    createTags: initialCreateTags,
    postedBy: { admin: false, user: false },
    highlights: initialHighlights,
    paragraphSections: initialParagraphSections,
    tableTitle: "",
    tableRows: initialTableRows,
    blockquoteMainTitle: "",
    blockquoteLeftTitle: "",
    blockquoteDescription: "",
    blockquoteTags: initialCreateTags,
    accordionTags: initialAccordionTags,
    advertisements: initialAdvertisements,
    advertisementImage: { url: "", key: "" },
    advertisementUrl: "",
    sideThumbImage: "",
    sideThumbImageKey: "",
    sideThumbName: "",
    sideThumbDesignation: "",
    sideThumbDescription: "",
    facebookUrl: "",
    youtubeUrl: "",
    instaUrl: "",
    googleUrl: "",
    mainProfileImage: { url: "", key: "" },
    imageGallery: [],
    notices: initialNotices,
    searchLocations: initialSearchLocations,
    design5Chip: "",
    design5MainHeading: "",
    gridCards: initialGridCards,
    design6Chip: "",
    design6ExploreLink: "",
    design6MainHeading: "",
    design6SubHeading: "",
    design6Author: "",
    design6MidHeading: "",
    design6MidLink: "",
    teamCards: initialTeamCards,
    design8Heading: "",
    design8Description: "",
    design8HotelAmenities: [],
    design8RoomDescription: "",
    design8RoomAmenities: [],
    design9MiniHeading: "",
    design9MainHeading: "",
    design9Description: "",
    design9Cards: initialDesign9Cards,
  };

  const [form, setForm] = useState(initialForm);
  const isDesignOneOrTwo =
    form.templateType === "design1" || form.templateType === "design2";
  const isDesignThree = form.templateType === "design3";
  const isDesignFour = form.templateType === "design4";
  const isDesignFive = form.templateType === "design5";
  const isDesignSix = form.templateType === "design6";
  const isDesignSeven = form.templateType === "design7";
  const isDesignEight = form.templateType === "design8";
  const isDesignNine = form.templateType === "design9";
  const isCustomTemplate =
    isDesignFive ||
    isDesignSix ||
    isDesignSeven ||
    isDesignEight ||
    isDesignNine;
  const [topSectionView, setTopSectionView] = useState("all");
  const [hotelAmenitiesList, setHotelAmenitiesList] = useState([]);
  const [loadingHotelAmenities, setLoadingHotelAmenities] = useState(false);

  React.useEffect(() => {
    if (!isDesignEight) return undefined;
    let cancelled = false;
    async function loadHotelAmenities() {
      setLoadingHotelAmenities(true);
      try {
        const res = await fetch("/api/roomAmenities");
        const allAmenities = await res.json();
        const list = Array.isArray(allAmenities)
          ? allAmenities
          : Array.isArray(allAmenities?.data)
            ? allAmenities.data
            : [];
        if (!cancelled) setHotelAmenitiesList(list);
      } catch {
        if (!cancelled) setHotelAmenitiesList([]);
      } finally {
        if (!cancelled) setLoadingHotelAmenities(false);
      }
    }
    loadHotelAmenities();
    return () => {
      cancelled = true;
    };
  }, [isDesignEight]);

  const toggleStringListValue = (field, value) => {
    setForm((prev) => {
      const current = Array.isArray(prev[field]) ? prev[field] : [];
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      return { ...prev, [field]: next };
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePostedByChange = (key) => {
    setForm((prev) => ({
      ...prev,
      postedBy: {
        ...prev.postedBy,
        [key]: !prev.postedBy?.[key],
      },
    }));
  };

  const handleArrayTextChange = (name, index, value) => {
    setForm((prev) => {
      const next = [...(prev[name] || [])];
      next[index] = value;
      return { ...prev, [name]: next };
    });
  };

  const addArrayTextRow = (name) => {
    setForm((prev) => ({ ...prev, [name]: [...(prev[name] || []), ""] }));
  };

  const removeArrayTextRow = (name, index) => {
    setForm((prev) => ({
      ...prev,
      [name]: (prev[name] || []).filter((_, i) => i !== index),
    }));
  };

  const handleObjectArrayChange = (name, index, key, value) => {
    setForm((prev) => {
      const next = [...(prev[name] || [])];
      next[index] = { ...next[index], [key]: value };
      return { ...prev, [name]: next };
    });
  };

  const addObjectArrayRow = (name, newRow) => {
    setForm((prev) => ({ ...prev, [name]: [...(prev[name] || []), newRow] }));
  };

  const removeObjectArrayRow = (name, index) => {
    setForm((prev) => ({
      ...prev,
      [name]: (prev[name] || []).filter((_, i) => i !== index),
    }));
  };

  const addParagraphBulletPoint = (paragraphIndex) => {
    setForm((prev) => {
      const nextParagraphs = [...(prev.paragraphSections || [])];
      const currentBullets = nextParagraphs[paragraphIndex]?.bulletPoints || [
        "",
      ];
      nextParagraphs[paragraphIndex] = {
        ...nextParagraphs[paragraphIndex],
        bulletPoints: [...currentBullets, ""],
      };
      return { ...prev, paragraphSections: nextParagraphs };
    });
  };

  const removeParagraphBulletPoint = (paragraphIndex, bulletIndex) => {
    setForm((prev) => {
      const nextParagraphs = [...(prev.paragraphSections || [])];
      const currentBullets = nextParagraphs[paragraphIndex]?.bulletPoints || [
        "",
      ];
      const updatedBullets = currentBullets.filter(
        (_, idx) => idx !== bulletIndex,
      );
      nextParagraphs[paragraphIndex] = {
        ...nextParagraphs[paragraphIndex],
        bulletPoints: updatedBullets.length > 0 ? updatedBullets : [""],
      };
      return { ...prev, paragraphSections: nextParagraphs };
    });
  };

  const handleParagraphBulletPointChange = (
    paragraphIndex,
    bulletIndex,
    value,
  ) => {
    setForm((prev) => {
      const nextParagraphs = [...(prev.paragraphSections || [])];
      const currentBullets = [
        ...(nextParagraphs[paragraphIndex]?.bulletPoints || [""]),
      ];
      currentBullets[bulletIndex] = value;
      nextParagraphs[paragraphIndex] = {
        ...nextParagraphs[paragraphIndex],
        bulletPoints: currentBullets,
      };
      return { ...prev, paragraphSections: nextParagraphs };
    });
  };

  const hasNonEmptyText = (value) =>
    typeof value === "string" && value.trim().length > 0;
  const hasAnyNonEmptyTag = (tags) =>
    Array.isArray(tags) && tags.some((tag) => hasNonEmptyText(tag));
  const hasPostedBySelection = (postedBy) =>
    !!(postedBy?.admin || postedBy?.user);

  const hasTopTextSectionContent = (data) => {
    return (
      hasNonEmptyText(data?.firstTitle) ||
      hasNonEmptyText(data?.secondTitle) ||
      hasAnyNonEmptyTag(data?.createTags) ||
      hasPostedBySelection(data?.postedBy) ||
      !!data?.imageFirst?.url ||
      !!data?.imageFirstMobile?.url
    );
  };

  const hasTopBannerContent = (data) =>
    !!data?.bannerImage?.url || !!data?.bannerImageMobile?.url;

  const handleParagraphSectionImageChange = async (e, index, imageKey) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (imageKey === "firstImage") setUploadingParagraphFirstImage(true);
    if (imageKey === "secondImage") setUploadingParagraphSecondImage(true);

    const formDataUpload = new FormData();
    formDataUpload.append("file", file);

    try {
      const res = await fetch("/api/cloudinary", {
        method: "POST",
        body: formDataUpload,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        const uploadedImage = { url: data.url, key: data.key || "" };
        setForm((prev) => {
          const nextParagraphs = [...(prev.paragraphSections || [])];
          nextParagraphs[index] = {
            ...nextParagraphs[index],
            [imageKey]: uploadedImage,
          };
          const next = { ...prev, paragraphSections: nextParagraphs };
          if (index === 0 && imageKey === "firstImage")
            next.paragraphFirstImage = uploadedImage;
          if (index === 0 && imageKey === "secondImage")
            next.paragraphSecondImage = uploadedImage;
          return next;
        });
        toast.success("Image uploaded!");
      } else {
        toast.error(
          "Cloudinary upload failed: " + (data.error || "Unknown error"),
        );
      }
    } catch (err) {
      toast.error("Cloudinary upload error: " + err.message);
    }

    if (imageKey === "firstImage") setUploadingParagraphFirstImage(false);
    if (imageKey === "secondImage") setUploadingParagraphSecondImage(false);
    e.target.value = "";
  };

  const handleDeleteParagraphSectionImage = async (index, imageKey) => {
    const image = form.paragraphSections?.[index]?.[imageKey];

    if (!image || !image.key) {
      setForm((prev) => {
        const nextParagraphs = [...(prev.paragraphSections || [])];
        nextParagraphs[index] = {
          ...nextParagraphs[index],
          [imageKey]: { url: "", key: "" },
        };
        const next = { ...prev, paragraphSections: nextParagraphs };
        if (index === 0 && imageKey === "firstImage")
          next.paragraphFirstImage = { url: "", key: "" };
        if (index === 0 && imageKey === "secondImage")
          next.paragraphSecondImage = { url: "", key: "" };
        return next;
      });
      return;
    }

    try {
      const res = await fetch("/api/cloudinary", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicId: image.key }),
      });
      const data = await res.json();
      if (res.ok) {
        setForm((prev) => {
          const nextParagraphs = [...(prev.paragraphSections || [])];
          nextParagraphs[index] = {
            ...nextParagraphs[index],
            [imageKey]: { url: "", key: "" },
          };
          const next = { ...prev, paragraphSections: nextParagraphs };
          if (index === 0 && imageKey === "firstImage")
            next.paragraphFirstImage = { url: "", key: "" };
          if (index === 0 && imageKey === "secondImage")
            next.paragraphSecondImage = { url: "", key: "" };
          return next;
        });
        toast.success("Image deleted from Cloudinary!");
      } else {
        toast.error(
          "Cloudinary delete failed: " + (data.error || "Unknown error"),
        );
      }
    } catch (err) {
      toast.error("Cloudinary delete error: " + err.message);
    }
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const {
        _id,
        __v,
        createdAt,
        updatedAt,
        restaurant,
        sideThumbImageKey,
        ...restPayload
      } = form;
      const payload = {
        ...restPayload,
        titleLine: (restPayload.titleLine || "").trim(),
        keywords: Array.isArray(restPayload.keywords)
          ? restPayload.keywords.map((k) => (k || "").trim()).filter(Boolean)
          : [],
        sideThumbImageKey: sideThumbImageKey || "",
      };
      const firstParagraphSection =
        Array.isArray(payload.paragraphSections) &&
        payload.paragraphSections.length > 0
          ? payload.paragraphSections[0]
          : null;
      if (firstParagraphSection) {
        payload.paragraphFirstImage = firstParagraphSection.firstImage || {
          url: "",
          key: "",
        };
        payload.paragraphSecondImage = firstParagraphSection.secondImage || {
          url: "",
          key: "",
        };
      }

      const hasTopText = hasTopTextSectionContent(payload);
      const hasTopBanner = hasTopBannerContent(payload);
      if (!isDesignEight && !isDesignNine && hasTopText && hasTopBanner) {
        toast.error(
          "Please fill either top text section or top banner image, not both.",
        );
        return;
      }

      const res = await fetch(`/api/web/create_webpage/${activityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        // Use saved document from PATCH so form matches what was persisted
        setForm((prev) => ({ ...prev, ...mapWebpageToForm(data) }));
        toast.success("webpage updated successfully!");
      } else {
        toast.error(
          data.error || data.message || "Failed to update webpage",
        );
      }
    } catch (err) {
      toast.error("Update error: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6">
        <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-500">
          Loading Webpage Editor...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6">
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 flex items-center gap-3 max-w-md">
          <ShieldAlert className="w-6 h-6 shrink-0" />
          <div>
            <h4 className="font-semibold">Error Occurred</h4>
            <p className="text-sm mt-0.5">{error}</p>
          </div>
        </div>
        <button
          onClick={() => router.back()}
          className="mt-4 bg-slate-900 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-slate-800 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#F8FAFC] min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      {/* Header Navigation */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2 text-slate-500" />
          Back to Webpages
        </button>
      </div>

      <form
        className="max-w-4xl w-full mx-auto space-y-6 pb-24"
        onSubmit={handleSubmit}
      >
        <button
          type="submit"
          className="bg-slate-950 hover:bg-slate-900 text-white font-semibold py-2.5 px-8 rounded-xl shadow-sm transition-all text-sm border border-slate-800 hover:scale-[1.01]"
        >
          Save Changes
        </button>
        {/* Page Header Card */}
        <div className="bg-white border border-slate-200/80 p-8 md:p-10 shadow-sm rounded-[20px]">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Edit Webpage:{" "}
                <span className="text-blue-600 font-semibold">
                  {form.title}
                </span>
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Configure layout options, rich content paragraphs, and active
                cards.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Current Template
                </span>
                <span className="text-sm font-bold text-slate-800 bg-slate-50 border border-slate-200/80 px-3 py-1 rounded-lg">
                  {form.templateType}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Page Settings Card */}
        <div className="bg-white border border-slate-200/80 p-6 md:p-8 shadow-sm rounded-[20px] space-y-6">
          <h3 className="text-md font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-500" /> Page Settings
          </h3>

          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <SeoFields
              titleLine={form.titleLine || ""}
              keywords={
                Array.isArray(form.keywords)
                  ? form.keywords.filter(Boolean)
                  : []
              }
              onTitleLineChange={(value) =>
                setForm((prev) => ({ ...prev, titleLine: value }))
              }
              onKeywordsChange={(next) =>
                setForm((prev) => ({ ...prev, keywords: next }))
              }
            />
          </div>

          {(isDesignOneOrTwo ||
            isDesignThree ||
            isDesignFour ||
            isDesignFive ||
            isDesignSix ||
            isDesignSeven) && (
            <div className="space-y-6">
              {/* Top Section View Toggle */}
              {!isDesignFour && !isCustomTemplate && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-10">
                    Top Section View Layout
                  </label>
                  <div className="inline-flex rounded-xl border border-slate-200 p-1 bg-slate-50 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setTopSectionView("all")}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${topSectionView === "all" ? "bg-white text-slate-900 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-900"}`}
                    >
                      All Inputs
                    </button>
                    <button
                      type="button"
                      onClick={() => setTopSectionView("bannerOnly")}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${topSectionView === "bannerOnly" ? "bg-white text-slate-900 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-900"}`}
                    >
                      Banner Image Only
                    </button>
                  </div>
                </div>
              )}

              {/* Title Fields */}
              {(topSectionView === "all" ||
                isDesignFour ||
                isDesignFive ||
                isDesignSix ||
                isDesignSeven) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Main Top Tag Line
                    </label>
                    <input
                      type="text"
                      name="firstTitle"
                      value={form.firstTitle}
                      onChange={handleChange}
                      placeholder="Enter main tagline..."
                      className="w-full rounded-xl border border-slate-200 bg-[#FAFAFA] hover:bg-slate-50/50 px-3.5 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 focus:bg-white text-slate-800 font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Main Short Tag Line
                    </label>
                    <input
                      type="text"
                      name="secondTitle"
                      value={form.secondTitle}
                      onChange={handleChange}
                      placeholder="Enter subtitle tagline..."
                      className="w-full rounded-xl border border-slate-200 bg-[#FAFAFA] hover:bg-slate-50/50 px-3.5 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 focus:bg-white text-slate-800 font-medium"
                    />
                  </div>
                </div>
              )}

              {/* Top Image (Design 3 has its own setup) */}
              {(topSectionView === "all" ||
                isDesignFour ||
                isDesignFive ||
                isDesignSix ||
                isDesignSeven) &&
                !isDesignThree && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Main Top Image (Laptop)
                    </label>
                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 bg-slate-50/30 flex flex-col items-center justify-center text-center">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          handleCloudinaryImageChange(e, "imageFirst")
                        }
                        ref={imageFirstInputRef}
                        className="hidden"
                        id="main-top-image-input"
                      />
                      <div className="mb-3 rounded-full bg-slate-100 p-2.5 text-slate-600 border border-slate-200/50">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <label
                        htmlFor="main-top-image-input"
                        className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-sm transition-colors mb-1"
                      >
                        Choose Image
                      </label>
                      <p className="text-[11px] text-slate-400">
                        Supports PNG, JPG, JPEG formats
                      </p>

                      {uploadingImageFirst && (
                        <div className="text-blue-600 text-xs font-semibold mt-2 animate-pulse">
                          Uploading to Cloudinary...
                        </div>
                      )}

                      {form.imageFirst && form.imageFirst.url && (
                        <div className="relative w-full max-w-sm h-48 border border-slate-200/80 rounded-xl overflow-hidden mt-4 bg-white shadow-sm">
                          <img
                            src={form.imageFirst.url}
                            alt="Main Top Image Preview"
                            className="object-cover w-full h-full"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteCloudinaryImage("imageFirst")
                            }
                            className="absolute top-2 right-2 bg-white/95 hover:bg-rose-50 border border-slate-200 text-rose-600 rounded-lg p-2 transition-colors shadow-sm"
                            title="Remove image"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              {(topSectionView === "all" ||
                isDesignFour ||
                isDesignFive ||
                isDesignSix ||
                isDesignSeven) &&
                !isDesignThree && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Main Top Image (Mobile)
                    </label>
                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 bg-slate-50/30 flex flex-col items-center justify-center text-center">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          handleCloudinaryImageChange(e, "imageFirstMobile")
                        }
                        ref={imageFirstMobileInputRef}
                        className="hidden"
                        id="main-top-image-mobile-input"
                      />
                      <div className="mb-3 rounded-full bg-slate-100 p-2.5 text-slate-600 border border-slate-200/50">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <label
                        htmlFor="main-top-image-mobile-input"
                        className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-sm transition-colors mb-1"
                      >
                        Choose Mobile Image
                      </label>
                      <p className="text-[11px] text-slate-400">
                        Recommended size: 800x1000 px
                      </p>

                      {uploadingImageFirstMobile && (
                        <div className="text-blue-600 text-xs font-semibold mt-2 animate-pulse">
                          Uploading to Cloudinary...
                        </div>
                      )}

                      {form.imageFirstMobile && form.imageFirstMobile.url && (
                        <div className="relative w-full max-w-sm h-48 border border-slate-200/80 rounded-xl overflow-hidden mt-4 bg-white shadow-sm">
                          <img
                            src={form.imageFirstMobile.url}
                            alt="Main Top Mobile Image Preview"
                            className="object-cover w-full h-full"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteCloudinaryImage("imageFirstMobile")
                            }
                            className="absolute top-2 right-2 bg-white/95 hover:bg-rose-50 border border-slate-200 text-rose-600 rounded-lg p-2 transition-colors shadow-sm"
                            title="Remove image"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              {/* Main Banner Image Option */}
              {topSectionView === "bannerOnly" &&
                !isDesignFour &&
                !isCustomTemplate && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Main Top Banner Image (Laptop)
                    </label>
                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 bg-slate-50/30 flex flex-col items-center justify-center text-center">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          handleCloudinaryImageChange(e, "bannerImage")
                        }
                        ref={bannerImageInputRef}
                        className="hidden"
                        id="banner-image-input"
                      />
                      <div className="mb-3 rounded-full bg-slate-100 p-2.5 text-slate-600 border border-slate-200/50">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <label
                        htmlFor="banner-image-input"
                        className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-sm transition-colors mb-1"
                      >
                        Choose Banner Image
                      </label>
                      <p className="text-[11px] text-slate-400">
                        Recommended size: 1200x400 px
                      </p>

                      {uploadingBannerImage && (
                        <div className="text-blue-600 text-xs font-semibold mt-2 animate-pulse">
                          Uploading to Cloudinary...
                        </div>
                      )}

                      {form.bannerImage && form.bannerImage.url && (
                        <div className="relative w-full max-w-md h-44 border border-slate-200/80 rounded-xl overflow-hidden mt-4 bg-white shadow-sm">
                          <img
                            src={form.bannerImage.url}
                            alt="Banner Preview"
                            className="object-cover w-full h-full"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteCloudinaryImage("bannerImage")
                            }
                            className="absolute top-2 right-2 bg-white/95 hover:bg-rose-50 border border-slate-200 text-rose-600 rounded-lg p-2 transition-colors shadow-sm"
                            title="Remove image"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              {topSectionView === "bannerOnly" &&
                !isDesignFour &&
                !isCustomTemplate && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Main Top Banner Image (Mobile)
                    </label>
                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 bg-slate-50/30 flex flex-col items-center justify-center text-center">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          handleCloudinaryImageChange(e, "bannerImageMobile")
                        }
                        ref={bannerImageMobileInputRef}
                        className="hidden"
                        id="banner-image-mobile-input"
                      />
                      <div className="mb-3 rounded-full bg-slate-100 p-2.5 text-slate-600 border border-slate-200/50">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <label
                        htmlFor="banner-image-mobile-input"
                        className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-sm transition-colors mb-1"
                      >
                        Choose Mobile Banner Image
                      </label>
                      <p className="text-[11px] text-slate-400">
                        Recommended size: 800x1000 px
                      </p>

                      {uploadingBannerImageMobile && (
                        <div className="text-blue-600 text-xs font-semibold mt-2 animate-pulse">
                          Uploading to Cloudinary...
                        </div>
                      )}

                      {form.bannerImageMobile && form.bannerImageMobile.url && (
                        <div className="relative w-full max-w-md h-44 border border-slate-200/80 rounded-xl overflow-hidden mt-4 bg-white shadow-sm">
                          <img
                            src={form.bannerImageMobile.url}
                            alt="Mobile Banner Preview"
                            className="object-cover w-full h-full"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteCloudinaryImage("bannerImageMobile")
                            }
                            className="absolute top-2 right-2 bg-white/95 hover:bg-rose-50 border border-slate-200 text-rose-600 rounded-lg p-2 transition-colors shadow-sm"
                            title="Remove image"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              {/* Tags Section */}
              {!isDesignFour && !isCustomTemplate && (
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Create Tags
                  </label>
                  <div className="space-y-2">
                    {form.createTags.map((tag, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={tag}
                          onChange={(e) =>
                            handleArrayTextChange(
                              "createTags",
                              index,
                              e.target.value,
                            )
                          }
                          placeholder="Add new tag tag..."
                          className="flex-1 rounded-lg border border-slate-200 bg-[#FAFAFA] hover:bg-slate-50/50 px-3.5 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 focus:bg-white text-slate-800"
                        />
                        <button
                          type="button"
                          onClick={() => addArrayTextRow("createTags")}
                          className="inline-flex items-center justify-center p-2 rounded-lg bg-slate-950 text-white hover:bg-slate-800 transition-colors shadow-sm"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        {form.createTags.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              removeArrayTextRow("createTags", index)
                            }
                            className="inline-flex items-center justify-center p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100/50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Posted By Checkboxes */}
              {!isDesignFour && !isCustomTemplate && (
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Posted By Role
                  </label>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={!!form.postedBy?.admin}
                        onChange={() => handlePostedByChange("admin")}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      Admin
                    </label>
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={!!form.postedBy?.user}
                        onChange={() => handlePostedByChange("user")}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      User
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Highlights Section */}
        {!isCustomTemplate && (
          <div className="bg-white border border-slate-200/80 p-6 md:p-8 shadow-sm rounded-[20px] space-y-6">
            <h3 className="text-md font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-slate-500" /> Highlights Data
            </h3>

            <div className="space-y-3">
              {form.highlights.map((row, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-3 p-3 bg-slate-50/50 border border-slate-200/50 rounded-xl"
                >
                  <input
                    type="text"
                    value={row.title}
                    onChange={(e) =>
                      handleObjectArrayChange(
                        "highlights",
                        index,
                        "title",
                        e.target.value,
                      )
                    }
                    placeholder="Highlight Title"
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 text-slate-800 font-semibold"
                  />
                  <input
                    type="text"
                    value={row.point}
                    onChange={(e) =>
                      handleObjectArrayChange(
                        "highlights",
                        index,
                        "point",
                        e.target.value,
                      )
                    }
                    placeholder="Bullet point description details..."
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 text-slate-700"
                  />
                  <div className="flex gap-1.5 items-center">
                    <button
                      type="button"
                      onClick={() =>
                        addObjectArrayRow("highlights", {
                          title: "",
                          point: "",
                        })
                      }
                      className="inline-flex items-center justify-center p-2 rounded-lg bg-slate-950 text-white hover:bg-slate-800 transition-colors shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    {form.highlights.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          removeObjectArrayRow("highlights", index)
                        }
                        className="inline-flex items-center justify-center p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100/50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Paragraph Section */}
        {!isCustomTemplate && (
          <div className="bg-white border border-slate-200/80 p-6 md:p-8 shadow-sm rounded-[20px] space-y-6">
            <h3 className="text-md font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <AlignLeft className="w-4 h-4 text-slate-500" /> Paragraph
              Sections
            </h3>

            <div className="space-y-6">
              {form.paragraphSections.map((row, index) => (
                <div
                  key={index}
                  className="border border-slate-200/80 rounded-xl p-5 md:p-6 bg-slate-50/20 relative space-y-4"
                >
                  <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Section #{index + 1}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          addObjectArrayRow(
                            "paragraphSections",
                            createEmptyParagraphSection(),
                          )
                        }
                        className="inline-flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Section
                      </button>
                      {form.paragraphSections.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            removeObjectArrayRow("paragraphSections", index)
                          }
                          className="inline-flex items-center justify-center p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100/50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Paragraph Heading Title
                    </label>
                    <input
                      type="text"
                      value={row.title}
                      onChange={(e) =>
                        handleObjectArrayChange(
                          "paragraphSections",
                          index,
                          "title",
                          e.target.value,
                        )
                      }
                      placeholder="Title or heading line..."
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 text-slate-800 font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Paragraph Description Content
                    </label>
                    <InlineRichTextEditor
                      value={row.description}
                      onChange={(html) =>
                        handleObjectArrayChange(
                          "paragraphSections",
                          index,
                          "description",
                          html,
                        )
                      }
                    />
                  </div>

                  {/* Dynamic Images and Bullet Points grid layout */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    {/* First image upload card */}
                    <div className="border border-slate-200/80 rounded-xl p-4 bg-white/50 space-y-3">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wide block">
                        First Image Asset
                      </span>
                      <input
                        id={`paragraph-first-image-${index}`}
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          handleParagraphSectionImageChange(
                            e,
                            index,
                            "firstImage",
                          )
                        }
                        className="hidden"
                      />
                      <label
                        htmlFor={`paragraph-first-image-${index}`}
                        className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-sm transition-colors"
                      >
                        Choose First Image
                      </label>

                      {uploadingParagraphFirstImage && (
                        <div className="text-blue-600 text-xs font-semibold animate-pulse">
                          Uploading image...
                        </div>
                      )}

                      {row.firstImage?.url && (
                        <div className="relative w-full h-36 border border-slate-200/80 rounded-lg overflow-hidden bg-white mt-2">
                          <img
                            src={row.firstImage.url}
                            alt="Paragraph First Preview"
                            className="object-cover w-full h-full"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteParagraphSectionImage(
                                index,
                                "firstImage",
                              )
                            }
                            className="absolute top-1.5 right-1.5 bg-white/95 border border-slate-200 text-rose-600 rounded-lg p-1.5 shadow-sm hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Second image upload card */}
                    <div className="border border-slate-200/80 rounded-xl p-4 bg-white/50 space-y-3">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wide block">
                        Second Image Asset
                      </span>
                      <input
                        id={`paragraph-second-image-${index}`}
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          handleParagraphSectionImageChange(
                            e,
                            index,
                            "secondImage",
                          )
                        }
                        className="hidden"
                      />
                      <label
                        htmlFor={`paragraph-second-image-${index}`}
                        className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-sm transition-colors"
                      >
                        Choose Second Image
                      </label>

                      {uploadingParagraphSecondImage && (
                        <div className="text-blue-600 text-xs font-semibold animate-pulse">
                          Uploading image...
                        </div>
                      )}

                      {row.secondImage?.url && (
                        <div className="relative w-full h-36 border border-slate-200/80 rounded-lg overflow-hidden bg-white mt-2">
                          <img
                            src={row.secondImage.url}
                            alt="Paragraph Second Preview"
                            className="object-cover w-full h-full"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteParagraphSectionImage(
                                index,
                                "secondImage",
                              )
                            }
                            className="absolute top-1.5 right-1.5 bg-white/95 border border-slate-200 text-rose-600 rounded-lg p-1.5 shadow-sm hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Paragraph bullet points */}
                    <div className="md:col-span-2 border border-slate-200/80 rounded-xl p-4 bg-white/50 space-y-3">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wide block">
                        Bullet Point Records
                      </span>
                      <div className="space-y-2">
                        {(row.bulletPoints || [""]).map(
                          (bullet, bulletIndex) => (
                            <div
                              key={bulletIndex}
                              className="flex items-center gap-2"
                            >
                              <input
                                type="text"
                                value={bullet}
                                onChange={(e) =>
                                  handleParagraphBulletPointChange(
                                    index,
                                    bulletIndex,
                                    e.target.value,
                                  )
                                }
                                placeholder="Type bullet point value..."
                                className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 text-slate-700"
                              />
                              <button
                                type="button"
                                onClick={() => addParagraphBulletPoint(index)}
                                className="inline-flex items-center justify-center p-2 rounded-lg bg-slate-950 text-white hover:bg-slate-800 transition-colors shadow-sm"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                              {(row.bulletPoints || []).length > 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeParagraphBulletPoint(
                                      index,
                                      bulletIndex,
                                    )
                                  }
                                  className="inline-flex items-center justify-center p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100/50 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notices Section (Design 4 specific) */}
        {isDesignFour && !isDesignSix && !isDesignSeven && (
          <div className="bg-white border border-slate-200/80 p-6 md:p-8 shadow-sm rounded-[20px] space-y-6">
            <h3 className="text-md font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-500" /> Page Notices
            </h3>

            <div className="space-y-4">
              {form.notices.map((row, index) => (
                <div
                  key={index}
                  className="mb-3 border border-slate-200 rounded-xl p-4 md:p-5 bg-slate-50/50 space-y-3 relative"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Notice Card #{index + 1}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          addObjectArrayRow("notices", {
                            title: "",
                            description: "",
                            type: "warning",
                          })
                        }
                        className="inline-flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Notice
                      </button>
                      {form.notices.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeObjectArrayRow("notices", index)}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100/50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Notice Title
                      </label>
                      <input
                        type="text"
                        value={row.title}
                        onChange={(e) =>
                          handleObjectArrayChange(
                            "notices",
                            index,
                            "title",
                            e.target.value,
                          )
                        }
                        placeholder="Notice Header Title..."
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 text-slate-800 font-semibold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Notice Accent Alert Type
                      </label>
                      <select
                        value={row.type}
                        onChange={(e) =>
                          handleObjectArrayChange(
                            "notices",
                            index,
                            "type",
                            e.target.value,
                          )
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 text-slate-700"
                      >
                        <option value="warning">Warning (Yellow/Orange)</option>
                        <option value="info">Info (Blue)</option>
                        <option value="danger">Danger (Red)</option>
                        <option value="success">Success (Green)</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Notice Description Details
                    </label>
                    <textarea
                      value={row.description}
                      onChange={(e) =>
                        handleObjectArrayChange(
                          "notices",
                          index,
                          "description",
                          e.target.value,
                        )
                      }
                      placeholder="Write details of warning notice..."
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 text-slate-700 h-20"
                    ></textarea>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search Locations Sidebar Settings (Design 4 specific) */}
        {isDesignFour && !isDesignSix && !isDesignSeven && (
          <>
            <div className="bg-white border border-slate-200/80 p-6 md:p-8 shadow-sm rounded-[20px] space-y-6">
              <h3 className="text-md font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <Share2 className="w-4 h-4 text-slate-500" /> Search Locations
                Sidebar
              </h3>

              <div className="space-y-3">
                {form.searchLocations.map((row, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 md:grid-cols-[2fr_1fr_2fr_auto] gap-3 p-3 bg-slate-50/50 border border-slate-200/55 rounded-xl items-center"
                  >
                    <input
                      type="text"
                      value={row.locationName}
                      onChange={(e) =>
                        handleObjectArrayChange(
                          "searchLocations",
                          index,
                          "locationName",
                          e.target.value,
                        )
                      }
                      placeholder="Location Name"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950/5 focus:border-slate-500 text-slate-800 font-semibold"
                    />
                    <input
                      type="text"
                      value={row.count}
                      onChange={(e) =>
                        handleObjectArrayChange(
                          "searchLocations",
                          index,
                          "count",
                          e.target.value,
                        )
                      }
                      placeholder="Count"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950/5 focus:border-slate-500 text-slate-700"
                    />
                    <input
                      type="text"
                      value={row.url}
                      onChange={(e) =>
                        handleObjectArrayChange(
                          "searchLocations",
                          index,
                          "url",
                          e.target.value,
                        )
                      }
                      placeholder="Redirect URL path..."
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-955/5 focus:border-slate-500 text-slate-700"
                    />
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          addObjectArrayRow("searchLocations", {
                            locationName: "",
                            count: "",
                            url: "",
                          })
                        }
                        className="inline-flex items-center justify-center p-2 rounded-lg bg-slate-950 text-white hover:bg-slate-800 transition-colors shadow-sm"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      {form.searchLocations.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            removeObjectArrayRow("searchLocations", index)
                          }
                          className="inline-flex items-center justify-center p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100/50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Advertisement Upload Section (Design 4) */}
              <div className="border border-slate-200/80 rounded-2xl p-5 bg-indigo-50/20 space-y-4">
                <span className="text-xs font-bold text-indigo-900 uppercase tracking-widest block">
                  Advertisement Media Array
                </span>

                {form.advertisements?.map((ad, index) => (
                  <div
                    key={index}
                    className="border border-slate-200 rounded-xl p-4 bg-white space-y-4 shadow-sm relative"
                  >
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <span className="font-semibold text-slate-700 text-xs uppercase tracking-wide">
                        Banner Advertisement #{index + 1}
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            addObjectArrayRow("advertisements", {
                              image: { url: "", key: "" },
                              url: "",
                            })
                          }
                          className="bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shadow-sm"
                        >
                          + Add Ad
                        </button>
                        {form.advertisements.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              removeObjectArrayRow("advertisements", index)
                            }
                            className="bg-rose-50 hover:bg-rose-100 border border-rose-100/50 text-rose-600 px-2 py-1 rounded-lg text-xs"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Image uploader area styled as custom yellow upload */}
                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                          Banner Image
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            id={`advertisement-image-${index}`}
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              handleAdvertisementImageChange(e, index)
                            }
                            className="hidden"
                          />
                          <label
                            htmlFor={`advertisement-image-${index}`}
                            className="inline-block bg-yellow-400 my-2 px-4 py-2 rounded-lg cursor-pointer font-semibold text-xs text-slate-900 hover:bg-yellow-500 transition-colors shadow-sm"
                          >
                            Upload Advertisement Image
                          </label>
                        </div>

                        {ad.image?.url && (
                          <div className="relative w-full h-32 border border-slate-200/80 rounded-lg overflow-hidden bg-gray-50 mt-2">
                            <img
                              src={ad.image.url}
                              alt={`Ad Preview ${index + 1}`}
                              className="object-contain w-full h-full"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteAdvertisementImage(index)
                              }
                              className="absolute top-1.5 right-1.5 bg-white/95 border border-slate-200 text-rose-600 rounded-lg p-1.5 hover:bg-rose-50 shadow-sm"
                              title="Remove image"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                          Redirect URL Link
                        </label>
                        <input
                          type="text"
                          value={ad.url}
                          onChange={(e) =>
                            handleObjectArrayChange(
                              "advertisements",
                              index,
                              "url",
                              e.target.value,
                            )
                          }
                          placeholder="https://example.com"
                          className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 focus:bg-white text-slate-800 font-semibold"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Table Data Section */}
        {!isCustomTemplate && (
          <div className="bg-white border border-slate-200/80 p-6 md:p-8 shadow-sm rounded-[20px] space-y-6">
            <h3 className="text-md font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" /> Table Rows Layout
            </h3>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Table Main Heading Title
                </label>
                <input
                  type="text"
                  name="tableTitle"
                  value={form.tableTitle}
                  onChange={handleChange}
                  placeholder="Table Category Title..."
                  className="w-full rounded-lg border border-slate-200 bg-[#FAFAFA] hover:bg-slate-50/50 px-3.5 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 focus:bg-white text-slate-800 font-bold"
                />
              </div>

              <div className="space-y-4 pt-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Table Data Row Records
                </label>
                {form.tableRows.map((row, index) => (
                  <div
                    key={index}
                    className="mb-4 border border-slate-200 rounded-xl p-4 bg-slate-50/30 space-y-3"
                  >
                    <div className="flex justify-between items-center gap-2">
                      <input
                        type="text"
                        value={row.column1}
                        onChange={(e) =>
                          handleObjectArrayChange(
                            "tableRows",
                            index,
                            "column1",
                            e.target.value,
                          )
                        }
                        placeholder="Column 1 Title (Left side)"
                        className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950/5 focus:border-slate-500 text-slate-800 font-semibold"
                      />
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            addObjectArrayRow("tableRows", {
                              column1: "",
                              column2: "",
                            })
                          }
                          className="inline-flex items-center justify-center p-2 rounded-lg bg-slate-950 text-white hover:bg-slate-800 transition-colors shadow-sm"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        {form.tableRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              removeObjectArrayRow("tableRows", index)
                            }
                            className="inline-flex items-center justify-center p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100/50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Column 2 Details Content (HTML/RichText)
                      </label>
                      <InlineRichTextEditor
                        value={row.column2}
                        onChange={(html) =>
                          handleObjectArrayChange(
                            "tableRows",
                            index,
                            "column2",
                            html,
                          )
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Blockquote Settings Section */}
        {!isCustomTemplate && (
          <div className="bg-white border border-slate-200/80 p-6 md:p-8 shadow-sm rounded-[20px] space-y-6">
            <h3 className="text-md font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Quote className="w-4 h-4 text-slate-500" /> Blockquote Settings
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Blockquote Main Title
                </label>
                <input
                  type="text"
                  name="blockquoteMainTitle"
                  value={form.blockquoteMainTitle}
                  onChange={handleChange}
                  placeholder="Main quote heading..."
                  className="w-full rounded-lg border border-slate-200 bg-[#FAFAFA] hover:bg-slate-50/50 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-905/5 focus:border-slate-500 focus:bg-white text-slate-800 font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Blockquote Left Para
                </label>
                <input
                  type="text"
                  name="blockquoteLeftTitle"
                  value={form.blockquoteLeftTitle}
                  onChange={handleChange}
                  placeholder="Author details or designation..."
                  className="w-full rounded-lg border border-slate-200 bg-[#FAFAFA] hover:bg-slate-50/50 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-905/5 focus:border-slate-500 focus:bg-white text-slate-800 font-semibold"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Blockquote HTML Description
              </label>
              <InlineRichTextEditor
                value={form.blockquoteDescription}
                onChange={(html) =>
                  setForm((prev) => ({ ...prev, blockquoteDescription: html }))
                }
              />
            </div>

            <div className="space-y-3 pt-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Blockquote Tags List
              </label>
              {form.blockquoteTags.map((tag, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tag}
                    onChange={(e) =>
                      handleArrayTextChange(
                        "blockquoteTags",
                        index,
                        e.target.value,
                      )
                    }
                    placeholder="Blockquote tag tag..."
                    className="flex-1 rounded-lg border border-slate-200 bg-[#FAFAFA] hover:bg-slate-50/50 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950/5 focus:border-slate-500 focus:bg-white text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => addArrayTextRow("blockquoteTags")}
                    className="inline-flex items-center justify-center p-2 rounded-lg bg-slate-950 text-white hover:bg-slate-800 transition-colors shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  {form.blockquoteTags.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        removeArrayTextRow("blockquoteTags", index)
                      }
                      className="inline-flex items-center justify-center p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100/50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Advertisement image section (Legacy Accordion Tag layout block) */}
        {!isDesignThree && !isDesignFour && !isCustomTemplate && (
          <div className="bg-white border border-slate-200/80 p-6 md:p-8 shadow-sm rounded-[20px] space-y-6">
            <h3 className="text-md font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Share2 className="w-4 h-4 text-slate-500" /> Sidebar
              Advertisement
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Advertisement Banner Image
                </label>
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 bg-slate-50/30 flex flex-col items-center justify-center text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handleCloudinaryImageChange(e, "advertisementImage")
                    }
                    ref={advertisementImageInputRef}
                    className="hidden"
                    id="sidebar-ad-image-input"
                  />
                  <div className="mb-3 rounded-full bg-slate-100 p-2.5 text-slate-600 border border-slate-200/50">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <label
                    htmlFor="sidebar-ad-image-input"
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-sm transition-colors mb-1"
                  >
                    Choose Image
                  </label>

                  {uploadingAdvertisementImage && (
                    <div className="text-blue-600 text-xs font-semibold mt-2 animate-pulse">
                      Uploading image...
                    </div>
                  )}

                  {form.advertisementImage?.url && (
                    <div className="relative w-full h-36 border border-slate-200/80 rounded-xl overflow-hidden mt-4 bg-white shadow-sm">
                      <img
                        src={form.advertisementImage.url}
                        alt="Advertisement Preview"
                        className="object-contain w-full h-full"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteCloudinaryImage("advertisementImage")
                        }
                        className="absolute top-2 right-2 bg-white/95 border border-slate-200 text-rose-600 rounded-lg p-1.5 shadow-sm hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Advertisement Redirect URL
                </label>
                <input
                  type="text"
                  name="advertisementUrl"
                  value={form.advertisementUrl}
                  onChange={handleChange}
                  placeholder="https://example.com"
                  className="w-full rounded-lg border border-slate-200 bg-[#FAFAFA] hover:bg-slate-50/50 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 focus:bg-white text-slate-800 font-semibold"
                />
              </div>
            </div>
          </div>
        )}

        {/* Accordion Tag Section */}
        {!isDesignThree && !isDesignFour && !isCustomTemplate && (
          <div className="bg-white border border-slate-200/80 p-6 md:p-8 shadow-sm rounded-[20px] space-y-6">
            <h3 className="text-md font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-slate-500" /> Accordion Tags
            </h3>

            <div className="space-y-3">
              {form.accordionTags.map((row, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-3 p-3 bg-slate-50/50 border border-slate-200/50 rounded-xl items-end"
                >
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Accordion Main Title
                    </label>
                    <input
                      type="text"
                      value={row.left}
                      onChange={(e) =>
                        handleObjectArrayChange(
                          "accordionTags",
                          index,
                          "left",
                          e.target.value,
                        )
                      }
                      placeholder="Title tag text..."
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 text-slate-800 font-semibold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Accordion Description Tag Line
                    </label>
                    <input
                      type="text"
                      value={row.right}
                      onChange={(e) =>
                        handleObjectArrayChange(
                          "accordionTags",
                          index,
                          "right",
                          e.target.value,
                        )
                      }
                      placeholder="Description tagline detail..."
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 text-slate-700"
                    />
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        addObjectArrayRow("accordionTags", {
                          left: "",
                          right: "",
                        })
                      }
                      className="inline-flex items-center justify-center p-2 rounded-lg bg-slate-950 text-white hover:bg-slate-800 transition-colors shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    {form.accordionTags.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          removeObjectArrayRow("accordionTags", index)
                        }
                        className="inline-flex items-center justify-center p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100/50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Side Thumb Blog Section */}
        {!isDesignThree && !isDesignFour && !isCustomTemplate && (
          <div className="bg-white border border-slate-200/80 p-6 md:p-8 shadow-sm rounded-[20px] space-y-6">
            <h3 className="text-md font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-slate-500" /> Side Thumb Blog
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Side Thumb Image
                </label>
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 bg-slate-50/30 flex flex-col items-center justify-center text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handleCloudinaryImageChange(e, "sideThumbImage")
                    }
                    ref={sideThumbImageInputRef}
                    className="hidden"
                    id="side-thumb-image-input"
                  />
                  <div className="mb-3 rounded-full bg-slate-100 p-2.5 text-slate-600 border border-slate-200/50">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <label
                    htmlFor="side-thumb-image-input"
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-sm transition-colors mb-1"
                  >
                    Choose Image
                  </label>

                  {uploadingSideThumbImage && (
                    <div className="text-blue-600 text-xs font-semibold mt-2 animate-pulse">
                      Uploading image...
                    </div>
                  )}

                  {form.sideThumbImage && (
                    <div className="relative w-full h-36 border border-slate-200/80 rounded-xl overflow-hidden mt-4 bg-white shadow-sm">
                      <img
                        src={form.sideThumbImage}
                        alt="Side Thumb Preview"
                        className="object-contain w-full h-full"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteCloudinaryImage("sideThumbImage")
                        }
                        className="absolute top-2 right-2 bg-white/95 border border-slate-200 text-rose-600 rounded-lg p-1.5 shadow-sm hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Side Thumb Name
                  </label>
                  <input
                    type="text"
                    name="sideThumbName"
                    value={form.sideThumbName}
                    onChange={handleChange}
                    placeholder="Enter author name..."
                    className="w-full rounded-lg border border-slate-200 bg-[#FAFAFA] hover:bg-slate-50/50 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 focus:bg-white text-slate-800 font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Side Thumb Designation
                  </label>
                  <input
                    type="text"
                    name="sideThumbDesignation"
                    value={form.sideThumbDesignation}
                    onChange={handleChange}
                    placeholder="Enter designation..."
                    className="w-full rounded-lg border border-slate-200 bg-[#FAFAFA] hover:bg-slate-50/50 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 focus:bg-white text-slate-800"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Side Thumb Description
                  </label>
                  <input
                    type="text"
                    name="sideThumbDescription"
                    value={form.sideThumbDescription}
                    onChange={handleChange}
                    placeholder="Brief description details..."
                    className="w-full rounded-lg border border-slate-200 bg-[#FAFAFA] hover:bg-slate-50/50 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 focus:bg-white text-slate-700"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6">
              <h4 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">
                Social Media URL Profiles
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Facebook Profile
                  </label>
                  <input
                    type="text"
                    name="facebookUrl"
                    value={form.facebookUrl}
                    onChange={handleChange}
                    placeholder="https://facebook.com/username"
                    className="w-full rounded-lg border border-slate-200 bg-[#FAFAFA] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 focus:bg-white text-slate-700"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    YouTube Channel
                  </label>
                  <input
                    type="text"
                    name="youtubeUrl"
                    value={form.youtubeUrl}
                    onChange={handleChange}
                    placeholder="https://youtube.com/c/channelname"
                    className="w-full rounded-lg border border-slate-200 bg-[#FAFAFA] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 focus:bg-white text-slate-700"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Instagram Handle
                  </label>
                  <input
                    type="text"
                    name="instaUrl"
                    value={form.instaUrl}
                    onChange={handleChange}
                    placeholder="https://instagram.com/username"
                    className="w-full rounded-lg border border-slate-200 bg-[#FAFAFA] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 focus:bg-white text-slate-700"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Google Business Link
                  </label>
                  <input
                    type="text"
                    name="googleUrl"
                    value={form.googleUrl}
                    onChange={handleChange}
                    placeholder="Google profile link..."
                    className="w-full rounded-lg border border-slate-200 bg-[#FAFAFA] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 focus:bg-white text-slate-700"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Design 5 Sections Card */}
        {isDesignFive && !isDesignSix && !isDesignSeven && (
          <div className="bg-white border border-slate-200/80 p-6 md:p-8 shadow-sm rounded-[20px] space-y-6">
            <h3 className="text-md font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-slate-500" /> Design 5 Layout
              Configuration
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Top Tag Chip Text
                </label>
                <input
                  type="text"
                  name="design5Chip"
                  value={form.design5Chip}
                  onChange={handleChange}
                  placeholder="e.g. Why Choose Us"
                  className="w-full rounded-lg border border-slate-200 bg-[#FAFAFA] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 focus:bg-white text-slate-800"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Main Heading Section
                </label>
                <input
                  type="text"
                  name="design5MainHeading"
                  value={form.design5MainHeading}
                  onChange={handleChange}
                  placeholder="Title heading text..."
                  className="w-full rounded-lg border border-slate-200 bg-[#FAFAFA] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 focus:bg-white text-slate-800 font-semibold"
                />
              </div>
            </div>

            {/* Grid Cards loop */}
            <div className="space-y-4 pt-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Grid Display Cards
              </label>
              {form.gridCards.map((card, index) => (
                <div
                  key={index}
                  className="border border-slate-200 rounded-xl p-4 bg-slate-50/20 relative space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Card Record #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setForm((prev) => {
                          const nextGridCards = [...(prev.gridCards || [])];
                          nextGridCards.splice(index, 1);
                          return { ...prev, gridCards: nextGridCards };
                        });
                      }}
                      className="inline-flex items-center justify-center p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100/50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Card image */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Card Image Cover
                      </span>
                      <div className="flex flex-col gap-2">
                        <label className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-sm transition-colors w-max">
                          Upload Image File
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              handleGridCardImageChange(e, index)
                            }
                            className="hidden"
                          />
                        </label>
                        {card.image?.url && (
                          <div className="relative w-full h-28 border border-slate-200/80 rounded-lg overflow-hidden mt-1 bg-white">
                            <img
                              src={card.image.url}
                              alt="Grid Card Preview"
                              className="object-cover w-full h-full"
                            />
                            <button
                              type="button"
                              onClick={() => handleDeleteGridCardImage(index)}
                              className="absolute top-1 right-1 bg-white/95 border border-slate-200 text-rose-600 rounded-lg p-1 hover:bg-rose-50 shadow-sm"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card details inputs */}
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                          Chip Category
                        </label>
                        <input
                          type="text"
                          value={card.chipName}
                          onChange={(e) => {
                            setForm((prev) => {
                              const nextGridCards = [...(prev.gridCards || [])];
                              nextGridCards[index].chipName = e.target.value;
                              return { ...prev, gridCards: nextGridCards };
                            });
                          }}
                          placeholder="e.g. Fintech"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-905/5 focus:border-slate-500 text-slate-800"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                          Card Title
                        </label>
                        <input
                          type="text"
                          value={card.title}
                          onChange={(e) => {
                            setForm((prev) => {
                              const nextGridCards = [...(prev.gridCards || [])];
                              nextGridCards[index].title = e.target.value;
                              return { ...prev, gridCards: nextGridCards };
                            });
                          }}
                          placeholder="e.g. Compliance Consulting"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-905/5 focus:border-slate-500 text-slate-800 font-semibold"
                        />
                      </div>
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                          Explore Redirect Link URL
                        </label>
                        <input
                          type="text"
                          value={card.link}
                          onChange={(e) => {
                            setForm((prev) => {
                              const nextGridCards = [...(prev.gridCards || [])];
                              nextGridCards[index].link = e.target.value;
                              return { ...prev, gridCards: nextGridCards };
                            });
                          }}
                          placeholder="/explore/consulting"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-905/5 focus:border-slate-500 text-slate-700"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => {
                  setForm((prev) => {
                    const nextGridCards = [...(prev.gridCards || [])];
                    nextGridCards.push({
                      image: { url: "", key: "" },
                      chipName: "",
                      title: "",
                      link: "",
                    });
                    return { ...prev, gridCards: nextGridCards };
                  });
                }}
                className="inline-flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all mt-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Grid Card
              </button>
            </div>
          </div>
        )}

        {/* Design 6 (Team Page) Sections Card */}
        {isDesignSix && (
          <div className="bg-white border border-slate-200/80 p-6 md:p-8 shadow-sm rounded-[20px] space-y-6">
            <h3 className="text-md font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-slate-500" /> Design 6 Team
              Sections
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Top Chip Text
                </label>
                <input
                  type="text"
                  name="design6Chip"
                  value={form.design6Chip}
                  onChange={handleChange}
                  placeholder="e.g. News & Insight"
                  className="w-full rounded-lg border border-slate-200 bg-[#FAFAFA] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 focus:bg-white text-slate-800"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Explore Area Link
                </label>
                <input
                  type="text"
                  name="design6ExploreLink"
                  value={form.design6ExploreLink}
                  onChange={handleChange}
                  placeholder="/explore-team"
                  className="w-full rounded-lg border border-slate-200 bg-[#FAFAFA] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 focus:bg-white text-slate-700"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Main Heading Section
              </label>
              <input
                type="text"
                name="design6MainHeading"
                value={form.design6MainHeading}
                onChange={handleChange}
                placeholder="The latest news and insights..."
                className="w-full rounded-lg border border-slate-200 bg-[#FAFAFA] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 focus:bg-white text-slate-800 font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Sub Heading / Paragraph description
              </label>
              <textarea
                name="design6SubHeading"
                value={form.design6SubHeading}
                onChange={handleChange}
                placeholder="Business consulting is a professional service..."
                className="w-full rounded-lg border border-slate-200 bg-[#FAFAFA] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 focus:bg-white text-slate-700 h-24"
              ></textarea>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Author Attribution
              </label>
              <input
                type="text"
                name="design6Author"
                value={form.design6Author}
                onChange={handleChange}
                placeholder="Mr. Daniel Scoot"
                className="w-full rounded-lg border border-slate-200 bg-[#FAFAFA] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 focus:bg-white text-slate-800"
              />
            </div>

            <div className="border-t border-slate-100 pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Mid Section Heading
                </label>
                <input
                  type="text"
                  name="design6MidHeading"
                  value={form.design6MidHeading}
                  onChange={handleChange}
                  placeholder="Excellent Service Provided by..."
                  className="w-full rounded-lg border border-slate-200 bg-[#FAFAFA] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 focus:bg-white text-slate-800 font-semibold"
                />
              </div>
              {/* <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Explore People Link</label>
                <input
                  type="text"
                  name="design6MidLink"
                  value={form.design6MidLink}
                  onChange={handleChange}
                  placeholder="/people-roster"
                  className="w-full rounded-lg border border-slate-200 bg-[#FAFAFA] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 focus:bg-white text-slate-700"
                />
              </div> */}
            </div>

            {/* Team Cards loop */}
            <div className="space-y-4 pt-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Team Profiles
              </label>
              {form.teamCards.map((card, index) => (
                <div
                  key={index}
                  className="border border-slate-200 rounded-xl p-4 bg-slate-50/20 relative space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Member #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setForm((prev) => {
                          const nextCards = [...(prev.teamCards || [])];
                          nextCards.splice(index, 1);
                          return { ...prev, teamCards: nextCards };
                        });
                      }}
                      className="inline-flex items-center justify-center p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100/50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Team image */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Avatar Photo
                      </span>
                      <div className="flex flex-col gap-2">
                        <label className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-sm transition-colors w-max">
                          Upload Photo
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              handleTeamCardImageChange(e, index)
                            }
                            className="hidden"
                          />
                        </label>
                        {card.image?.url && (
                          <div className="relative w-full h-28 border border-slate-200/80 rounded-lg overflow-hidden mt-1 bg-white">
                            <img
                              src={card.image.url}
                              alt="Team Preview"
                              className="object-cover w-full h-full"
                            />
                            <button
                              type="button"
                              onClick={() => handleDeleteTeamCardImage(index)}
                              className="absolute top-1 right-1 bg-white/95 border border-slate-200 text-rose-600 rounded-lg p-1 hover:bg-rose-50 shadow-sm"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Member details inputs */}
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={card.name}
                          onChange={(e) => {
                            setForm((prev) => {
                              const nextCards = [...(prev.teamCards || [])];
                              nextCards[index].name = e.target.value;
                              return { ...prev, teamCards: nextCards };
                            });
                          }}
                          placeholder="Mr. Anthony Brian"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 text-slate-800 font-semibold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                          Designation
                        </label>
                        <input
                          type="text"
                          value={card.designation}
                          onChange={(e) => {
                            setForm((prev) => {
                              const nextCards = [...(prev.teamCards || [])];
                              nextCards[index].designation = e.target.value;
                              return { ...prev, teamCards: nextCards };
                            });
                          }}
                          placeholder="Senior Advisor"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 text-slate-700"
                        />
                      </div>
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                          Qualification
                        </label>
                        <textarea
                          value={card.qualification || ""}
                          onChange={(e) => {
                            setForm((prev) => {
                              const nextCards = [...(prev.teamCards || [])];
                              nextCards[index].qualification = e.target.value;
                              return { ...prev, teamCards: nextCards };
                            });
                          }}
                          placeholder="Certified Hatha and Ashtanga Yoga instructor..."
                          rows={3}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 text-slate-700 resize-y min-h-[80px]"
                        />
                      </div>
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                          Specialization
                        </label>
                        <textarea
                          value={card.specialization || ""}
                          onChange={(e) => {
                            setForm((prev) => {
                              const nextCards = [...(prev.teamCards || [])];
                              nextCards[index].specialization = e.target.value;
                              return { ...prev, teamCards: nextCards };
                            });
                          }}
                          placeholder="Yoga instructor with 9 years of experience..."
                          rows={3}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 text-slate-700 resize-y min-h-[80px]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                          Phone Number
                        </label>
                        <input
                          type="text"
                          value={card.phone}
                          onChange={(e) => {
                            setForm((prev) => {
                              const nextCards = [...(prev.teamCards || [])];
                              nextCards[index].phone = e.target.value;
                              return { ...prev, teamCards: nextCards };
                            });
                          }}
                          placeholder="+91 656 786 53"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 text-slate-700"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                          Facebook URL
                        </label>
                        <input
                          type="text"
                          value={card.facebook}
                          onChange={(e) => {
                            setForm((prev) => {
                              const nextCards = [...(prev.teamCards || [])];
                              nextCards[index].facebook = e.target.value;
                              return { ...prev, teamCards: nextCards };
                            });
                          }}
                          placeholder="Facebook profile..."
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 text-slate-700"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                          Instagram URL
                        </label>
                        <input
                          type="text"
                          value={card.instagram}
                          onChange={(e) => {
                            setForm((prev) => {
                              const nextCards = [...(prev.teamCards || [])];
                              nextCards[index].instagram = e.target.value;
                              return { ...prev, teamCards: nextCards };
                            });
                          }}
                          placeholder="Instagram profile..."
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 text-slate-700"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                          YouTube URL
                        </label>
                        <input
                          type="text"
                          value={card.youtube}
                          onChange={(e) => {
                            setForm((prev) => {
                              const nextCards = [...(prev.teamCards || [])];
                              nextCards[index].youtube = e.target.value;
                              return { ...prev, teamCards: nextCards };
                            });
                          }}
                          placeholder="YouTube profile..."
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 text-slate-700"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => {
                  setForm((prev) => {
                    const nextCards = [...(prev.teamCards || [])];
                    nextCards.push({
                      image: { url: "", key: "" },
                      name: "",
                      designation: "",
                      qualification: "",
                      specialization: "",
                      phone: "",
                      facebook: "",
                      instagram: "",
                      youtube: "",
                    });
                    return { ...prev, teamCards: nextCards };
                  });
                }}
                className="inline-flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all mt-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Team Card
              </button>
            </div>
          </div>
        )}

        {/* Design 7 Sections Card */}
        {isDesignSeven && (
          <div className="bg-white border border-slate-200/80 p-6 md:p-8 shadow-sm rounded-[20px] space-y-6">
            <h3 className="text-md font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-slate-500" /> Design 7 Layout
              Config
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Top Chip Text
                </label>
                <input
                  type="text"
                  name="design7Chip"
                  value={form.design7Chip}
                  onChange={handleChange}
                  placeholder="News & Insight"
                  className="w-full rounded-lg border border-slate-200 bg-[#FAFAFA] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 focus:bg-white text-slate-800"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Explore Link URL
                </label>
                <input
                  type="text"
                  name="design7ExploreLink"
                  value={form.design7ExploreLink}
                  onChange={handleChange}
                  placeholder="/explore-properties"
                  className="w-full rounded-lg border border-slate-200 bg-[#FAFAFA] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 focus:bg-white text-slate-700"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Main Heading Section
              </label>
              <input
                type="text"
                name="design7MainHeading"
                value={form.design7MainHeading}
                onChange={handleChange}
                placeholder="The latest news and insights..."
                className="w-full rounded-lg border border-slate-200 bg-[#FAFAFA] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 focus:bg-white text-slate-800 font-semibold"
              />
            </div>

            {/* Gallery Grid Cards for Design 7 */}
            <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/50 space-y-4">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
                Gallery Image Cards
              </span>
              {form.gridCards.map((card, index) => (
                <div
                  key={index}
                  className="mb-4 border border-slate-200 rounded-xl p-4 bg-white relative space-y-4 shadow-sm"
                >
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Image Card #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setForm((prev) => {
                          const nextGridCards = [...(prev.gridCards || [])];
                          nextGridCards.splice(index, 1);
                          return { ...prev, gridCards: nextGridCards };
                        });
                      }}
                      className="inline-flex items-center justify-center p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100/50 transition-colors animate-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-semibold">
                        Card Cover Image
                      </span>
                      <div className="flex flex-col gap-2">
                        <input
                          id={`grid-card-image-${index}`}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleGridCardImageChange(e, index)}
                          className="hidden"
                        />
                        <label
                          htmlFor={`grid-card-image-${index}`}
                          className="inline-block bg-yellow-400 px-4 py-2 rounded-lg cursor-pointer w-max font-semibold text-xs text-slate-900 shadow-sm hover:bg-yellow-500 transition-colors"
                        >
                          Upload Image File
                        </label>
                        {card.image?.url && (
                          <div className="relative w-full h-32 border border-slate-200/80 rounded-lg overflow-hidden mt-1 bg-gray-50">
                            <img
                              src={card.image.url}
                              alt="Grid Card Cover"
                              className="object-cover w-full h-full"
                            />
                            <button
                              type="button"
                              onClick={() => handleDeleteGridCardImage(index)}
                              className="absolute top-1.5 right-1.5 bg-white/95 border border-slate-200 text-rose-600 rounded-lg p-1.5 hover:bg-rose-50"
                              title="Remove image"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                          Hover Chip Name
                        </label>
                        <input
                          type="text"
                          value={card.chipName}
                          onChange={(e) => {
                            setForm((prev) => {
                              const nextGridCards = [...(prev.gridCards || [])];
                              nextGridCards[index].chipName = e.target.value;
                              return { ...prev, gridCards: nextGridCards };
                            });
                          }}
                          placeholder="e.g. Fintech"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 text-slate-800"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                          Hover Title (Link text)
                        </label>
                        <input
                          type="text"
                          value={card.title}
                          onChange={(e) => {
                            setForm((prev) => {
                              const nextGridCards = [...(prev.gridCards || [])];
                              nextGridCards[index].title = e.target.value;
                              nextGridCards[index].gallerySlug = e.target.value
                                .toLowerCase()
                                .replace(/[\s\W-]+/g, "-")
                                .replace(/^-+|-+$/g, "");
                              return { ...prev, gridCards: nextGridCards };
                            });
                          }}
                          placeholder="e.g. Compliance Consulting"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 text-slate-800 font-semibold"
                        />
                      </div>

                      {/* Detail Page content card */}
                      <div className="md:col-span-2 mt-4 border border-blue-200/60 rounded-xl p-4 bg-blue-50/20 space-y-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-blue-900">
                            Gallery Detail Page Content
                          </span>
                          <span className="text-[10px] text-blue-600">
                            Generates detail page at /gallery/
                            {card.gallerySlug || "<auto-generated>"}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                              Date
                            </label>
                            <input
                              type="date"
                              value={card.galleryDate || ""}
                              onChange={(e) => {
                                setForm((prev) => {
                                  const nextGridCards = [
                                    ...(prev.gridCards || []),
                                  ];
                                  nextGridCards[index].galleryDate =
                                    e.target.value;
                                  return { ...prev, gridCards: nextGridCards };
                                });
                              }}
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 text-slate-700"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                              Posted By
                            </label>
                            <input
                              type="text"
                              value={card.postedBy || ""}
                              onChange={(e) => {
                                setForm((prev) => {
                                  const nextGridCards = [
                                    ...(prev.gridCards || []),
                                  ];
                                  nextGridCards[index].postedBy =
                                    e.target.value;
                                  return { ...prev, gridCards: nextGridCards };
                                });
                              }}
                              placeholder="Author name..."
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 text-slate-800"
                            />
                          </div>
                          <div className="md:col-span-2 space-y-1">
                            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                              Description Paragraph
                            </label>
                            <textarea
                              value={card.galleryDescription || ""}
                              onChange={(e) => {
                                setForm((prev) => {
                                  const nextGridCards = [
                                    ...(prev.gridCards || []),
                                  ];
                                  nextGridCards[index].galleryDescription =
                                    e.target.value;
                                  return { ...prev, gridCards: nextGridCards };
                                });
                              }}
                              rows="6"
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 text-slate-700"
                            ></textarea>
                          </div>
                        </div>

                        {/* Bento images list */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-blue-900 border-b border-blue-200/60 pb-1 block uppercase tracking-wider">
                            Bento Gallery Images
                          </label>
                          <div className="flex flex-wrap gap-2.5">
                            {(card.bentoImages || []).map((img, imgIdx) => (
                              <div
                                key={imgIdx}
                                className="relative w-16 h-16 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm"
                              >
                                <img
                                  src={img.url}
                                  alt="Bento"
                                  className="object-cover w-full h-full"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteBentoImage(index, imgIdx)
                                  }
                                  className="absolute top-1 right-1 bg-white/95 border border-slate-200 text-rose-600 rounded-md p-1 shadow-sm"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                            <div className="w-16 h-16 border-2 border-dashed border-blue-300 rounded-lg flex flex-col items-center justify-center bg-white cursor-pointer hover:bg-blue-50 transition-colors relative">
                              <input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={(e) =>
                                  handleBentoImageChange(e, index)
                                }
                                className="absolute inset-0 opacity-0 cursor-pointer"
                              />
                              <span className="text-sm text-blue-400 font-bold">
                                +
                              </span>
                              <span className="text-[8px] text-blue-500 font-semibold mt-0.5">
                                Upload
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* YouTube shorts */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-blue-900 border-b border-blue-200/60 pb-1 block uppercase tracking-wider">
                            YouTube Shorts
                          </label>
                          {(card.youtubeShorts || []).map((short, shortIdx) => (
                            <div
                              key={shortIdx}
                              className="flex gap-2 items-center bg-white p-2 rounded-lg border border-slate-200/80 w-full shadow-sm"
                            >
                              <input
                                type="text"
                                value={short.url}
                                onChange={(e) => {
                                  setForm((prev) => {
                                    const newCards = [...prev.gridCards];
                                    newCards[index].youtubeShorts[
                                      shortIdx
                                    ].url = e.target.value;
                                    return { ...prev, gridCards: newCards };
                                  });
                                }}
                                placeholder="YouTube Video URL..."
                                className="w-full rounded bg-slate-50 px-2.5 py-1.5 text-xs border border-slate-200 focus:outline-none focus:border-slate-400"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setForm((prev) => {
                                    const newCards = [...prev.gridCards];
                                    newCards[index].youtubeShorts.splice(
                                      shortIdx,
                                      1,
                                    );
                                    return { ...prev, gridCards: newCards };
                                  });
                                }}
                                className="text-rose-600 hover:text-rose-800 p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              setForm((prev) => {
                                const newCards = [...prev.gridCards];
                                if (!newCards[index].youtubeShorts)
                                  newCards[index].youtubeShorts = [];
                                newCards[index].youtubeShorts.push({ url: "" });
                                return { ...prev, gridCards: newCards };
                              });
                            }}
                            className="text-[10px] bg-blue-100 hover:bg-blue-200 text-blue-700 px-2.5 py-1 rounded font-bold transition-colors"
                          >
                            + Add Short URL
                          </button>
                        </div>

                        {/* YouTube videos */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-blue-900 border-b border-blue-200/60 pb-1 block uppercase tracking-wider">
                            YouTube Highlight Videos
                          </label>
                          {(card.youtubeVideos || []).map((vid, vidIdx) => (
                            <div
                              key={vidIdx}
                              className="flex gap-2 items-center bg-white p-2 rounded-lg border border-slate-200/80 w-full shadow-sm"
                            >
                              <input
                                type="text"
                                value={vid.url}
                                onChange={(e) => {
                                  setForm((prev) => {
                                    const newCards = [...prev.gridCards];
                                    newCards[index].youtubeVideos[vidIdx].url =
                                      e.target.value;
                                    return { ...prev, gridCards: newCards };
                                  });
                                }}
                                placeholder="YouTube Video URL..."
                                className="w-full rounded bg-slate-50 px-2.5 py-1.5 text-xs border border-slate-200 focus:outline-none focus:border-slate-400"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setForm((prev) => {
                                    const newCards = [...prev.gridCards];
                                    newCards[index].youtubeVideos.splice(
                                      vidIdx,
                                      1,
                                    );
                                    return { ...prev, gridCards: newCards };
                                  });
                                }}
                                className="text-rose-600 hover:text-rose-800 p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              setForm((prev) => {
                                const newCards = [...prev.gridCards];
                                if (!newCards[index].youtubeVideos)
                                  newCards[index].youtubeVideos = [];
                                newCards[index].youtubeVideos.push({ url: "" });
                                return { ...prev, gridCards: newCards };
                              });
                            }}
                            className="text-[10px] bg-blue-100 hover:bg-blue-200 text-blue-700 px-2.5 py-1 rounded font-bold transition-colors"
                          >
                            + Add Video URL
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => {
                  setForm((prev) => {
                    const nextGridCards = [...(prev.gridCards || [])];
                    nextGridCards.push({
                      image: { url: "", key: "" },
                      chipName: "",
                      title: "",
                      link: "",
                      galleryDate: "",
                      postedBy: "",
                      galleryDescription: "",
                      bentoImages: [],
                      youtubeShorts: [],
                      youtubeVideos: [],
                    });
                    return { ...prev, gridCards: nextGridCards };
                  });
                }}
                className="inline-flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all mt-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Gallery Card
              </button>
            </div>
          </div>
        )}

        {isDesignEight && (
          <div className="bg-white border border-slate-200/80 p-6 md:p-8 shadow-sm rounded-[20px] space-y-8">
            <h3 className="text-md font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-slate-500" /> Design 8 Amenities
              Layout
            </h3>

            <BannerImageField
              value={form.bannerImage}
              uploading={uploadingBannerImage}
              onChange={(e) => handleCloudinaryImageChange(e, "bannerImage")}
              onDelete={() => handleDeleteCloudinaryImage("bannerImage")}
              inputId="design8-banner-image-input"
              label="Header Banner Image (Laptop)"
            />

            <BannerImageField
              value={form.bannerImageMobile}
              uploading={uploadingBannerImageMobile}
              onChange={(e) =>
                handleCloudinaryImageChange(e, "bannerImageMobile")
              }
              onDelete={() => handleDeleteCloudinaryImage("bannerImageMobile")}
              inputId="design8-banner-image-mobile-input"
              label="Header Banner Image (Mobile)"
              hint="Recommended size: 800x1000 px"
              buttonLabel="Choose Mobile Banner Image"
            />

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Heading
              </label>
              <input
                type="text"
                name="design8Heading"
                value={form.design8Heading}
                onChange={handleChange}
                placeholder="Page heading..."
                className="w-full rounded-lg border border-slate-200 bg-[#FAFAFA] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 focus:bg-white text-slate-800 font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Description
              </label>
              <InlineRichTextEditor
                value={form.design8Description}
                onChange={(html) =>
                  setForm((prev) => ({ ...prev, design8Description: html }))
                }
              />
            </div>

            {/* <div className="space-y-4">
              <div>
                <h4 className="font-heading text-xl font-medium text-heading">
                  Hotel amenities
                </h4>
                <p className="mt-1 font-body text-sm text-muted">
                  Select the amenities available for this Hotel.
                </p>
              </div>
              {loadingHotelAmenities ? (
                <div className="flex min-h-32 items-center justify-center gap-2 font-body text-sm text-muted">
                  <Loader2 className="size-4 animate-spin text-primary" />
                  Loading amenities…
                </div>
              ) : hotelAmenitiesList.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
                  <p className="text-sm font-semibold text-slate-800">
                    No amenities found
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Add amenity records first, then assign them here.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {hotelAmenitiesList.map((item, idx) => {
                    const Icon = getHotelAmenityIcon(item.label);
                    const selected = (
                      form.design8HotelAmenities || []
                    ).includes(item.label);
                    return (
                      <label
                        key={item.label}
                        htmlFor={`design8-amenity-${idx}`}
                        className={cn(
                          "flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition-colors hover:border-slate-400",
                          selected && "border-slate-400 bg-slate-100",
                        )}
                      >
                        <span className="flex items-center gap-3">
                          <span className="flex size-10 items-center justify-center rounded-full bg-white text-primary">
                            <Icon className="size-5" />
                          </span>
                          <span className="font-body text-sm font-medium text-heading">
                            {item.label}
                          </span>
                        </span>
                        <Checkbox
                          id={`design8-amenity-${idx}`}
                          checked={selected}
                          onCheckedChange={() =>
                            toggleStringListValue(
                              "design8HotelAmenities",
                              item.label,
                            )
                          }
                        />
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="space-y-4">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Room amenities
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ROOM_AMENITY_CATEGORIES.map((cat) => {
                  const Icon = getRoomAmenityCategoryIcon(cat.category);
                  return (
                    <div
                      key={cat.category}
                      className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200"
                    >
                      <div className="flex items-center gap-2 font-medium text-primary">
                        <Icon className="w-5 h-5" /> {cat.category}
                      </div>
                      <div className="flex flex-col gap-2">
                        {cat.items.map((item) => {
                          const checked = (
                            form.design8RoomAmenities || []
                          ).includes(item);
                          return (
                            <div
                              key={item}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={`design8-room-${item}`}
                                checked={checked}
                                onCheckedChange={() =>
                                  toggleStringListValue(
                                    "design8RoomAmenities",
                                    item,
                                  )
                                }
                              />
                              <label
                                htmlFor={`design8-room-${item}`}
                                className="text-sm cursor-pointer select-none text-slate-700"
                              >
                                {item}
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div> */}
          </div>
        )}

        {isDesignNine && (
          <div className="bg-white border border-slate-200/80 p-6 md:p-8 shadow-sm rounded-[20px] space-y-8">
            <h3 className="text-md font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-slate-500" /> Design 9 Content
              Cards Layout
            </h3>

            <BannerImageField
              value={form.bannerImage}
              uploading={uploadingBannerImage}
              onChange={(e) => handleCloudinaryImageChange(e, "bannerImage")}
              onDelete={() => handleDeleteCloudinaryImage("bannerImage")}
              inputId="design9-banner-image-input"
              label="Header Banner Image (Laptop)"
            />

            <BannerImageField
              value={form.bannerImageMobile}
              uploading={uploadingBannerImageMobile}
              onChange={(e) =>
                handleCloudinaryImageChange(e, "bannerImageMobile")
              }
              onDelete={() => handleDeleteCloudinaryImage("bannerImageMobile")}
              inputId="design9-banner-image-mobile-input"
              label="Header Banner Image (Mobile)"
              hint="Recommended size: 800x1000 px"
              buttonLabel="Choose Mobile Banner Image"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Mini Heading
                </label>
                <input
                  type="text"
                  name="design9MiniHeading"
                  value={form.design9MiniHeading}
                  onChange={handleChange}
                  placeholder="e.g. Our Philosophy"
                  className="w-full rounded-lg border border-slate-200 bg-[#FAFAFA] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 focus:bg-white text-slate-800"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Big Heading
                </label>
                <input
                  type="text"
                  name="design9MainHeading"
                  value={form.design9MainHeading}
                  onChange={handleChange}
                  placeholder="Main section heading..."
                  className="w-full rounded-lg border border-slate-200 bg-[#FAFAFA] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 focus:bg-white text-slate-800 font-semibold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Description
              </label>
              <InlineRichTextEditor
                value={form.design9Description}
                onChange={(html) =>
                  setForm((prev) => ({ ...prev, design9Description: html }))
                }
              />
            </div>

            <div className="space-y-4">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Content Cards
              </label>
              {(form.design9Cards || []).map((card, index) => (
                <div
                  key={index}
                  className="border border-slate-200 rounded-xl p-4 bg-slate-50/20 relative space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Card #{index + 1}
                    </span>
                    {(form.design9Cards || []).length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setForm((prev) => {
                            const nextCards = [...(prev.design9Cards || [])];
                            nextCards.splice(index, 1);
                            return { ...prev, design9Cards: nextCards };
                          });
                        }}
                        className="inline-flex items-center justify-center p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100/50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Card Heading
                    </label>
                    <input
                      type="text"
                      value={card.heading}
                      onChange={(e) => {
                        setForm((prev) => {
                          const nextCards = [...(prev.design9Cards || [])];
                          nextCards[index] = {
                            ...nextCards[index],
                            heading: e.target.value,
                          };
                          return { ...prev, design9Cards: nextCards };
                        });
                      }}
                      placeholder="Section heading..."
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-500 text-slate-800 font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Card Description
                    </label>
                    <InlineRichTextEditor
                      value={card.description}
                      onChange={(html) => {
                        setForm((prev) => {
                          const nextCards = [...(prev.design9Cards || [])];
                          nextCards[index] = {
                            ...nextCards[index],
                            description: html,
                          };
                          return { ...prev, design9Cards: nextCards };
                        });
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Card Images
                    </label>
                    <div className="flex flex-wrap gap-2.5">
                      {(card.images || []).map((img, imgIdx) => (
                        <div
                          key={img.key || imgIdx}
                          className="relative w-20 h-20 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm"
                        >
                          <img
                            src={img.url}
                            alt={`Card ${index + 1} image ${imgIdx + 1}`}
                            className="object-cover w-full h-full"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteDesign9CardImage(index, imgIdx)
                            }
                            className="absolute top-1 right-1 bg-white/95 border border-slate-200 text-rose-600 rounded-md p-1 shadow-sm"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <label className="w-20 h-20 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center bg-white cursor-pointer hover:bg-slate-50 transition-colors relative">
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) =>
                            handleDesign9CardImagesChange(e, index)
                          }
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <span className="text-sm text-slate-400 font-bold">
                          +
                        </span>
                        <span className="text-[8px] text-slate-500 font-semibold mt-0.5">
                          Upload
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => {
                  setForm((prev) => ({
                    ...prev,
                    design9Cards: [
                      ...(prev.design9Cards || []),
                      createEmptyDesign9Card(),
                    ],
                  }));
                }}
                className="inline-flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all mt-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Content Card
              </button>
            </div>
          </div>
        )}
        <div className="w-full flex justify-end">
        <button
          type="submit"
          className="bg-slate-950 hover:bg-slate-900 text-white font-semibold py-2.5 px-8 rounded-xl shadow-sm transition-all text-sm border border-slate-800 hover:scale-[1.01]"
        >
          Save Changes
        </button>
          </div>
      </form>
    </div>
  );
};

export default EditWebpages;

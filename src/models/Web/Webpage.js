import { Schema, model, models } from "mongoose";

const ImageSchema = new Schema(
  {
    url: { type: String, default: "" },
    key: { type: String, default: "" },
  },
  { _id: false }
);
const HighlightSchema = new Schema(
  {
    title: { type: String, default: "" },
    point: { type: String, default: "" },
  },
  { _id: false }
);

const YoutubeShortSchema = new Schema(
  {
    url: { type: String, default: "" },
  },
  { _id: false }
);

const YoutubeVideoSchema = new Schema(
  {
    url: { type: String, default: "" },
  },
  { _id: false }
);

const GridCardSchema = new Schema(
  {
    image: { type: ImageSchema, default: () => ({}) },
    chipName: { type: String, default: "" },
    title: { type: String, default: "" },
    link: { type: String, default: "" },
    gallerySlug: { type: String, default: "" },
    galleryDescription: { type: String, default: "" },
    galleryDate: { type: String, default: "" },
    postedBy: { type: String, default: "" },
    bentoImages: { type: [ImageSchema], default: [] },
    youtubeShorts: { type: [YoutubeShortSchema], default: [] },
    youtubeVideos: { type: [YoutubeVideoSchema], default: [] },
  },
  { _id: false }
);

const TeamCardSchema = new Schema(
  {
    image: { type: ImageSchema, default: () => ({}) },
    name: { type: String, default: "" },
    designation: { type: String, default: "" },
    phone: { type: String, default: "" },
    facebook: { type: String, default: "" },
    instagram: { type: String, default: "" },
    youtube: { type: String, default: "" },
  },
  { _id: false }
);

const ParagraphSectionSchema = new Schema(
  {
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    firstImage: { type: ImageSchema, default: () => ({}) },
    secondImage: { type: ImageSchema, default: () => ({}) },
    bulletPoints: { type: [String], default: [""] },
  },
  { _id: false }
);

const TableRowSchema = new Schema(
  {
    column1: { type: String, default: "" },
    column2: { type: String, default: "" },
  },
  { _id: false }
);

const AccordionTagSchema = new Schema(
  {
    left: { type: String, default: "" },
    right: { type: String, default: "" },
  },
  { _id: false }
);

const NoticeSchema = new Schema(
  {
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    type: { type: String, default: "warning" },
  },
  { _id: false }
);

const SearchLocationSchema = new Schema(
  {
    locationName: { type: String, default: "" },
    count: { type: String, default: "" },
  },
  { _id: false }
);

const WebpageSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    active: { type: Boolean, default: true },
    templateType: {
      type: String,
      enum: ["design1", "design2", "design3", "design4", "design5", "design6", "design7"],
      default: "design1",
    },
    firstTitle: { type: String, default: "" },
    imageFirst: { type: ImageSchema, default: () => ({}) },
    bannerImage: { type: ImageSchema, default: () => ({}) },
    secondTitle: { type: String, default: "" },
    createTags: { type: [String], default: [""] },
    postedBy: {
      admin: { type: Boolean, default: false },
      user: { type: Boolean, default: false },
    },
    highlights: { type: [HighlightSchema], default: [{ title: "", point: "" }] },
    paragraphSections: {
      type: [ParagraphSectionSchema],
      default: [{ title: "", description: "", firstImage: {}, secondImage: {}, bulletPoints: [""] }],
    },
    paragraphFirstImage: { type: ImageSchema, default: () => ({}) },
    paragraphSecondImage: { type: ImageSchema, default: () => ({}) },
    tableTitle: { type: String, default: "" },
    tableRows: { type: [TableRowSchema], default: [{ column1: "", column2: "" }] },
    blockquoteMainTitle: { type: String, default: "" },
    blockquoteLeftTitle: { type: String, default: "" },
    blockquoteDescription: { type: String, default: "" },
    blockquoteTags: { type: [String], default: [""] },
    accordionTags: { type: [AccordionTagSchema], default: [{ left: "", right: "" }] },
    advertisementImage: { type: ImageSchema, default: () => ({}) },
    advertisementUrl: { type: String, default: "" },
    sideThumbImage: { type: ImageSchema, default: () => ({}) },
    sideThumbName: { type: String, default: "" },
    sideThumbDesignation: { type: String, default: "" },
    sideThumbDescription: { type: String, default: "" },
    facebookUrl: { type: String, default: "" },
    youtubeUrl: { type: String, default: "" },
    instaUrl: { type: String, default: "" },
    googleUrl: { type: String, default: "" },
    mainProfileImage: { type: ImageSchema, default: () => ({}) },
    imageGallery: { type: [ImageSchema], default: [] },
    notices: { type: [NoticeSchema], default: [] },
    boldParagraph: { type: String, default: "" },
    searchLocations: { type: [SearchLocationSchema], default: [] },
    design5Chip: { type: String, default: "" },
    design5MainHeading: { type: String, default: "" },
    gridCards: { type: [GridCardSchema], default: [] },
    design6Chip: { type: String, default: "" },
    design6ExploreLink: { type: String, default: "" },
    design6MainHeading: { type: String, default: "" },
    design6SubHeading: { type: String, default: "" },
    design6Author: { type: String, default: "" },
    design6MidHeading: { type: String, default: "" },
    design6MidLink: { type: String, default: "" },
    teamCards: { type: [TeamCardSchema], default: [] },
    design7Chip: { type: String, default: "" },
    design7ExploreLink: { type: String, default: "" },
    design7MainHeading: { type: String, default: "" },
  },
  { timestamps: true }
);

export default models.Webpage || model("Webpage", WebpageSchema);

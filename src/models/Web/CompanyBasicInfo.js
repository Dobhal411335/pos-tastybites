import mongoose from 'mongoose'

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, default: '' },
    key: { type: String, default: '' },
  },
  { _id: false }
)

const dayHoursSchema = new mongoose.Schema(
  {
    open: { type: String, default: '09:00' },
    close: { type: String, default: '22:00' },
    closed: { type: Boolean, default: false },
  },
  { _id: false }
)

const restaurantHoursSchema = new mongoose.Schema(
  {
    mode: { type: String, enum: ['same', 'custom'], default: 'same' },
    is24Hours: { type: Boolean, default: false },
    sameHours: { type: dayHoursSchema, default: () => ({}) },
    weekly: {
      sunday: { type: dayHoursSchema, default: () => ({}) },
      monday: { type: dayHoursSchema, default: () => ({}) },
      tuesday: { type: dayHoursSchema, default: () => ({}) },
      wednesday: { type: dayHoursSchema, default: () => ({}) },
      thursday: { type: dayHoursSchema, default: () => ({}) },
      friday: { type: dayHoursSchema, default: () => ({}) },
      saturday: { type: dayHoursSchema, default: () => ({}) },
    },
  },
  { _id: false }
)

const CompanyBasicInfoSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      index: true,
    },
    companyName: { type: String, default: '' },
    companyDomainName: { type: String, default: '' },
    contactNumbers: { type: [mongoose.Schema.Types.Mixed], default: [] },
    whatsappNumber: { type: String, default: '' },
    mainLogo: { type: imageSchema, default: () => ({ url: '', key: '' }) },
    footerLogo: { type: imageSchema, default: () => ({ url: '', key: '' }) },
    mobileUiLogo: { type: imageSchema, default: () => ({ url: '', key: '' }) },
    emails: { type: [String], default: [] },
    officeAddresses: { type: [String], default: [] },
    googleAddress: { type: String, default: '' },
    googleUrl: { type: String, default: '' },
    googleLink: { type: String, default: '' },
    facebookLink: { type: String, default: '' },
    instagramLink: { type: String, default: '' },
    youtubeLink: { type: String, default: '' },
    googleMapLink: { type: String, default: '' },
    googleTrackingTag: { type: String, default: '' },
    titleTagForMainLandingPage: { type: String, default: '' },
    keywords: { type: [String], default: [] },
    restaurantHours: {
      type: restaurantHoursSchema,
      default: () => ({}),
    },
  },
  { timestamps: true }
)

export default mongoose.models.CompanyBasicInfo || mongoose.model('CompanyBasicInfo', CompanyBasicInfoSchema)

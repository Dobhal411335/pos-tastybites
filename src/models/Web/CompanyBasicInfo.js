import mongoose from 'mongoose'

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, default: '' },
    key: { type: String, default: '' },
  },
  { _id: false }
)

const CompanyBasicInfoSchema = new mongoose.Schema(
  {
    companyName: { type: String, default: '' },
    companyDomainName: { type: String, default: '' },
    contactNumbers: { type: [String], default: [] },
    mainLogo: { type: imageSchema, default: () => ({ url: '', key: '' }) },
    footerLogo: { type: imageSchema, default: () => ({ url: '', key: '' }) },
    mobileUiLogo: { type: imageSchema, default: () => ({ url: '', key: '' }) },
    emails: { type: [String], default: [] },
    officeAddresses: { type: [String], default: [] },
    googleAddress: { type: String, default: '' },
    facebookLink: { type: String, default: '' },
    instagramLink: { type: String, default: '' },
    youtubeLink: { type: String, default: '' },
    googleMapLink: { type: String, default: '' },
    googleTrackingTag: { type: String, default: '' },
    titleTagForMainLandingPage: { type: String, default: '' },
    keywords: { type: [String], default: [] },
  },
  { timestamps: true }
)

export default mongoose.models.CompanyBasicInfo || mongoose.model('CompanyBasicInfo', CompanyBasicInfoSchema)
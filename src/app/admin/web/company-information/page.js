'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import {toast} from 'sonner'
import { Plus, Trash2, Upload, Save, ImageIcon, Globe, MapPin, Building, Share2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const logoFields = [
  { key: 'mainLogo', label: 'Main Logo', desc: 'Primary brand logo' },
  { key: 'footerLogo', label: 'Footer Logo', desc: 'Used in dark/footer areas' },
  { key: 'mobileUiLogo', label: 'Mobile App Logo', desc: 'Optimized for small screens' },
]

const createEmptyFormData = () => ({
  companyName: '',
  companyDomainName: '',
  contactNumbers: [''],
  mainLogo: { url: '', key: '' },
  footerLogo: { url: '', key: '' },
  mobileUiLogo: { url: '', key: '' },
  emails: [''],
  officeAddresses: [''],
  googleAddress: '',
  facebookLink: '',
  instagramLink: '',
  youtubeLink: '',
  googleMapLink: '',
  googleTrackingTag: '',
  titleTagForMainLandingPage: '',
  keywords: [''],
})

const normalizeArray = (value) => {
  if (!Array.isArray(value)) {
    return ['']
  }

  const cleaned = value
    .map((item) => String(item ?? '').trim())
    .filter(Boolean)

  return cleaned.length > 0 ? cleaned : ['']
}

const normalizeCompanyInfo = (record) => ({
  companyName: record?.companyName || '',
  companyDomainName: record?.companyDomainName || '',
  contactNumbers: normalizeArray(record?.contactNumbers),
  mainLogo: record?.mainLogo || { url: '', key: '' },
  footerLogo: record?.footerLogo || { url: '', key: '' },
  mobileUiLogo: record?.mobileUiLogo || { url: '', key: '' },
  emails: normalizeArray(record?.emails),
  officeAddresses: normalizeArray(record?.officeAddresses),
  googleAddress: record?.googleAddress || '',
  facebookLink: record?.facebookLink || '',
  instagramLink: record?.instagramLink || '',
  youtubeLink: record?.youtubeLink || '',
  googleMapLink: record?.googleMapLink || '',
  googleTrackingTag: record?.googleTrackingTag || '',
  titleTagForMainLandingPage: record?.titleTagForMainLandingPage || '',
  keywords: normalizeArray(record?.keywords),
})

const CompanyBasicInformation = () => {
  const [recordId, setRecordId] = useState(null)
  const [formData, setFormData] = useState(createEmptyFormData)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingField, setUploadingField] = useState('')
  const fileInputRefs = useRef({})

  useEffect(() => {
    const fetchCompanyInfo = async () => {
      try {
        const response = await fetch('/api/web/company-information')
        const result = await response.json()

        if (response.ok && result?.data) {
          setRecordId(result.data._id || null)
          setFormData(normalizeCompanyInfo(result.data))
        }
      } catch (error) {
        toast.error('Failed to load company basic info', { style: { borderRadius: "10px", border: "1px solid #fee2e2", background: "#fef2f2", color: "#991b1b" } })
      } finally {
        setLoading(false)
      }
    }

    fetchCompanyInfo()
  }, [])

  const handleScalarChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleArrayChange = (field, index, value) => {
    setFormData((prev) => {
      const nextValues = [...prev[field]]
      nextValues[index] = field === 'contactNumbers' ? value.replace(/\D/g, '').slice(0, 10) : value
      return { ...prev, [field]: nextValues }
    })
  }

  const addArrayItem = (field) => {
    setFormData((prev) => ({ ...prev, [field]: [...prev[field], ''] }))
  }

  const removeArrayItem = (field, index) => {
    setFormData((prev) => {
      const nextValues = prev[field].filter((_, itemIndex) => itemIndex !== index)
      return { ...prev, [field]: nextValues.length > 0 ? nextValues : [''] }
    })
  }

  const handleImageChange = async (field, event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingField(field)

    const existingKey = formData[field]?.key;
    if (existingKey) {
      try {
        await fetch(`/api/cloudinary?key=${existingKey}`, { method: 'DELETE' });
      } catch (e) {
        console.error('Failed to delete old image', e);
      }
    }

    const formDataUpload = new FormData()
    formDataUpload.append('file', file)

    try {
      const response = await fetch('/api/cloudinary', {
        method: 'POST',
        body: formDataUpload,
      })

      const result = await response.json()

      if (response.ok && result?.url) {
        setFormData((prev) => ({
          ...prev,
          [field]: {
            url: result.url,
            key: result.key || '',
          },
        }))
        toast.success('Image uploaded successfully', { style: { borderRadius: "10px", border: "1px solid #dcfce7", background: "#f0fdf4", color: "#166534" } })
      } else {
        toast.error(`Cloudinary upload failed: ${result?.error || 'Unknown error'}`, { style: { borderRadius: "10px", border: "1px solid #fee2e2", background: "#fef2f2", color: "#991b1b" } })
      }
    } catch (error) {
      toast.error(`Cloudinary upload error: ${error.message}`, { style: { borderRadius: "10px", border: "1px solid #fee2e2", background: "#fef2f2", color: "#991b1b" } })
    } finally {
      setUploadingField('')
      event.target.value = ''
    }
  }

  const handleRemoveImage = async (field) => {
    const existingKey = formData[field]?.key;
    if (existingKey) {
      try {
        await fetch(`/api/cloudinary?key=${existingKey}`, { method: 'DELETE' });
      } catch (e) {
        console.error('Failed to delete image', e);
      }
    }

    setFormData((prev) => ({
      ...prev,
      [field]: { url: '', key: '' },
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!formData.companyName.trim()) {
      toast.error('Company name is required', { style: { borderRadius: "10px", border: "1px solid #fee2e2", background: "#fef2f2", color: "#991b1b" } })
      return
    }

    const invalidContactNumber = formData.contactNumbers.find((number) => String(number).trim() && String(number).trim().length !== 10)
    if (invalidContactNumber !== undefined) {
      toast.error('Each contact number must be exactly 10 digits', { style: { borderRadius: "10px", border: "1px solid #fee2e2", background: "#fef2f2", color: "#991b1b" } })
      return
    }
    setSubmitting(true)

    try {
      const payload = {
        ...formData,
        contactNumbers: normalizeArray(formData.contactNumbers),
        emails: normalizeArray(formData.emails),
        officeAddresses: normalizeArray(formData.officeAddresses),
        keywords: normalizeArray(formData.keywords),
      }

      const response = await fetch('/api/web/company-information', {
        method: recordId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          ...(recordId ? { id: recordId } : {}),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result?.error || result?.message || 'Failed to save company info')
      }

      const savedRecord = result?.data || result?.companyBasicInfo || result
      setRecordId(savedRecord?._id || recordId)
      setFormData(normalizeCompanyInfo(savedRecord))
      toast.success(`Company basic info ${recordId ? 'updated' : 'created'} successfully`, { style: { borderRadius: "10px", border: "1px solid #dcfce7", background: "#f0fdf4", color: "#166534" } })
    } catch (error) {
      toast.error(error.message || 'Something went wrong', { style: { borderRadius: "10px", border: "1px solid #fee2e2", background: "#fef2f2", color: "#991b1b" } })
    } finally {
      setSubmitting(false)
    }
  }

  const renderListField = ({ field, label, placeholder, type = 'text', prefix = '', isTextarea = false }) => (
    <div className="space-y-4 rounded-[20px] border border-slate-100 bg-white p-6 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center justify-between gap-3 border-b border-slate-50 pb-4">
        <Label className="text-base font-semibold text-slate-800">{label}</Label>
        <Button type="button" variant="outline" size="sm" className="h-9 gap-2 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors" onClick={() => addArrayItem(field)}>
          <Plus className="h-4 w-4" />
          Add More
        </Button>
      </div>
      <div className="space-y-4 pt-2">
        {formData[field].map((value, index) => (
          <div key={`${field}-${index}`} className="flex gap-3 items-start group">
            {prefix ? (
              <div className="flex h-11 min-w-14 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-500 shrink-0">
                {prefix}
              </div>
            ) : null}
            {isTextarea ? (
              <Textarea
                value={value}
                onChange={(event) => handleArrayChange(field, index, event.target.value)}
                placeholder={placeholder}
                rows={3}
                className="min-h-25 rounded-xl border-slate-200 focus-visible:ring-slate-200 focus-visible:border-slate-400 bg-slate-50/50 transition-colors hover:bg-slate-50 resize-y"
              />
            ) : (
              <Input
                type={type}
                value={value}
                onChange={(event) => handleArrayChange(field, index, event.target.value)}
                placeholder={placeholder}
                className="h-11 rounded-xl border-slate-200 focus-visible:ring-slate-200 focus-visible:border-slate-400 bg-slate-50/50 transition-colors hover:bg-slate-50 w-full"
              />
            )}
            {formData[field].length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                className="h-11 w-11 shrink-0 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                onClick={() => removeArrayItem(field, index)}
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 p-6 font-sans pb-24">
      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-blue-50 text-blue-700 px-3 py-1 text-xs font-bold uppercase tracking-widest shadow-sm rounded-full">
                Web Settings
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 drop-shadow-sm">
              Company Info
            </h1>
            <p className="text-slate-500 font-medium mt-2">Manage your primary business information and brand assets.</p>
          </div>
          <div className="flex items-center gap-3">
            {loading && <span className="text-sm text-slate-500 font-medium animate-pulse">Loading...</span>}
            <Button type="submit" className="h-11 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-all hover:shadow-md" disabled={submitting}>
              <Save className="w-4 h-4 mr-2" />
              {submitting ? 'Saving Changes...' : 'Save Settings'}
            </Button>
          </div>
        </div>

        {/* Basic Info & Branding Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Basic Details */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="bg-white border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-slate-50 bg-white/50 pb-6">
                <div className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-slate-400" />
                  <CardTitle className="text-lg font-semibold text-slate-800">General Information</CardTitle>
                </div>
                <CardDescription className="text-slate-500">The core details of your business identity.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-600 ml-1">Company Name <span className="text-red-500">*</span></Label>
                    <Input name="companyName" value={formData.companyName} onChange={handleScalarChange} placeholder="e.g. Acme Corp" className="h-11 rounded-xl border-slate-200 focus-visible:ring-slate-200 focus-visible:border-slate-400 bg-slate-50/50 transition-colors hover:bg-slate-50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-600 ml-1">Domain Name</Label>
                    <Input name="companyDomainName" value={formData.companyDomainName} onChange={handleScalarChange} placeholder="e.g. acme.com" className="h-11 rounded-xl border-slate-200 focus-visible:ring-slate-200 focus-visible:border-slate-400 bg-slate-50/50 transition-colors hover:bg-slate-50" />
                  </div>
                </div>
                
                {/* Contact Numbers Custom List */}
                <div className="space-y-4 pt-4 border-t border-slate-50">
                  <div className="flex items-center justify-between gap-3">
                    <Label className="text-sm font-medium text-slate-600 ml-1">Contact Numbers</Label>
                    <Button type="button" variant="outline" size="sm" className="h-9 gap-2 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors" onClick={() => addArrayItem('contactNumbers')}>
                      <Plus className="h-4 w-4" />
                      Add Number
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {formData.contactNumbers.map((value, index) => (
                      <div key={`contact-${index}`} className="flex gap-3 group items-center">
                        <div className="flex h-11 w-14 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-500">
                          +91
                        </div>
                        <Input
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          value={value}
                          onChange={(event) => handleArrayChange('contactNumbers', index, event.target.value)}
                          placeholder="1234567890"
                          className="h-11 rounded-xl border-slate-200 focus-visible:ring-slate-200 focus-visible:border-slate-400 bg-slate-50/50 transition-colors hover:bg-slate-50"
                        />
                        {formData.contactNumbers.length > 1 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-11 w-11 shrink-0 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                            onClick={() => removeArrayItem('contactNumbers', index)}
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* List Fields */}
            {renderListField({ field: 'emails', label: 'Email Addresses', placeholder: 'contact@acme.com', type: 'email' })}
            {renderListField({ field: 'officeAddresses', label: 'Office Addresses', placeholder: '123 Business St, Suite 100...', isTextarea: true })}
            
            <Card className="bg-white border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-slate-50 bg-white/50 pb-6">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-slate-400" />
                  <CardTitle className="text-lg font-semibold text-slate-800">Location & Maps</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-600 ml-1">Google Address Map Code</Label>
                  <Textarea name="googleAddress" value={formData.googleAddress} onChange={handleScalarChange} placeholder="Paste iframe or map snippet here..." className="min-h-25 rounded-xl border-slate-200 focus-visible:ring-slate-200 focus-visible:border-slate-400 bg-slate-50/50 transition-colors hover:bg-slate-50 resize-y" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-600 ml-1">Google Maps URL</Label>
                  <Input name="googleMapLink" value={formData.googleMapLink} onChange={handleScalarChange} placeholder="https://maps.google.com/..." type="url" className="h-11 rounded-xl border-slate-200 focus-visible:ring-slate-200 focus-visible:border-slate-400 bg-slate-50/50 transition-colors hover:bg-slate-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Branding & Social */}
          <div className="space-y-8">
            <Card className="bg-white border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-slate-50 bg-white/50 pb-6">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-slate-400" />
                  <CardTitle className="text-lg font-semibold text-slate-800">Brand Assets</CardTitle>
                </div>
                <CardDescription className="text-slate-500">Upload your logos here.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-8">
                {logoFields.map((field) => (
                  <div key={field.key} className="space-y-3">
                    <div>
                      <Label className="text-sm font-semibold text-slate-700">{field.label}</Label>
                      <p className="text-xs text-slate-400">{field.desc}</p>
                    </div>
                    
                    <input
                      ref={(node) => {
                        fileInputRefs.current[field.key] = node
                      }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => handleImageChange(field.key, event)}
                    />
                    
                    {formData[field.key]?.url ? (
                      <div className="group relative h-40 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center">
                        <Image
                          src={formData[field.key].url}
                          alt={`${field.label} preview`}
                          fill
                          className="object-contain p-4"
                        />
                        <div className="absolute inset-0 bg-slate-900/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                           <Button
                             type="button"
                             size="sm"
                             variant="secondary"
                             className="rounded-lg shadow-sm"
                             onClick={() => fileInputRefs.current[field.key]?.click()}
                             disabled={uploadingField === field.key}
                           >
                             Replace
                           </Button>
                           <Button
                            type="button"
                            size="icon"
                            variant="destructive"
                            className="rounded-lg shadow-sm h-9 w-9 bg-red-500 text-white" 
                            onClick={() => handleRemoveImage(field.key)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className={`flex flex-col items-center justify-center h-40 w-full rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer ${uploadingField === field.key ? 'animate-pulse' : ''}`}
                        onClick={() => !uploadingField && fileInputRefs.current[field.key]?.click()}
                      >
                         <Upload className="h-6 w-6 text-slate-400 mb-2" />
                         <span className="text-sm font-medium text-slate-600">
                           {uploadingField === field.key ? 'Uploading...' : 'Click to upload'}
                         </span>
                         <span className="text-xs text-slate-400 mt-1">PNG, JPG up to 2MB</span>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-white border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-slate-50 bg-white/50 pb-6">
                <div className="flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-slate-400" />
                  <CardTitle className="text-lg font-semibold text-slate-800">Social Links</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-600 ml-1">Facebook</Label>
                  <Input name="facebookLink" value={formData.facebookLink} onChange={handleScalarChange} placeholder="https://facebook.com/..." type="url" className="h-11 rounded-xl border-slate-200 focus-visible:ring-slate-200 focus-visible:border-slate-400 bg-slate-50/50 transition-colors hover:bg-slate-50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-600 ml-1">Instagram</Label>
                  <Input name="instagramLink" value={formData.instagramLink} onChange={handleScalarChange} placeholder="https://instagram.com/..." type="url" className="h-11 rounded-xl border-slate-200 focus-visible:ring-slate-200 focus-visible:border-slate-400 bg-slate-50/50 transition-colors hover:bg-slate-50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-600 ml-1">YouTube</Label>
                  <Input name="youtubeLink" value={formData.youtubeLink} onChange={handleScalarChange} placeholder="https://youtube.com/..." type="url" className="h-11 rounded-xl border-slate-200 focus-visible:ring-slate-200 focus-visible:border-slate-400 bg-slate-50/50 transition-colors hover:bg-slate-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* SEO & Tracking Footer Area */}
          <div className="lg:col-span-3 space-y-8">
            <Card className="bg-white border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-slate-50 bg-white/50 pb-6">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-slate-400" />
                  <CardTitle className="text-lg font-semibold text-slate-800">SEO & Tracking</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-600 ml-1">Title Tag For Main Landing Page</Label>
                  <Input
                    name="titleTagForMainLandingPage"
                    value={formData.titleTagForMainLandingPage}
                    onChange={handleScalarChange}
                    placeholder="e.g. Best Services in City | Acme Corp"
                    className="h-11 rounded-xl border-slate-200 focus-visible:ring-slate-200 focus-visible:border-slate-400 bg-slate-50/50 transition-colors hover:bg-slate-50"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-600 ml-1">Google Tracking Tag</Label>
                  <Textarea
                    name="googleTrackingTag"
                    value={formData.googleTrackingTag}
                    onChange={handleScalarChange}
                    placeholder="Paste your <script> tags here..."
                    className="font-mono text-xs text-slate-600 min-h-[150px] rounded-xl border-slate-200 focus-visible:ring-slate-200 focus-visible:border-slate-400 bg-slate-50/50 transition-colors hover:bg-slate-50 resize-y"
                  />
                </div>
                
                <div className="pt-2">
                  {renderListField({ field: 'keywords', label: 'SEO Keywords', placeholder: 'e.g. real estate, apartment rentals' })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

      </form>
    </div>
  )
}

export default CompanyBasicInformation


"use client"
import { ArrowLeftIcon, Trash2 } from 'lucide-react';
import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from 'react';
import { useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontFamily } from '@tiptap/extension-font-family';
import { Typography } from '@tiptap/extension-typography';
import { TextAlign } from '@tiptap/extension-text-align';
import { Underline } from '@tiptap/extension-underline';
import { Link } from '@tiptap/extension-link';
import { Color } from '@tiptap/extension-color';
import { ListItem } from '@tiptap/extension-list-item';
import {toast} from "sonner"
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
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
} from 'lucide-react'
import Image from 'next/image';
const initialCreateTags = [''];
const initialHighlights = [{ title: '', point: '' }];
const createEmptyParagraphSection = () => ({
  title: '',
  description: '',
  firstImage: { url: '', key: '' },
  secondImage: { url: '', key: '' },
  bulletPoints: ['']
});
const initialParagraphSections = [createEmptyParagraphSection()];
const initialTableRows = [{ column1: '', column2: '' }];
const initialAccordionTags = [{ left: '', right: '' }];
const initialNotices = [{ title: "", description: "", type: "warning" }];
const initialSearchLocations = [{ locationName: "", count: "" }];
const initialGridCards = [{ image: { url: '', key: '' }, chipName: '', title: '', link: '', galleryDate: '', postedBy: '', galleryDescription: '', bentoImages: [], youtubeShorts: [], youtubeVideos: [] }];
const initialTeamCards = [{ image: { url: '', key: '' }, name: '', designation: '', phone: '', facebook: '', instagram: '', youtube: '' }];
const TEMPLATE_OPTIONS = [
  { value: "design1", label: "Design 1" },
  { value: "design2", label: "Design 2" },
  { value: "design3", label: "Design 3" },
  { value: "design4", label: "Design 4" },
  { value: "design5", label: "Design 5" },
  { value: "design6", label: "Design 6" },
  { value: "design7", label: "Design 7" },
];

const normalizeParagraphSections = (sections) => {
  if (!Array.isArray(sections) || sections.length === 0) {
    return initialParagraphSections;
  }
  return sections.map((section) => ({
    title: section?.title || '',
    description: section?.description || '',
    firstImage: section?.firstImage || { url: '', key: '' },
    secondImage: section?.secondImage || { url: '', key: '' },
    bulletPoints: Array.isArray(section?.bulletPoints) && section.bulletPoints.length > 0 ? section.bulletPoints : ['']
  }));
};

const InlineRichTextEditor = ({ value, onChange }) => {
  const editor = useEditor({
    extensions: [StarterKit, TextStyle, FontFamily, Typography, TextAlign, Underline, Link, Color, ListItem],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'min-h-[80px] border rounded-lg p-2 bg-gray-200 text-black font-semibold [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-semibold [&_p]:my-1 [&_ul]:list-disc [&_ul]:ml-6 [&_ol]:list-decimal [&_ol]:ml-6 [&_blockquote]:border-l-4 [&_blockquote]:border-gray-500 [&_blockquote]:pl-3 [&_blockquote]:italic',
      },
    },
    onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.getHTML()),
  });

  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '', false);
    }
  }, [editor, value]);

  if (!editor) return null;

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2 pb-2 mb-2 bg-white rounded-t px-2 pt-2">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={`p-1 rounded hover:bg-gray-100 ${editor.isActive('bold') ? 'bg-gray-200' : ''}`}><Bold className="w-4 h-4" /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-1 rounded hover:bg-gray-100 ${editor.isActive('italic') ? 'bg-gray-200' : ''}`}><Italic className="w-4 h-4" /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={`p-1 rounded hover:bg-gray-100 ${editor.isActive('underline') ? 'bg-gray-200' : ''}`}><UnderlineIcon className="w-4 h-4" /></button>
        <button type="button" onClick={() => editor.chain().focus().setParagraph().run()} className={`p-1 rounded hover:bg-gray-100 ${editor.isActive('paragraph') ? 'bg-gray-200' : ''}`}><PilcrowSquare className="w-4 h-4" /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`p-1 rounded hover:bg-gray-100 ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-200' : ''}`}><Heading1 className="w-4 h-4" /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-1 rounded hover:bg-gray-100 ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200' : ''}`}><Heading2 className="w-4 h-4" /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={`p-1 rounded hover:bg-gray-100 ${editor.isActive('heading', { level: 3 }) ? 'bg-gray-200' : ''}`}><Heading3 className="w-4 h-4" /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-1 rounded hover:bg-gray-100 ${editor.isActive('bulletList') ? 'bg-gray-200' : ''}`}><List className="w-4 h-4" /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`p-1 rounded hover:bg-gray-100 ${editor.isActive('orderedList') ? 'bg-gray-200' : ''}`}><ListOrdered className="w-4 h-4" /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`p-1 rounded hover:bg-gray-100 ${editor.isActive('blockquote') ? 'bg-gray-200' : ''}`}><Quote className="w-4 h-4" /></button>
        <button type="button" onClick={() => editor.chain().focus().undo().run()} className="p-1 rounded hover:bg-gray-100"><Undo className="w-4 h-4" /></button>
        <button type="button" onClick={() => editor.chain().focus().redo().run()} className="p-1 rounded hover:bg-gray-100"><Redo className="w-4 h-4" /></button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
};

const EditWebpagesContent = ({params}) => {
  const { id } = React.use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const activityId = id;

  const imageFirstInputRef = useRef(null);
  const bannerImageInputRef = useRef(null);

  // Loading and error state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const initialForm = {
    title: '',
    slug: '',
    active: true,
    templateType: 'design1',
    firstTitle: '',
    imageFirst: { url: '', key: '' },
    bannerImage: { url: '', key: '' },
    secondTitle: '',
    createTags: initialCreateTags,
    postedBy: { admin: false, user: false },
    highlights: initialHighlights,
    paragraphSections: initialParagraphSections,
    tableTitle: '',
    tableRows: initialTableRows,
    blockquoteMainTitle: '',
    blockquoteLeftTitle: '',
    blockquoteDescription: '',
    blockquoteTags: initialCreateTags,
    accordionTags: initialAccordionTags,
    advertisementImage: { url: '', key: '' },
    advertisementUrl: '',
    sideThumbImage: '',
    sideThumbImageKey: '',
    sideThumbName: '',
    sideThumbDesignation: '',
    sideThumbDescription: '',
    facebookUrl: '',
    youtubeUrl: '',
    instaUrl: '',
    googleUrl: '',
    mainProfileImage: { url: '', key: '' },
    imageGallery: [],
    notices: initialNotices,
    boldParagraph: '',
    searchLocations: initialSearchLocations,
    design5Chip: '',
    design5MainHeading: '',
    gridCards: initialGridCards,
    design6Chip: '',
    design6ExploreLink: '',
    design6MainHeading: '',
    design6SubHeading: '',
    design6Author: '',
    design6MidHeading: '',
    design6MidLink: '',
    teamCards: initialTeamCards,
    design7Chip: '',
    design7ExploreLink: '',
    design7MainHeading: '',
  };

  const [form, setForm] = useState(initialForm);
  const isDesignOneOrTwo = form.templateType === 'design1' || form.templateType === 'design2';
  const isDesignThree = form.templateType === 'design3';
  const isDesignFour = form.templateType === 'design4';
  const isDesignFive = form.templateType === 'design5';
  const isDesignSix = form.templateType === 'design6';
  const isDesignSeven = form.templateType === 'design7';
  const [topSectionView, setTopSectionView] = useState('all');
  const [uploadingImageFirst, setUploadingImageFirst] = useState(false);
  const [uploadingBannerImage, setUploadingBannerImage] = useState(false);
  const galleryInputRef = useRef(null);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const mainProfileImageInputRef = useRef(null);
  const [uploadingMainProfileImage, setUploadingMainProfileImage] = useState(false);
  const sideThumbImageInputRef = useRef(null);
  const [uploadingSideThumbImage, setUploadingSideThumbImage] = useState(false);
  const advertisementImageInputRef = useRef(null);
  const [uploadingParagraphFirstImage, setUploadingParagraphFirstImage] = useState(false);
  const [uploadingParagraphSecondImage, setUploadingParagraphSecondImage] = useState(false);
  const [uploadingAdvertisementImage, setUploadingAdvertisementImage] = useState(false);
  // Fetch webpage data on mount
  React.useEffect(() => {
    if (!activityId) return;
    setLoading(true);
    fetch(`/api/web/create_webpage/${activityId}`)
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {          // Defensive: ensure all fields exist
          setForm(prev => ({
            ...prev,
            ...data,
            templateType: data.templateType || 'design1',
            imageFirst: data.imageFirst || { url: '', key: '' },
            bannerImage: data.bannerImage || { url: '', key: '' },
            mainProfileImage: data.mainProfileImage || { url: '', key: '' },
            paragraphFirstImage: data.paragraphFirstImage || { url: '', key: '' },
            paragraphSecondImage: data.paragraphSecondImage || { url: '', key: '' },
            advertisementImage: data.advertisementImage || { url: '', key: '' },
            imageGallery: Array.isArray(data.imageGallery) ? data.imageGallery : [],
            createTags: Array.isArray(data.createTags) && data.createTags.length > 0 ? data.createTags : initialCreateTags,
            postedBy: data.postedBy || { admin: false, user: false },
            highlights: Array.isArray(data.highlights) && data.highlights.length > 0 ? data.highlights : initialHighlights,
            paragraphSections: normalizeParagraphSections(data.paragraphSections),
            tableTitle: data.tableTitle || '',
            tableRows: Array.isArray(data.tableRows) && data.tableRows.length > 0 ? data.tableRows : initialTableRows,
            blockquoteMainTitle: data.blockquoteMainTitle || '',
            blockquoteLeftTitle: data.blockquoteLeftTitle || '',
            blockquoteDescription: data.blockquoteDescription || '',
            blockquoteTags: Array.isArray(data.blockquoteTags) && data.blockquoteTags.length > 0 ? data.blockquoteTags : initialCreateTags,
            accordionTags: Array.isArray(data.accordionTags) && data.accordionTags.length > 0 ? data.accordionTags : initialAccordionTags,
            advertisementUrl: data.advertisementUrl || '',
            sideThumbImage: typeof data.sideThumbImage === 'string' ? data.sideThumbImage : data.sideThumbImage?.url || '',
            sideThumbImageKey: data.sideThumbImageKey || (typeof data.sideThumbImage === 'object' ? data.sideThumbImage?.key || '' : ''),
            sideThumbName: data.sideThumbName || '',
            sideThumbDesignation: data.sideThumbDesignation || '',
            sideThumbDescription: data.sideThumbDescription || '',
            facebookUrl: data.facebookUrl || '',
            youtubeUrl: data.youtubeUrl || '',
            instaUrl: data.instaUrl || '',
            googleUrl: data.googleUrl || '',
            notices: Array.isArray(data.notices) && data.notices.length > 0 ? data.notices : initialNotices,
            boldParagraph: data.boldParagraph || '',
            searchLocations: Array.isArray(data.searchLocations) && data.searchLocations.length > 0 ? data.searchLocations : initialSearchLocations,
            design5Chip: data.design5Chip || '',
            design5MainHeading: data.design5MainHeading || '',
            gridCards: Array.isArray(data.gridCards) && data.gridCards.length > 0 ? data.gridCards : initialGridCards,
            design6Chip: data.design6Chip || '',
            design6ExploreLink: data.design6ExploreLink || '',
            design6MainHeading: data.design6MainHeading || '',
            design6SubHeading: data.design6SubHeading || '',
            design6Author: data.design6Author || '',
            design6MidHeading: data.design6MidHeading || '',
            design6MidLink: data.design6MidLink || '',
            teamCards: Array.isArray(data.teamCards) && data.teamCards.length > 0 ? data.teamCards : initialTeamCards,
            design7Chip: data.design7Chip || '',
            design7ExploreLink: data.design7ExploreLink || '',
            design7MainHeading: data.design7MainHeading || '',
          }));
        } else {
          setError(data.error || 'Could not load webpage');
        }
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to fetch webpage: ' + err.message);
        setLoading(false);
      });
  }, [activityId]);

  const handleCloudinaryImageChange = async (e, key) => {
    const file = e.target.files[0];
    if (!file) return;
    if (key === 'imageFirst') setUploadingImageFirst(true);
    if (key === 'bannerImage') setUploadingBannerImage(true);
    if (key === 'mainProfileImage') setUploadingMainProfileImage(true);
    if (key === 'sideThumbImage') setUploadingSideThumbImage(true);
    if (key === 'paragraphFirstImage') setUploadingParagraphFirstImage(true);
    if (key === 'paragraphSecondImage') setUploadingParagraphSecondImage(true);
    if (key === 'advertisementImage') setUploadingAdvertisementImage(true);
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);
    try {
      const res = await fetch('/api/cloudinary', {
        method: 'POST',
        body: formDataUpload
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setForm(prev => ({
          ...prev,
          ...(key === 'sideThumbImage'
            ? {
              sideThumbImage: data.url,
              sideThumbImageKey: data.key || ''
            }
            : {
              [key]: { url: data.url, key: data.key || '' }
            })
        }));
        toast.success('Image uploaded!');
      } else {
        toast.error('Cloudinary upload failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      toast.error('Cloudinary upload error: ' + err.message);
    }
    if (key === 'imageFirst') setUploadingImageFirst(false);
    if (key === 'bannerImage') setUploadingBannerImage(false);
    if (key === 'mainProfileImage') setUploadingMainProfileImage(false);
    if (key === 'sideThumbImage') setUploadingSideThumbImage(false);
    if (key === 'paragraphFirstImage') setUploadingParagraphFirstImage(false);
    if (key === 'paragraphSecondImage') setUploadingParagraphSecondImage(false);
    if (key === 'advertisementImage') setUploadingAdvertisementImage(false);
  };
  const handleDeleteCloudinaryImage = async (key) => {
    if (key === 'sideThumbImage') {
      const sideThumbImageKey = form.sideThumbImageKey;
      if (!sideThumbImageKey) {
        setForm(prev => ({ ...prev, sideThumbImage: '', sideThumbImageKey: '' }));
        return;
      }
      try {
        const res = await fetch('/api/cloudinary', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicId: sideThumbImageKey }),
        });
        if (res.ok) {
          setForm(prev => ({ ...prev, sideThumbImage: '', sideThumbImageKey: '' }));
          toast.success('Image deleted!');
        }
      } catch (err) {
        toast.error('Delete error: ' + err.message);
      }
      return;
    }

    const image = form[key];
    if (image && image.key) {
      try {
        await fetch('/api/cloudinary', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicId: image.key }),
        });
        setForm(prev => ({ ...prev, [key]: { url: '', key: '' } }));
        toast.success('Image deleted!');
      } catch (err) {
        toast.error('Delete error: ' + err.message);
      }
    }
  };

  const handleGridCardImageChange = async (e, index) => {
    const file = e.target.files[0];
    if (!file) return;
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);
    try {
      const res = await fetch(`/api/cloudinary`, {
        method: 'POST',
        body: formDataUpload
      });
      const data = await res.json();
      if (res.ok && data.url) {
        const newCards = [...form.gridCards];
        newCards[index] = {
          ...newCards[index],
          image: { url: data.url, key: data.key || '' }
        };
        setForm(prev => ({ ...prev, gridCards: newCards }));
        toast.success('Grid card image uploaded!');
      } else {
        toast.error('Upload failed: ' + (data.error || 'Unknown'));
      }
    } catch (err) {
      toast.error('Upload error: ' + err.message);
    }
  };

  const handleDeleteGridCardImage = async (index) => {
    const card = form.gridCards[index];
    if (card && card.image && card.image.key) {
      try {
        await fetch('/api/cloudinary', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicId: card.image.key }),
        });
      } catch (err) {
        console.error('Failed to delete grid card image from Cloudinary', err);
      }
    }
    const newCards = [...form.gridCards];
    newCards[index] = { ...newCards[index], image: { url: '', key: '' } };
    setForm(prev => ({ ...prev, gridCards: newCards }));
  };
  const handleBentoImageChange = async (e, cardIndex) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    try {
      const uploadPromises = files.map(async (file) => {
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        const res = await fetch(`/api/cloudinary`, {
          method: 'POST',
          body: formDataUpload
        });
        const data = await res.json();
        if (res.ok && data.url) {
          return { url: data.url, key: data.key || '' };
        } else {
          throw new Error(data.error || 'Unknown error');
        }
      });

      const uploadedImages = await Promise.all(uploadPromises);

      setForm((prev) => {
        const newCards = [...prev.gridCards];
        const bentoImages = newCards[cardIndex].bentoImages || [];
        newCards[cardIndex] = {
          ...newCards[cardIndex],
          bentoImages: [...bentoImages, ...uploadedImages]
        };
        return { ...prev, gridCards: newCards };
      });
      toast.success(`${uploadedImages.length} Bento image(s) uploaded!`);
    } catch (err) {
      toast.error('Upload error: ' + err.message);
    }
  };

  const handleDeleteBentoImage = async (cardIndex, imgIndex) => {
    const card = form.gridCards[cardIndex];
    if (card && card.bentoImages && card.bentoImages[imgIndex] && card.bentoImages[imgIndex].key) {
      try {
        await fetch('/api/cloudinary', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicId: card.bentoImages[imgIndex].key }),
        });
      } catch (err) {
        console.error('Failed to delete bento image from Cloudinary', err);
      }
    }
    setForm((prev) => {
      const newCards = [...prev.gridCards];
      const newBentoImages = [...(newCards[cardIndex].bentoImages || [])];
      newBentoImages.splice(imgIndex, 1);
      newCards[cardIndex] = { ...newCards[cardIndex], bentoImages: newBentoImages };
      return { ...prev, gridCards: newCards };
    });
  };

  const handleTeamCardImageChange = async (e, index) => {
    const file = e.target.files[0];
    if (!file) return;
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);
    try {
      const res = await fetch(`/api/cloudinary`, {
        method: 'POST',
        body: formDataUpload
      });
      const data = await res.json();
      if (res.ok && data.url) {
        const newCards = [...form.teamCards];
        newCards[index] = {
          ...newCards[index],
          image: { url: data.url, key: data.key || '' }
        };
        setForm(prev => ({ ...prev, teamCards: newCards }));
        toast.success('Team card image uploaded!');
      } else {
        toast.error('Upload failed: ' + (data.error || 'Unknown'));
      }
    } catch (err) {
      toast.error('Upload error: ' + err.message);
    }
  };

  const handleDeleteTeamCardImage = async (index) => {
    const card = form.teamCards[index];
    if (card && card.image && card.image.key) {
      try {
        await fetch('/api/cloudinary', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicId: card.image.key }),
        });
      } catch (err) {
        console.error('Failed to delete team card image from Cloudinary', err);
      }
    }
    const newCards = [...form.teamCards];
    newCards[index] = { ...newCards[index], image: { url: '', key: '' } };
    setForm(prev => ({ ...prev, teamCards: newCards }));
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
    setForm((prev) => ({ ...prev, [name]: [...(prev[name] || []), ''] }));
  };

  const removeArrayTextRow = (name, index) => {
    setForm((prev) => ({ ...prev, [name]: (prev[name] || []).filter((_, i) => i !== index) }));
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
    setForm((prev) => ({ ...prev, [name]: (prev[name] || []).filter((_, i) => i !== index) }));
  };

  const addParagraphBulletPoint = (paragraphIndex) => {
    setForm((prev) => {
      const nextParagraphs = [...(prev.paragraphSections || [])];
      const currentBullets = nextParagraphs[paragraphIndex]?.bulletPoints || [''];
      nextParagraphs[paragraphIndex] = {
        ...nextParagraphs[paragraphIndex],
        bulletPoints: [...currentBullets, ''],
      };
      return { ...prev, paragraphSections: nextParagraphs };
    });
  };

  const removeParagraphBulletPoint = (paragraphIndex, bulletIndex) => {
    setForm((prev) => {
      const nextParagraphs = [...(prev.paragraphSections || [])];
      const currentBullets = nextParagraphs[paragraphIndex]?.bulletPoints || [''];
      const updatedBullets = currentBullets.filter((_, idx) => idx !== bulletIndex);
      nextParagraphs[paragraphIndex] = {
        ...nextParagraphs[paragraphIndex],
        bulletPoints: updatedBullets.length > 0 ? updatedBullets : [''],
      };
      return { ...prev, paragraphSections: nextParagraphs };
    });
  };

  const handleParagraphBulletPointChange = (paragraphIndex, bulletIndex, value) => {
    setForm((prev) => {
      const nextParagraphs = [...(prev.paragraphSections || [])];
      const currentBullets = [...(nextParagraphs[paragraphIndex]?.bulletPoints || [''])];
      currentBullets[bulletIndex] = value;
      nextParagraphs[paragraphIndex] = {
        ...nextParagraphs[paragraphIndex],
        bulletPoints: currentBullets,
      };
      return { ...prev, paragraphSections: nextParagraphs };
    });
  };

  const hasNonEmptyText = (value) => typeof value === 'string' && value.trim().length > 0;
  const hasAnyNonEmptyTag = (tags) => Array.isArray(tags) && tags.some((tag) => hasNonEmptyText(tag));
  const hasPostedBySelection = (postedBy) => !!(postedBy?.admin || postedBy?.user);

  const hasTopTextSectionContent = (data) => {
    return (
      hasNonEmptyText(data?.firstTitle) ||
      hasNonEmptyText(data?.secondTitle) ||
      hasAnyNonEmptyTag(data?.createTags) ||
      hasPostedBySelection(data?.postedBy) ||
      !!data?.imageFirst?.url
    );
  };

  const hasTopBannerContent = (data) => !!data?.bannerImage?.url;

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { _id, __v, createdAt, updatedAt, ...restPayload } = form;
      const payload = { ...restPayload };
      const firstParagraphSection = Array.isArray(payload.paragraphSections) && payload.paragraphSections.length > 0
        ? payload.paragraphSections[0]
        : null;
      if (firstParagraphSection) {
        payload.paragraphFirstImage = firstParagraphSection.firstImage || { url: '', key: '' };
        payload.paragraphSecondImage = firstParagraphSection.secondImage || { url: '', key: '' };
      }

      const hasTopText = hasTopTextSectionContent(payload);
      const hasTopBanner = hasTopBannerContent(payload);
      if (hasTopText && hasTopBanner) {
        toast.error('Please fill either top text section or top banner image, not both.');
        return;
      }


      const res = await fetch(`/api/web/create_webpage/${activityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('webpage updated successfully!');
        // Refetch webpage data so form stays in sync
        fetch(`/api/web/create_webpage/${activityId}`)
          .then(res => res.json())
          .then(data => {
            if (data && !data.error) {
              setForm(prev => ({
                ...prev,
                ...data,
                templateType: data.templateType || 'design1',
                imageFirst: data.imageFirst || { url: '', key: '' },
                bannerImage: data.bannerImage || { url: '', key: '' },
                mainProfileImage: data.mainProfileImage || { url: '', key: '' },
                paragraphFirstImage: data.paragraphFirstImage || { url: '', key: '' },
                paragraphSecondImage: data.paragraphSecondImage || { url: '', key: '' },
                advertisementImage: data.advertisementImage || { url: '', key: '' },
                imageGallery: Array.isArray(data.imageGallery) ? data.imageGallery : [],
                createTags: Array.isArray(data.createTags) && data.createTags.length > 0 ? data.createTags : initialCreateTags,
                postedBy: data.postedBy || { admin: false, user: false },
                highlights: Array.isArray(data.highlights) && data.highlights.length > 0 ? data.highlights : initialHighlights,
                paragraphSections: normalizeParagraphSections(data.paragraphSections),
                tableTitle: data.tableTitle || '',
                tableRows: Array.isArray(data.tableRows) && data.tableRows.length > 0 ? data.tableRows : initialTableRows,
                blockquoteMainTitle: data.blockquoteMainTitle || '',
                blockquoteLeftTitle: data.blockquoteLeftTitle || '',
                blockquoteDescription: data.blockquoteDescription || '',
                blockquoteTags: Array.isArray(data.blockquoteTags) && data.blockquoteTags.length > 0 ? data.blockquoteTags : initialCreateTags,
                accordionTags: Array.isArray(data.accordionTags) && data.accordionTags.length > 0 ? data.accordionTags : initialAccordionTags,
                advertisementUrl: data.advertisementUrl || '',
                sideThumbImage: typeof data.sideThumbImage === 'string' ? data.sideThumbImage : data.sideThumbImage?.url || '',
                sideThumbImageKey: data.sideThumbImageKey || (typeof data.sideThumbImage === 'object' ? data.sideThumbImage?.key || '' : ''),
                sideThumbName: data.sideThumbName || '',
                sideThumbDesignation: data.sideThumbDesignation || '',
                sideThumbDescription: data.sideThumbDescription || '',
                facebookUrl: data.facebookUrl || '',
                youtubeUrl: data.youtubeUrl || '',
                instaUrl: data.instaUrl || '',
                googleUrl: data.googleUrl || ''
              }));
            }
          });
      } else {
        toast.error(data.error || 'Failed to update webpage');
      }
    } catch (err) {
      toast.error('Failed to update webpage: ' + err.message);
    }
  };

  return (
    <div className="w-full max-w-360 mx-auto space-y-8 p-6 font-sans pb-24 mt-8">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-blue-50 text-blue-700 px-3 py-1 text-xs font-bold uppercase tracking-widest shadow-sm rounded-full">
              Web Settings
            </span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 drop-shadow-sm">
            Edit Webpage
          </h1>
          <p className="text-slate-500 font-medium text-sm mt-2">Update the content and configuration for this webpage.</p>
        </div>
        <Button
          type="button"
          onClick={() => router.back()}
          variant="outline"
          className="h-11 flex items-center px-6 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors font-bold shadow-sm"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to Webpages
        </Button>
      </div>

      <Card className="rounded-[20px] border-slate-100 shadow-sm bg-white overflow-hidden">
        <CardHeader className="border-b border-slate-50 bg-white/50 pb-6">
          <CardTitle className="text-2xl font-semibold text-slate-800 tracking-tight">
            Editing: <span className="text-blue-600">{form.title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 md:p-10">
          <form onSubmit={handleSubmit} className="space-y-8">
        <div className="mb-4">
          <Label className="text-sm font-medium text-slate-700 mb-2 block">Frontend Design</Label>
          <Input type="text" value={form.templateType} disabled readOnly className="h-11 rounded-xl border-slate-200 bg-slate-100 text-slate-500 font-medium" />
        </div>
        {(isDesignOneOrTwo || isDesignThree || isDesignFour || isDesignFive || isDesignSix || isDesignSeven) && (
          <>
            {!isDesignFour && !isDesignFive && !isDesignSix && !isDesignSeven && (
              <div className="mb-4">
                <label className="block mb-2 font-semibold">Top Section View</label>
                <div className="inline-flex rounded-md border border-gray-300 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setTopSectionView('all')}
                    className={`px-4 py-2 font-semibold ${topSectionView === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
                  >
                    All Inputs
                  </button>
                  <button
                    type="button"
                    onClick={() => setTopSectionView('bannerOnly')}
                    className={`px-4 py-2 font-semibold ${topSectionView === 'bannerOnly' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
                  >
                    Banner Image Only
                  </button>
                </div>
              </div>
            )}

            {(topSectionView === 'all' || isDesignFour || isDesignFive || isDesignSix || isDesignSeven) && (
              <>
                {/* Main Top Title Tag Line */}
                <div className="mb-4">
                  <Label className="text-sm font-medium text-slate-700 mb-2 block">Main Top Title Tag Line</Label>
                  <Input type="text" name="secondTitle" value={form.secondTitle} onChange={handleChange} placeholder="Type Here" className="h-11 rounded-xl border-slate-200 focus-visible:ring-blue-500 bg-slate-50/50 text-slate-700" />
                </div>

                {/* Main Top Image (Cloudinary Upload) */}
                {!isDesignThree && (
                  <div className="mb-4">
                    <Label className="text-sm font-medium text-slate-700 mb-2 block">Main Top Image</Label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => handleCloudinaryImageChange(e, 'imageFirst')}
                      ref={imageFirstInputRef}
                      className="hidden"
                    />
                    <button
                      type="button"
                      className="mb-2 flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded"
                      onClick={() => imageFirstInputRef.current && imageFirstInputRef.current.click()}
                    >
                      <span>Upload Here</span>
                    </button>
                    {uploadingImageFirst && <div className="text-blue-600 font-semibold">Uploading...</div>}
                    {form.imageFirst && form.imageFirst.url && (
                      <div className="relative w-full h-48 border rounded overflow-hidden mb-2">
                        <Image height={250} width={150}
                          src={form.imageFirst.url}
                          alt="Image First Preview"
                          className="object-contain w-full h-full"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteCloudinaryImage('imageFirst')}
                          className="absolute top-1 right-1 bg-white bg-opacity-80 rounded-full p-1 hover:bg-red-200"
                          title="Remove image"
                        >
                          <Trash2 className="w-5 h-5 text-red-600" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {/* Main Short Tag Line */}

                <div className="mb-4">
                  <label className="block mb-1 font-semibold">Main Short Tag Line</label>
                  <input type="text" name="firstTitle" value={form.firstTitle} onChange={handleChange} placeholder="Type Here" className="w-full rounded-md p-3 bg-gray-200 font-semibold text-black" />
                </div>
                {/* Create Tag */}
                {!isDesignFour && !isDesignFive && !isDesignSix && !isDesignSeven && (
                  <div className="mb-4">
                    <label className="block mb-1 font-semibold">Create Tag</label>
                    {form.createTags.map((tag, index) => (
                      <div key={index} className="flex items-center gap-2 mb-2">
                        <input
                          type="text"
                          value={tag}
                          onChange={(e) => handleArrayTextChange('createTags', index, e.target.value)}
                          placeholder="Type Here"
                          className="flex-1 rounded-md p-3 bg-gray-200 font-semibold"
                        />
                        <button type="button" onClick={() => addArrayTextRow('createTags')} className="bg-blue-700 text-white px-3 py-2 rounded">+</button>
                        {form.createTags.length > 1 && (
                          <button type="button" onClick={() => removeArrayTextRow('createTags', index)} className="bg-red-500 text-white px-3 py-2 rounded"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Posted By */}
                {!isDesignFour && !isDesignFive && !isDesignSix && !isDesignSeven && (
                  <div className="mb-4">
                    <label className="block mb-2 font-semibold">Posted By</label>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 font-semibold">
                        <input type="checkbox" checked={!!form.postedBy?.admin} onChange={() => handlePostedByChange('admin')} /> Admin
                      </label>
                      <label className="flex items-center gap-2 font-semibold">
                        <input type="checkbox" checked={!!form.postedBy?.user} onChange={() => handlePostedByChange('user')} /> User
                      </label>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Main Top Banner Image (Cloudinary Upload) */}
            {(topSectionView === 'bannerOnly' && !isDesignFour && !isDesignFive && !isDesignSix && !isDesignSeven) && (
              <div className="mb-4">
                <label className="block mb-1 font-semibold">Main Top Banner Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => handleCloudinaryImageChange(e, 'bannerImage')}
                  ref={bannerImageInputRef}
                  className="hidden"
                />
                <button
                  type="button"
                  className="mb-2 flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded"
                  onClick={() => bannerImageInputRef.current && bannerImageInputRef.current.click()}
                >
                  <span>Upload Here</span>
                </button>
                {uploadingBannerImage && <div className="text-blue-600 font-semibold">Uploading...</div>}
                {form.bannerImage && form.bannerImage.url && (
                  <div className="relative w-full h-48 border rounded overflow-hidden mb-2">
                    <Image height={250} width={150}
                      src={form.bannerImage.url}
                      alt="Banner Image Preview"
                      className="object-contain w-full h-full"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteCloudinaryImage('bannerImage')}
                      className="absolute top-1 right-1 bg-white bg-opacity-80 rounded-full p-1 hover:bg-red-200"
                      title="Remove image"
                    >
                      <Trash2 className="w-5 h-5 text-red-600" />
                    </button>
                  </div>
                )}
              </div>
            )}


            {/* Highlights */}
            {!isDesignFive && !isDesignSix && !isDesignSeven && (
              <div className="mb-4 border rounded p-3 bg-blue-50">
                <label className="block mb-2 font-semibold">Highlights</label>
                {form.highlights.map((row, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 mb-2">
                    <input
                      type="text"
                      value={row.title}
                      onChange={(e) => handleObjectArrayChange('highlights', index, 'title', e.target.value)}
                      placeholder="Highlight Title"
                      className="rounded-md p-3 bg-gray-200 font-semibold"
                    />
                    <input
                      type="text"
                      value={row.point}
                      onChange={(e) => handleObjectArrayChange('highlights', index, 'point', e.target.value)}
                      placeholder="Point"
                      className="rounded-md p-3 bg-gray-200 font-semibold"
                    />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => addObjectArrayRow('highlights', { title: '', point: '' })} className="bg-blue-700 text-white px-3 py-2 rounded">+</button>
                      {form.highlights.length > 1 && (
                        <button type="button" onClick={() => removeObjectArrayRow('highlights', index)} className="bg-red-500 text-white px-3 py-2 rounded"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Paragraph Section */}
            {!isDesignFive && !isDesignSix && !isDesignSeven && (
              <div className="mb-4 border rounded p-3 bg-gray-50">
                <label className="block mb-2 font-semibold">Paragraph Section</label>
                {form.paragraphSections.map((row, index) => (
                  <div key={index} className="mb-3 border border-gray-200 rounded p-3">
                    <label className="block mb-2 font-semibold">Paragraph Heading</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={row.title}
                        onChange={(e) => handleObjectArrayChange('paragraphSections', index, 'title', e.target.value)}
                        placeholder="Title Text Line"
                        className="flex-1 rounded-md p-3 bg-gray-200 font-semibold"
                      />
                      <button type="button" onClick={() => addObjectArrayRow('paragraphSections', createEmptyParagraphSection())} className="bg-blue-700 text-white px-3 py-2 rounded">+</button>
                      {form.paragraphSections.length > 1 && (
                        <button type="button" onClick={() => removeObjectArrayRow('paragraphSections', index)} className="bg-red-500 text-white px-3 py-2 rounded"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                    <label className="block mb-2 font-semibold my-5">Paragraph Description</label>
                    <InlineRichTextEditor
                      value={row.description}
                      onChange={(html) => handleObjectArrayChange('paragraphSections', index, 'description', html)}
                    />
                    <div className="flex flex-col gap-3 mt-2">
                      <div>
                        <input id={`paragraph-first-image-${index}`} type="file" accept="image/*" onChange={e => handleParagraphSectionImageChange(e, index, 'firstImage')} className="hidden" />
                        <label htmlFor={`paragraph-first-image-${index}`} className="inline-block bg-yellow-400 my-2 px-4 py-2 rounded cursor-pointer">Upload First Image</label>
                        {uploadingParagraphFirstImage && <div className="text-blue-600 text-sm my-2">Uploading...</div>}
                        {row.firstImage?.url && (
                          <div className="relative w-full h-48 border rounded overflow-hidden mb-2">
                            <Image height={250} width={150}
                              src={row.firstImage.url}
                              alt="Paragraph First Image Preview"
                              className="object-contain w-full h-full"
                            />
                            <button
                              type="button"
                              onClick={() => handleDeleteParagraphSectionImage(index, 'firstImage')}
                              className="absolute top-1 right-1 bg-white bg-opacity-80 rounded-full p-1 hover:bg-red-200"
                              title="Remove image"
                            >
                              <Trash2 className="w-5 h-5 text-red-600" />
                            </button>
                          </div>
                        )}
                      </div>
                      <div>
                        <input id={`paragraph-second-image-${index}`} type="file" accept="image/*" onChange={e => handleParagraphSectionImageChange(e, index, 'secondImage')} className="hidden" />
                        <label htmlFor={`paragraph-second-image-${index}`} className="inline-block bg-gray-200 px-4 py-2 rounded cursor-pointer">Upload Second Image</label>
                        {uploadingParagraphSecondImage && <div className="text-blue-600 text-sm my-2">Uploading...</div>}
                        {row.secondImage?.url && (
                          <div className="relative w-full h-48 border rounded overflow-hidden mb-2">
                            <Image height={250} width={150}
                              src={row.secondImage.url}
                              alt="Paragraph Second Image Preview"
                              className="object-contain w-full h-full"
                            />
                            <button
                              type="button"
                              onClick={() => handleDeleteParagraphSectionImage(index, 'secondImage')}
                              className="absolute top-1 right-1 bg-white bg-opacity-80 rounded-full p-1 hover:bg-red-200"
                              title="Remove image"
                            >
                              <Trash2 className="w-5 h-5 text-red-600" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="border border-gray-200 rounded p-3 bg-white">
                        <label className="block mb-2 font-semibold">Bullet Points</label>
                        {(row.bulletPoints || ['']).map((bullet, bulletIndex) => (
                          <div key={bulletIndex} className="flex items-center gap-2 mb-2">
                            <input
                              type="text"
                              value={bullet}
                              onChange={(e) => handleParagraphBulletPointChange(index, bulletIndex, e.target.value)}
                              placeholder="Add bullet point"
                              className="flex-1 rounded-md p-3 bg-gray-200 font-semibold"
                            />
                            <button type="button" onClick={() => addParagraphBulletPoint(index)} className="bg-blue-700 text-white px-3 py-2 rounded">+</button>
                            {(row.bulletPoints || []).length > 1 && (
                              <button type="button" onClick={() => removeParagraphBulletPoint(index, bulletIndex)} className="bg-red-500 text-white px-3 py-2 rounded"><Trash2 className="w-4 h-4" /></button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isDesignFour && !isDesignSix && !isDesignSeven && (
              <>
                <div className="mb-4 border rounded p-3 bg-red-50">
                  <label className="block mb-2 font-semibold">Notices (Design 4)</label>
                  {form.notices.map((row, index) => (
                    <div key={index} className="mb-3 border border-red-200 rounded p-3 bg-white">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                        <div>
                          <label className="block mb-1 font-semibold text-sm">Notice Title</label>
                          <input
                            type="text"
                            value={row.title}
                            onChange={(e) => handleObjectArrayChange('notices', index, 'title', e.target.value)}
                            placeholder="Notice Title"
                            className="w-full rounded-md p-3 bg-gray-200 font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block mb-1 font-semibold text-sm">Notice Type</label>
                          <select
                            value={row.type}
                            onChange={(e) => handleObjectArrayChange('notices', index, 'type', e.target.value)}
                            className="w-full rounded-md p-3 bg-gray-200 font-semibold"
                          >
                            <option value="warning">Warning (Yellow/Orange)</option>
                            <option value="info">Info (Blue)</option>
                            <option value="danger">Danger (Red)</option>
                            <option value="success">Success (Green)</option>
                          </select>
                        </div>
                      </div>
                      <div className="mb-2">
                        <label className="block mb-1 font-semibold text-sm">Notice Description</label>
                        <textarea
                          value={row.description}
                          onChange={(e) => handleObjectArrayChange('notices', index, 'description', e.target.value)}
                          placeholder="Notice Description"
                          className="w-full rounded-md p-3 bg-gray-200 font-semibold h-24"
                        ></textarea>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => addObjectArrayRow('notices', { title: '', description: '', type: 'warning' })} className="bg-blue-700 text-white px-3 py-2 rounded">+</button>
                        {form.notices.length > 1 && (
                          <button type="button" onClick={() => removeObjectArrayRow('notices', index)} className="bg-red-500 text-white px-3 py-2 rounded"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mb-4">
                  <label className="block mb-2 font-semibold">Bold Paragraph Text</label>
                  <textarea
                    name="boldParagraph"
                    value={form.boldParagraph}
                    onChange={handleChange}
                    placeholder="Experience the ultimate spiritual journey..."
                    className="w-full rounded-md p-3 bg-gray-200 font-semibold h-24"
                  ></textarea>
                </div>
                <div className="mb-4 border rounded p-3 bg-green-50">
                  <label className="block mb-2 font-semibold">Search Locations Sidebar (Design 4)</label>
                  {form.searchLocations.map((row, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 mb-2">
                      <input
                        type="text"
                        value={row.locationName}
                        onChange={(e) => handleObjectArrayChange('searchLocations', index, 'locationName', e.target.value)}
                        placeholder="Location Name"
                        className="rounded-md p-3 bg-gray-200 font-semibold"
                      />
                      <input
                        type="text"
                        value={row.count}
                        onChange={(e) => handleObjectArrayChange('searchLocations', index, 'count', e.target.value)}
                        placeholder="Count"
                        className="rounded-md p-3 bg-gray-200 font-semibold"
                      />
                      <div className="flex gap-2">
                        <button type="button" onClick={() => addObjectArrayRow('searchLocations', { locationName: '', count: '' })} className="bg-blue-700 text-white px-3 py-2 rounded">+</button>
                        {form.searchLocations.length > 1 && (
                          <button type="button" onClick={() => removeObjectArrayRow('searchLocations', index)} className="bg-red-500 text-white px-3 py-2 rounded"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Table Data */}
            {!isDesignFive && !isDesignSix && !isDesignSeven && (
              <>
                <label className="block mb-2 font-semibold">Table Data</label>
                <div className="mb-4 border rounded p-3 bg-blue-50">
                  <label className="block mb-2 font-semibold">Table Heading</label>
                  <input
                    type="text"
                    name="tableTitle"
                    value={form.tableTitle}
                    onChange={handleChange}
                    placeholder="Table Title"
                    className="w-full rounded-md p-3 bg-gray-200 font-semibold mb-2"
                  />
                  <label className="block mb-2 font-semibold">Table Description</label>

                  {form.tableRows.map((row, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 mb-2">

                      <input type="text" value={row.column1} onChange={(e) => handleObjectArrayChange('tableRows', index, 'column1', e.target.value)} placeholder="Column 1" className="rounded-md p-3 bg-gray-200 font-semibold" />
                      <input type="text" value={row.column2} onChange={(e) => handleObjectArrayChange('tableRows', index, 'column2', e.target.value)} placeholder="Column 2" className="rounded-md p-3 bg-gray-200 font-semibold" />
                      <div className="flex gap-2">
                        <button type="button" onClick={() => addObjectArrayRow('tableRows', { column1: '', column2: '' })} className="bg-blue-700 text-white px-3 py-2 rounded">+</button>
                        {form.tableRows.length > 1 && (
                          <button type="button" onClick={() => removeObjectArrayRow('tableRows', index)} className="bg-red-500 text-white px-3 py-2 rounded"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Blockquote */}
            {!isDesignFive && !isDesignSix && !isDesignSeven && (
              <div className="mb-4">
                <label className="block mb-2 font-semibold">Blockquote Title</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                  <input type="text" name="blockquoteMainTitle" value={form.blockquoteMainTitle} onChange={handleChange} placeholder="Title Name For Blockquote" className="rounded-md p-3 bg-gray-200 font-semibold" />
                  <input type="text" name="blockquoteLeftTitle" value={form.blockquoteLeftTitle} onChange={handleChange} placeholder="Blockquote Left Para" className="rounded-md p-3 bg-gray-200 font-semibold" />
                </div>
                <label className="block mb-2 font-semibold">BlockQoute Description</label>
                <InlineRichTextEditor
                  value={form.blockquoteDescription}
                  onChange={(html) => setForm((prev) => ({ ...prev, blockquoteDescription: html }))}
                />
                <div className="mt-2">
                  <label className="block mb-2 font-semibold">Blockquote Tags</label>
                  {form.blockquoteTags.map((tag, index) => (
                    <div key={index} className="flex items-center gap-2 mb-2">
                      <input type="text" value={tag} onChange={(e) => handleArrayTextChange('blockquoteTags', index, e.target.value)} placeholder="Blockquote Tag" className="flex-1 rounded-md p-3 bg-gray-200 font-semibold" />
                      <button type="button" onClick={() => addArrayTextRow('blockquoteTags')} className="bg-blue-700 text-white px-3 py-2 rounded">+</button>
                      {form.blockquoteTags.length > 1 && (
                        <button type="button" onClick={() => removeArrayTextRow('blockquoteTags', index)} className="bg-red-500 text-white px-3 py-2 rounded"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Accordion Tag */}
            {!isDesignThree && !isDesignFour && !isDesignFive && !isDesignSix && !isDesignSeven && (
              <div className="mb-4">
                <label className="block mb-2 font-semibold">Advertisement Section</label>
                <div className="flex flex-col gap-4">
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => handleCloudinaryImageChange(e, 'advertisementImage')}
                      ref={advertisementImageInputRef}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => advertisementImageInputRef.current && advertisementImageInputRef.current.click()}
                      className="rounded-md p-3 bg-blue-400 font-semibold text-left"
                    >
                      {form.advertisementImage?.url ? 'Change Advertisement Image' : 'Upload Advertisement Image'}
                    </button>
                    {uploadingAdvertisementImage && <div className="text-blue-600 text-sm mt-1">Uploading...</div>}
                    {form.advertisementImage?.url && (
                      <div className="relative w-full h-48 border rounded overflow-hidden mt-2">
                        <Image height={250} width={150} src={form.advertisementImage.url} alt="Advertisement Preview" className="object-contain w-full h-full" />
                        <button
                          type="button"
                          onClick={() => handleDeleteCloudinaryImage('advertisementImage')}
                          className="absolute top-1 right-1 bg-white bg-opacity-80 rounded-full p-1 hover:bg-red-200"
                          title="Remove image"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <h2 className='font-semibold mb-1'>Advertisement URL</h2>
                    <input
                      type="text"
                      name="advertisementUrl"
                      value={form.advertisementUrl}
                      onChange={handleChange}
                      placeholder="https://example.com"
                      className="rounded-md p-3 bg-gray-200 font-semibold"
                    />
                  </div>
                </div>
              </div>
            )}

            {!isDesignThree && !isDesignFour && !isDesignFive && !isDesignSix && !isDesignSeven && (
              <div className="mb-4">
                <label className="block mb-2 font-bold">Accordion Tag</label>
                {form.accordionTags.map((row, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 mb-2">
                    <div className="flex flex-col gap-1">
                      <label className="block mb-2 font-semibold text-sm">Accordion Main Title</label>
                      <input type="text" value={row.left} onChange={(e) => handleObjectArrayChange('accordionTags', index, 'left', e.target.value)} placeholder="Title Text Line" className="rounded-md p-3 bg-gray-200 font-semibold" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="block mb-2 font-semibold text-sm">Accordion Description</label>
                      <input type="text" value={row.right} onChange={(e) => handleObjectArrayChange('accordionTags', index, 'right', e.target.value)} placeholder="Accordion Tag Line" className="rounded-md p-3 bg-gray-200 font-semibold" />
                    </div>
                    <div className="flex items-end gap-2">
                      <button type="button" onClick={() => addObjectArrayRow('accordionTags', { left: '', right: '' })} className="bg-blue-700 text-white px-3 py-2 rounded">+</button>
                      {form.accordionTags.length > 1 && (
                        <button type="button" onClick={() => removeObjectArrayRow('accordionTags', index)} className="bg-red-500 text-white px-3 py-2 rounded"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Side Thumb Blog */}
            {!isDesignThree && !isDesignFour && !isDesignFive && !isDesignSix && !isDesignSeven && (
              <div className="mb-4">
                <label className="block mb-2 font-semibold">Side Thumb Blog</label>
                <div className="flex flex-col gap-5 mb-2">
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => handleCloudinaryImageChange(e, 'sideThumbImage')}
                      ref={sideThumbImageInputRef}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => sideThumbImageInputRef.current && sideThumbImageInputRef.current.click()}
                      className="rounded-md p-3 bg-blue-400 font-semibold text-left"
                    >
                      {form.sideThumbImage ? 'Change Thumb Image' : 'Upload Thumb Image'}
                    </button>
                    {uploadingSideThumbImage && <div className="text-blue-600 text-sm mt-1">Uploading...</div>}
                    {form.sideThumbImage && (
                      <div className="relative w-full h-48 border rounded overflow-hidden mt-2">
                        <Image height={250} width={150} src={form.sideThumbImage} alt="Side Thumb Preview" className="object-contain w-full h-full" />
                        <button
                          type="button"
                          onClick={() => handleDeleteCloudinaryImage('sideThumbImage')}
                          className="absolute top-1 right-1 bg-white bg-opacity-80 rounded-full p-1 hover:bg-red-200"
                          title="Remove image"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col  gap-2">
                    <h2 className='font-semibold mb-2'>Side Thumb Name</h2>
                    <input type="text" name="sideThumbName" value={form.sideThumbName} onChange={handleChange} placeholder="Name Here" className="rounded-md p-3 bg-gray-200 text-black font-semibold" />
                    <h2 className='font-semibold mb-2'>Side Thumb Designation</h2>
                    <input type="text" name="sideThumbDesignation" value={form.sideThumbDesignation} onChange={handleChange} placeholder="Designation" className="rounded-md p-3 bg-gray-200 text-black font-semibold" />
                    <h2 className='font-semibold mb-2'>Side Thumb Description</h2>
                    <input type="text" name="sideThumbDescription" value={form.sideThumbDescription} onChange={handleChange} placeholder="Description" className="rounded-md p-3 bg-gray-200 text-black font-semibold" />
                  </div>
                </div>
                <hr className='my-4 border-black' />
                <h2 className="text-lg font-bold my-2">Social Media Links</h2>
                <div className="grid grid-col-1 gap-2">
                  <h2 className='font-semibold mb-1'>Facebook URL</h2>
                  <input type="text" name="facebookUrl" value={form.facebookUrl} onChange={handleChange} placeholder="Facebook Url" className="rounded-md p-3 bg-gray-200 font-semibold" />
                  <h2 className='font-semibold mb-1'>Youtube URL</h2>
                  <input type="text" name="youtubeUrl" value={form.youtubeUrl} onChange={handleChange} placeholder="Youtube Url" className="rounded-md p-3 bg-gray-200 font-semibold" />
                  <h2 className='font-semibold mb-1'>Instagram URL</h2>
                  <input type="text" name="instaUrl" value={form.instaUrl} onChange={handleChange} placeholder="Insta Url" className="rounded-md p-3 bg-gray-200 font-semibold" />
                  <h2 className='font-semibold mb-1'>Google URL</h2>
                  <input type="text" name="googleUrl" value={form.googleUrl} onChange={handleChange} placeholder="Google Url" className="rounded-md p-3 bg-gray-200 font-semibold" />
                </div>
              </div>
            )}
          </>
        )}
        {isDesignFive && !isDesignSix && !isDesignSeven && (
          <>
            {/* Design 5 Content */}
            <div className="mb-4 mt-8 border-t border-slate-100 pt-6">
              <h3 className="text-xl font-bold mb-4">Design 5 Sections</h3>

              <div className="mb-4">
                <label className="block mb-1 font-semibold">Top Chip Text (e.g. Why Choose Us)</label>
                <input type="text" name="design5Chip" value={form.design5Chip} onChange={handleChange} placeholder="Type Here" className="w-full rounded-md p-3 bg-gray-200 font-semibold text-black" />
              </div>

              <div className="mb-4">
                <label className="block mb-1 font-semibold">Main Heading</label>
                <input type="text" name="design5MainHeading" value={form.design5MainHeading} onChange={handleChange} placeholder="Type Here" className="w-full rounded-md p-3 bg-gray-200 font-semibold text-black" />
              </div>

              <div className="mb-4">
                <label className="block mb-2 font-bold">Grid Cards</label>
                {form.gridCards.map((card, index) => (
                  <div key={index} className="border p-4 mb-4 rounded-md bg-gray-50 relative">
                    <button type="button" onClick={() => {
                      setForm((prev) => {
                        const nextGridCards = [...(prev.gridCards || [])];
                        nextGridCards.splice(index, 1);
                        return { ...prev, gridCards: nextGridCards };
                      });
                    }} className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="mb-2">
                      <h2 className="block mb-2 font-semibold text-sm">Card Image</h2>
                      <div className="flex flex-col gap-2">
                        <div>
                          <label className="rounded-md p-3 bg-blue-400 font-semibold text-left cursor-pointer inline-block">
                            {card.image?.url ? 'Change Card Image' : 'Upload Card Image'}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleGridCardImageChange(e, index)}
                              className="hidden"
                            />
                          </label>
                          {card.image?.url && (
                            <div className="relative w-full h-48 border rounded overflow-hidden mt-2">
                              <Image height={250} width={150} src={card.image.url} alt="Grid Card Preview" className="object-contain w-full h-full" />
                              <button
                                type="button"
                                onClick={() => handleDeleteGridCardImage(index)}
                                className="absolute top-1 right-1 bg-white bg-opacity-80 rounded-full p-1 hover:bg-red-200"
                                title="Remove image"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <label className="block mb-1 font-semibold text-sm">Chip Name</label>
                        <input type="text" value={card.chipName} onChange={(e) => {
                          setForm((prev) => {
                            const nextGridCards = [...(prev.gridCards || [])];
                            nextGridCards[index].chipName = e.target.value;
                            return { ...prev, gridCards: nextGridCards };
                          });
                        }} placeholder="e.g. Fintech" className="w-full rounded-md p-3 bg-white border border-gray-300 font-semibold text-black" />
                      </div>

                      <div>
                        <label className="block mb-1 font-semibold text-sm">Title</label>
                        <input type="text" value={card.title} onChange={(e) => {
                          setForm((prev) => {
                            const nextGridCards = [...(prev.gridCards || [])];
                            nextGridCards[index].title = e.target.value;
                            return { ...prev, gridCards: nextGridCards };
                          });
                        }} placeholder="e.g. Compliance Consulting" className="w-full rounded-md p-3 bg-white border border-gray-300 font-semibold text-black" />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block mb-1 font-semibold text-sm">Link URL (for Explore More)</label>
                        <input type="text" value={card.link} onChange={(e) => {
                          setForm((prev) => {
                            const nextGridCards = [...(prev.gridCards || [])];
                            nextGridCards[index].link = e.target.value;
                            return { ...prev, gridCards: nextGridCards };
                          });
                        }} placeholder="/some-link" className="w-full rounded-md p-3 bg-white border border-gray-300 font-semibold text-black" />
                      </div>
                    </div>
                  </div>
                ))}

                <button type="button" onClick={() => {
                  setForm((prev) => {
                    const nextGridCards = [...(prev.gridCards || [])];
                    nextGridCards.push({ image: { url: '', key: '' }, chipName: '', title: '', link: '' });
                    return { ...prev, gridCards: nextGridCards };
                  });
                }} className="bg-blue-600 text-white px-4 py-2 rounded-md font-semibold mt-2">
                  + Add Grid Card
                </button>
              </div>
            </div>
          </>
        )}

        {isDesignSix && (
          <>
            {/* Design 6 Content */}
            <div className="mb-4 mt-8 border-t border-slate-100 pt-6">
              <h3 className="text-xl font-bold mb-4">Design 6 (Team Page) Sections</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block mb-1 font-semibold">Top Chip Text</label>
                  <input type="text" name="design6Chip" value={form.design6Chip} onChange={handleChange} placeholder="e.g. News & Insight" className="w-full rounded-md p-3 bg-gray-200 font-semibold text-black" />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">Explore Area Link</label>
                  <input type="text" name="design6ExploreLink" value={form.design6ExploreLink} onChange={handleChange} placeholder="/explore" className="w-full rounded-md p-3 bg-gray-200 font-semibold text-black" />
                </div>
              </div>

              <div className="mb-4">
                <label className="block mb-1 font-semibold">Main Heading</label>
                <input type="text" name="design6MainHeading" value={form.design6MainHeading} onChange={handleChange} placeholder="The latest news and insights..." className="w-full rounded-md p-3 bg-gray-200 font-semibold text-black" />
              </div>

              <div className="mb-4">
                <label className="block mb-1 font-semibold">Sub Heading / Paragraph Text</label>
                <textarea name="design6SubHeading" value={form.design6SubHeading} onChange={handleChange} placeholder="Business consulting is a professional service..." className="w-full rounded-md p-3 bg-gray-200 font-semibold text-black h-24"></textarea>
              </div>

              <div className="mb-4">
                <label className="block mb-1 font-semibold">Author Attribution</label>
                <input type="text" name="design6Author" value={form.design6Author} onChange={handleChange} placeholder="Mr. Daniel Scoot, Mr. Daniel Scoot" className="w-full rounded-md p-3 bg-gray-200 font-semibold text-black" />
              </div>

              <hr className="my-6 border-slate-300" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block mb-1 font-semibold">Mid Section Heading</label>
                  <input type="text" name="design6MidHeading" value={form.design6MidHeading} onChange={handleChange} placeholder="Excellent Service Provided by..." className="w-full rounded-md p-3 bg-gray-200 font-semibold text-black" />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">Explore People Link</label>
                  <input type="text" name="design6MidLink" value={form.design6MidLink} onChange={handleChange} placeholder="/people" className="w-full rounded-md p-3 bg-gray-200 font-semibold text-black" />
                </div>
              </div>

              <div className="mb-4">
                <label className="block mb-2 font-bold">Team Cards</label>
                {form.teamCards.map((card, index) => (
                  <div key={index} className="border p-4 mb-4 rounded-md bg-gray-50 relative">
                    <button type="button" onClick={() => {
                      setForm((prev) => {
                        const nextCards = [...(prev.teamCards || [])];
                        nextCards.splice(index, 1);
                        return { ...prev, teamCards: nextCards };
                      });
                    }} className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="mb-2">
                      <h2 className="block mb-2 font-semibold text-sm">Card Image</h2>
                      <div className="flex flex-col gap-2">
                        <div>
                          <label className="rounded-md p-3 bg-blue-400 font-semibold text-left cursor-pointer inline-block text-black">
                            {card.image?.url ? 'Change Image' : 'Upload Image'}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleTeamCardImageChange(e, index)}
                              className="hidden"
                            />
                          </label>
                          {card.image?.url && (
                            <div className="relative w-full h-48 border rounded overflow-hidden mt-2 bg-white">
                              <Image width={150} height={100} src={card.image.url} alt="Team Preview" className="object-contain w-full h-full" />
                              <button
                                type="button"
                                onClick={() => handleDeleteTeamCardImage(index)}
                                className="absolute top-1 right-1 bg-white bg-opacity-80 rounded-full p-1 hover:bg-red-200"
                                title="Remove image"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block mb-1 font-semibold text-sm">Name</label>
                        <input type="text" value={card.name} onChange={(e) => {
                          setForm((prev) => {
                            const nextCards = [...(prev.teamCards || [])];
                            nextCards[index].name = e.target.value;
                            return { ...prev, teamCards: nextCards };
                          });
                        }} placeholder="Mr. Anthony Brian" className="w-full rounded-md p-3 bg-white border border-gray-300 font-semibold text-black" />
                      </div>

                      <div>
                        <label className="block mb-1 font-semibold text-sm">Designation</label>
                        <input type="text" value={card.designation} onChange={(e) => {
                          setForm((prev) => {
                            const nextCards = [...(prev.teamCards || [])];
                            nextCards[index].designation = e.target.value;
                            return { ...prev, teamCards: nextCards };
                          });
                        }} placeholder="Senior Consultant" className="w-full rounded-md p-3 bg-white border border-gray-300 font-semibold text-black" />
                      </div>

                      <div>
                        <label className="block mb-1 font-semibold text-sm">Phone Number</label>
                        <input type="text" value={card.phone} onChange={(e) => {
                          setForm((prev) => {
                            const nextCards = [...(prev.teamCards || [])];
                            nextCards[index].phone = e.target.value;
                            return { ...prev, teamCards: nextCards };
                          });
                        }} placeholder="+91 656 786 53" className="w-full rounded-md p-3 bg-white border border-gray-300 font-semibold text-black" />
                      </div>

                      <div>
                        <label className="block mb-1 font-semibold text-sm">Facebook URL Link</label>
                        <input type="text" value={card.facebook} onChange={(e) => {
                          setForm((prev) => {
                            const nextCards = [...(prev.teamCards || [])];
                            nextCards[index].facebook = e.target.value;
                            return { ...prev, teamCards: nextCards };
                          });
                        }} placeholder="https://facebook.com/..." className="w-full rounded-md p-3 bg-white border border-gray-300 font-semibold text-black" />
                      </div>
                      <div>
                        <label className="block mb-1 font-semibold text-sm">Instagram URL Link</label>
                        <input type="text" value={card.instagram} onChange={(e) => {
                          setForm((prev) => {
                            const nextCards = [...(prev.teamCards || [])];
                            nextCards[index].instagram = e.target.value;
                            return { ...prev, teamCards: nextCards };
                          });
                        }} placeholder="https://instagram.com/..." className="w-full rounded-md p-3 bg-white border border-gray-300 font-semibold text-black" />
                      </div>
                      <div>
                        <label className="block mb-1 font-semibold text-sm">Youtube URL Link</label>
                        <input type="text" value={card.youtube} onChange={(e) => {
                          setForm((prev) => {
                            const nextCards = [...(prev.teamCards || [])];
                            nextCards[index].youtube = e.target.value;
                            return { ...prev, teamCards: nextCards };
                          });
                        }} placeholder="https://youtube.com/..." className="w-full rounded-md p-3 bg-white border border-gray-300 font-semibold text-black" />
                      </div>
                    </div>
                  </div>
                ))}

                <button type="button" onClick={() => {
                  setForm((prev) => {
                    const nextCards = [...(prev.teamCards || [])];
                    nextCards.push({ image: { url: '', key: '' }, name: '', designation: '', phone: '', facebook: '', instagram: '', youtube: '' });
                    return { ...prev, teamCards: nextCards };
                  });
                }} className="bg-blue-600 text-white px-4 py-2 rounded-md font-semibold mt-2">
                  + Add Team Card
                </button>
              </div>
            </div>
          </>
        )}

        {isDesignSeven && (
          <>
            {/* Design 7 Content */}
            <div className="mb-4 mt-4 border-t border-slate-100 pt-6">
              <h3 className="text-xl font-bold mb-4">Design 7 Sections</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block mb-1 font-semibold">Top Chip Text</label>
                  <input type="text" name="design7Chip" value={form.design7Chip} onChange={handleChange} placeholder="News & Insight" className="w-full rounded-md p-3 bg-gray-200 font-semibold text-black" />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">Explore Link URL</label>
                  <input type="text" name="design7ExploreLink" value={form.design7ExploreLink} onChange={handleChange} placeholder="/explore" className="w-full rounded-md p-3 bg-gray-200 font-semibold text-black" />
                </div>
              </div>

              <div className="mb-4">
                <label className="block mb-1 font-semibold">Main Heading</label>
                <input type="text" name="design7MainHeading" value={form.design7MainHeading} onChange={handleChange} placeholder="The latest news and insights..." className="w-full rounded-md p-3 bg-gray-200 font-semibold text-black" />
              </div>

              {/* Gallery Grid Cards for Design 7 */}
              <div className="mb-4 border border-slate-200 rounded-xl p-5 bg-slate-50">
                <h4 className="font-bold text-lg mb-4">Gallery Image Cards</h4>
                {form.gridCards.map((card, index) => (
                  <div key={index} className="mb-4 border border-slate-200 rounded p-4 bg-white relative">
                    <button type="button" onClick={() => {
                      setForm((prev) => {
                        const nextGridCards = [...(prev.gridCards || [])];
                        nextGridCards.splice(index, 1);
                        return { ...prev, gridCards: nextGridCards };
                      });
                    }} className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="mb-2">
                      <h2 className="block mb-2 font-semibold text-sm">Card Image</h2>
                      <div className="flex flex-col gap-2">
                        <input id={`grid-card-image-${index}`} type="file" accept="image/*" onChange={(e) => handleGridCardImageChange(e, index)} className="hidden" />
                        <label htmlFor={`grid-card-image-${index}`} className="inline-block bg-yellow-400 px-4 py-2 rounded cursor-pointer w-max font-semibold text-sm">
                          Upload Image
                        </label>
                        {card.image?.url && (
                          <div className="relative w-32 h-32 border rounded overflow-hidden mt-2">
                            <Image height={250} width={150} src={card.image.url} alt="Grid Card" className="object-cover w-full h-full" />
                            <button type="button" onClick={() => handleDeleteGridCardImage(index)} className="absolute top-1 right-1 bg-white bg-opacity-80 rounded-full p-1 hover:bg-red-200" title="Remove image">
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <label className="block mb-1 font-semibold text-sm">Hover Chip Name</label>
                        <input type="text" value={card.chipName} onChange={(e) => {
                          setForm((prev) => {
                            const nextGridCards = [...(prev.gridCards || [])];
                            nextGridCards[index].chipName = e.target.value;
                            return { ...prev, gridCards: nextGridCards };
                          });
                        }} placeholder="e.g. Fintech" className="w-full rounded-md p-3 bg-white border border-gray-300 font-semibold text-black" />
                      </div>

                      <div>
                        <label className="block mb-1 font-semibold text-sm">Hover Title (Link Text)</label>
                        <input type="text" value={card.title} onChange={(e) => {
                          setForm((prev) => {
                            const nextGridCards = [...(prev.gridCards || [])];
                            nextGridCards[index].title = e.target.value;
                            return { ...prev, gridCards: nextGridCards };
                          });
                        }} placeholder="e.g. Compliance Consulting" className="w-full rounded-md p-3 bg-white border border-gray-300 font-semibold text-black" />
                      </div>

                      {/* Expandable Gallery Detail Section */}
                      <div className="md:col-span-2 mt-4 border border-blue-200 rounded-lg p-4 bg-blue-50">
                        <h3 className="font-bold text-md mb-3 text-blue-800">Gallery Detail Page Content</h3>
                        <p className="text-xs text-blue-600 mb-4">Filling this out will generate a detail page at <strong>/gallery/{card.gallerySlug || "<auto-generated>"}</strong></p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block mb-1 font-semibold text-sm">Date</label>
                            <input type="date" value={card.galleryDate || ''} onChange={(e) => {
                              setForm((prev) => {
                                const nextGridCards = [...(prev.gridCards || [])];
                                nextGridCards[index].galleryDate = e.target.value;
                                return { ...prev, gridCards: nextGridCards };
                              });
                            }} className="w-full rounded-md p-3 bg-white border border-gray-300 font-semibold" />
                          </div>
                          <div>
                            <label className="block mb-1 font-semibold text-sm">Posted By</label>
                            <input type="text" value={card.postedBy || ''} onChange={(e) => {
                              setForm((prev) => {
                                const nextGridCards = [...(prev.gridCards || [])];
                                nextGridCards[index].postedBy = e.target.value;
                                return { ...prev, gridCards: nextGridCards };
                              });
                            }} placeholder="Author Name" className="w-full rounded-md p-3 bg-white border border-gray-300 font-semibold" />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block mb-1 font-semibold text-sm">Description Paragraph</label>
                            <textarea value={card.galleryDescription || ''} onChange={(e) => {
                              setForm((prev) => {
                                const nextGridCards = [...(prev.gridCards || [])];
                                nextGridCards[index].galleryDescription = e.target.value;
                                return { ...prev, gridCards: nextGridCards };
                              });
                            }} rows="3" className="w-full rounded-md p-3 bg-white border border-gray-300 font-semibold"></textarea>
                          </div>
                        </div>

                        <div className="mb-6">
                          <label className="block mb-2 font-bold text-sm text-blue-900 border-b border-blue-200 pb-1">Bento Gallery Images</label>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {(card.bentoImages || []).map((img, imgIdx) => (
                              <div key={imgIdx} className="relative w-24 h-24 border rounded overflow-hidden">
                                <Image width={150} height={100} src={img.url} alt="Bento" className="object-cover w-full h-full" />
                                <button type="button" onClick={() => handleDeleteBentoImage(index, imgIdx)} className="absolute top-1 right-1 bg-white bg-opacity-80 rounded-full p-1 hover:bg-red-200" title="Remove image">
                                  <Trash2 className="w-3 h-3 text-red-600" />
                                </button>
                              </div>
                            ))}
                            <div className="w-24 h-24 border-2 border-dashed border-blue-300 rounded flex flex-col items-center justify-center bg-white cursor-pointer hover:bg-blue-50 relative">
                              <input type="file" multiple accept="image/*" onChange={(e) => handleBentoImageChange(e, index)} className="absolute inset-0 opacity-0 cursor-pointer" />
                              <span className="text-xl text-blue-400">+</span>
                              <span className="text-xs text-blue-500 font-semibold mt-1">Upload</span>
                            </div>
                          </div>
                        </div>

                        <div className="mb-6">
                          <label className="block mb-2 font-bold text-sm text-blue-900 border-b border-blue-200 pb-1">YouTube Shorts</label>
                          {(card.youtubeShorts || []).map((short, shortIdx) => (
                            <div key={shortIdx} className="flex gap-2 mb-2 items-center bg-white p-2 rounded border border-gray-200 w-full">
                              <div className="w-full">
                                <input type="text" value={short.url} onChange={(e) => {
                                  setForm(prev => {
                                    const newCards = [...prev.gridCards];
                                    newCards[index].youtubeShorts[shortIdx].url = e.target.value;
                                    return { ...prev, gridCards: newCards };
                                  });
                                }} placeholder="YouTube URL" className="w-full rounded p-2 text-sm border border-gray-300" />
                              </div>
                              <div className="md:col-span-1 text-center">
                                <button type="button" onClick={() => {
                                  setForm(prev => {
                                    const newCards = [...prev.gridCards];
                                    newCards[index].youtubeShorts.splice(shortIdx, 1);
                                    return { ...prev, gridCards: newCards };
                                  });
                                }} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4 inline" /></button>
                              </div>
                            </div>
                          ))}
                          <button type="button" onClick={() => {
                            setForm(prev => {
                              const newCards = [...prev.gridCards];
                              if (!newCards[index].youtubeShorts) newCards[index].youtubeShorts = [];
                              newCards[index].youtubeShorts.push({ url: '' });
                              return { ...prev, gridCards: newCards };
                            });
                          }} className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded font-semibold hover:bg-blue-200">+ Add Short</button>
                        </div>

                        <div>
                          <label className="block mb-2 font-bold text-sm text-blue-900 border-b border-blue-200 pb-1">YouTube Highlight Videos</label>
                          {(card.youtubeVideos || []).map((vid, vidIdx) => (
                            <div key={vidIdx} className="flex gap-2 mb-2 items-center bg-white p-2 rounded border border-gray-200 w-full">
                              <div className="w-full">
                                <input type="text" value={vid.url} onChange={(e) => {
                                  setForm(prev => {
                                    const newCards = [...prev.gridCards];
                                    newCards[index].youtubeVideos[vidIdx].url = e.target.value;
                                    return { ...prev, gridCards: newCards };
                                  });
                                }} placeholder="YouTube URL" className="w-full rounded p-2 text-sm border border-gray-300" />
                              </div>
                              <div className="text-center">
                                <button type="button" onClick={() => {
                                  setForm(prev => {
                                    const newCards = [...prev.gridCards];
                                    newCards[index].youtubeVideos.splice(vidIdx, 1);
                                    return { ...prev, gridCards: newCards };
                                  });
                                }} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4 inline" /></button>
                              </div>
                            </div>
                          ))}
                          <button type="button" onClick={() => {
                            setForm(prev => {
                              const newCards = [...prev.gridCards];
                              if (!newCards[index].youtubeVideos) newCards[index].youtubeVideos = [];
                              newCards[index].youtubeVideos.push({ url: '', });
                              return { ...prev, gridCards: newCards };
                            });
                          }} className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded font-semibold hover:bg-blue-200">+ Add Video</button>
                        </div>

                      </div>

                    </div>
                  </div>
                ))}

                <button type="button" onClick={() => {
                  setForm((prev) => {
                    const nextGridCards = [...(prev.gridCards || [])];
                    nextGridCards.push({ image: { url: '', key: '' }, chipName: '', title: '', link: '', galleryDate: '', postedBy: '', galleryDescription: '', bentoImages: [], youtubeShorts: [], youtubeVideos: [] });
                    return { ...prev, gridCards: nextGridCards };
                  });
                }} className="bg-blue-600 text-white px-4 py-2 rounded-md font-semibold mt-2">
                  + Add Gallery Card
                </button>
              </div>

            </div>
          </>
        )}

        {/* Data Save Button */}
        <div className="pt-6 mt-8 border-t border-slate-100 flex justify-end">
          <Button type="submit" className="h-11 px-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium transition-all shadow-sm">
            Save Changes
          </Button>
        </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default function EditWebpages({ params }) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading...</div>}>
      <EditWebpagesContent params={params} />
    </Suspense>
  )
}

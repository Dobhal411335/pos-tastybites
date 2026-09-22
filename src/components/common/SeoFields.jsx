'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

/**
 * Shared SEO fields for Package, Room, and Webpage admin forms.
 * Controlled: titleLine (string) + keywords (string[]).
 */
export default function SeoFields({
  titleLine = '',
  keywords = [],
  onTitleLineChange,
  onKeywordsChange,
  className = '',
}) {
  const [draftKeyword, setDraftKeyword] = useState('')

  const list = Array.isArray(keywords) ? keywords.filter(Boolean) : []

  const handleAddKeyword = () => {
    const value = draftKeyword.trim()
    if (!value) return
    if (list.includes(value)) {
      setDraftKeyword('')
      return
    }
    onKeywordsChange?.([...list, value])
    setDraftKeyword('')
  }

  const handleRemoveKeyword = (index) => {
    onKeywordsChange?.(list.filter((_, i) => i !== index))
  }

  const handleDraftKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddKeyword()
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-2">
        <Label htmlFor="seo-title-line" className="font-ui text-sm text-heading">
          Title Line
        </Label>
        <Input
          id="seo-title-line"
          name="titleLine"
          value={titleLine || ''}
          onChange={(e) => onTitleLineChange?.(e.target.value)}
          placeholder="SEO page title (browser tab / metadata)"
          className="font-medium"
        />
        <p className="text-xs text-muted-foreground">
          Used as the page title in search and browser metadata.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="seo-keyword-input" className="font-ui text-sm text-heading">
          Keywords
        </Label>
        <div className="flex gap-2">
          <Input
            id="seo-keyword-input"
            value={draftKeyword}
            onChange={(e) => setDraftKeyword(e.target.value)}
            onKeyDown={handleDraftKeyDown}
            placeholder="Add a keyword"
            className="font-medium"
          />
          <Button type="button" variant="outline" size="sm" onClick={handleAddKeyword} className="shrink-0 gap-1">
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>

        {list.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {list.map((keyword, index) => (
              <span
                key={`${keyword}-${index}`}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-sm text-heading"
              >
                {keyword}
                <button
                  type="button"
                  onClick={() => handleRemoveKeyword(index)}
                  className="rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Remove keyword ${keyword}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No keywords added yet.</p>
        )}
      </div>
    </div>
  )
}

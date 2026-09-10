import Link from 'next/link';
import {
  Download,
  Monitor,
  Smartphone,
  CheckCircle2,
  CircleAlert,
  ArrowLeft,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  formatReleaseDate,
  getPosAppDownloads,
} from '@/lib/posAppDownloads';

/**
 * @param {{
 *   variant?: 'public' | 'admin';
 *   backHref?: string;
 *   backLabel?: string;
 * }} props
 */
export function PosDownloadsCenter({
  variant = 'public',
  backHref = '/',
  backLabel = 'Back to website',
}) {
  const { platforms } = getPosAppDownloads();
  const isAdmin = variant === 'admin';

  return (
    <div
      className={
        isAdmin
          ? 'space-y-8'
          : 'flex min-h-screen flex-col bg-[#FAFAFA] text-zinc-900 antialiased'
      }
    >
      {!isAdmin ? (
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link
              href={backHref}
              className="flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-zinc-900"
            >
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Link>
            <span className="text-sm font-semibold text-zinc-800">
              Tasty Bites POS
            </span>
          </div>
        </header>
      ) : null}

      <div
        className={
          isAdmin
            ? 'space-y-8'
            : 'mx-auto w-full max-w-5xl flex-1 px-6 py-10 sm:py-14'
        }
      >
        <div className="mb-2 space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight text-slate-900">
              Downloads
            </h1>
            <Badge className="bg-orange-500 text-white hover:bg-orange-500">
              Latest Release
            </Badge>
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-zinc-600 sm:text-base">
            Download the latest Tasty Bites POS application for your device.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-2">
          {platforms.map((platform) => (
            <PlatformDownloadCard key={platform.id} platform={platform} />
          ))}
        </div>

        <InstallationHelp platforms={platforms} />
      </div>
    </div>
  );
}

/**
 * @param {{ platform: import('@/lib/posAppDownloads').PosAppDownload }} props
 */
function PlatformDownloadCard({ platform }) {
  const Icon = platform.id === 'android' ? Smartphone : Monitor;
  const accent =
    platform.id === 'android'
      ? {
          iconWrap: 'bg-emerald-50 text-emerald-600',
          button: 'bg-emerald-600 hover:bg-emerald-700',
        }
      : {
          iconWrap: 'bg-orange-50 text-orange-500',
          button: 'bg-orange-500 hover:bg-orange-600',
        };

  const ctaLabel =
    platform.id === 'android' ? 'Download APK' : 'Download for Windows';

  return (
    <Card className="border-zinc-200 shadow-sm">
      <CardHeader className="space-y-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl ${accent.iconWrap}`}
            >
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">
                {platform.title}
              </CardTitle>
              <p className="text-sm text-zinc-500">{platform.platformLabel}</p>
            </div>
          </div>
          {platform.available ? (
            <Badge
              variant="secondary"
              className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Available
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              className="gap-1 border-amber-200 bg-amber-50 text-amber-700"
            >
              <CircleAlert className="h-3.5 w-3.5" />
              Unavailable
            </Badge>
          )}
        </div>
        <p className="text-sm leading-relaxed text-zinc-600">
          {platform.description}
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        <dl className="grid gap-2.5 rounded-xl border border-zinc-100 bg-zinc-50/80 p-4 text-sm">
          <MetaRow label="Version" value={`v${platform.version}`} />
          <MetaRow
            label="Release date"
            value={formatReleaseDate(platform.releaseDate)}
          />
          <MetaRow label="File type" value={platform.fileType} />
          <MetaRow
            label="File size"
            value={platform.fileSize || 'See Google Drive'}
          />
          <MetaRow label="File name" value={platform.fileName} mono />
          <MetaRow
            label="Last updated"
            value={formatReleaseDate(platform.releaseDate)}
          />
        </dl>

        {platform.available ? (
          <Button size="lg" className={`w-full ${accent.button}`} asChild>
            <a
              href={platform.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download className="mr-2 h-5 w-5" />
              {ctaLabel}
            </a>
          </Button>
        ) : (
          <Button size="lg" className="w-full" disabled>
            Not available
          </Button>
        )}

        <p className="text-xs text-zinc-500">
          {platform.requirements}
          {platform.available
            ? ' · Opens Google Drive so you can download the file yourself.'
            : ''}
        </p>
      </CardContent>
    </Card>
  );
}

function MetaRow({ label, value, mono = false }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-zinc-500">{label}</dt>
      <dd
        className={`text-right font-medium text-zinc-800 ${
          mono ? 'truncate font-mono text-xs' : 'tabular-nums'
        }`}
        title={typeof value === 'string' ? value : undefined}
      >
        {value}
      </dd>
    </div>
  );
}

function InstallationHelp({ platforms }) {
  return (
    <Card className="border-zinc-200 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-orange-500" />
          <CardTitle className="text-base font-bold text-slate-900">
            Installation Help
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 sm:grid-cols-2">
        {platforms.map((platform) => (
          <div key={platform.id} className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-800">
              {platform.id === 'android' ? 'Android' : 'Windows'}
            </h3>
            <ol className="list-decimal space-y-1.5 pl-4 text-sm leading-relaxed text-zinc-600">
              {platform.installSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

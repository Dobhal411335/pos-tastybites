import { readFileSync } from 'fs';
import { join } from 'path';
import Image from 'next/image';
import Link from 'next/link';
import { Monitor, Download, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

function getAppVersion() {
  try {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), 'package.json'), 'utf8'),
    );
    return pkg.version || '0.1.0';
  } catch {
    return '0.1.0';
  }
}

function getInstallerUrl(version) {
  if (process.env.NEXT_PUBLIC_POS_INSTALLER_URL) {
    return process.env.NEXT_PUBLIC_POS_INSTALLER_URL;
  }
  return `/downloads/Tasty-Bites-POS-Setup-${version}.exe`;
}

export const metadata = {
  title: 'Download POS for Windows',
  description: 'Download Tasty Bites POS desktop application for Windows',
};

export default function DownloadPosPage() {
  const version = getAppVersion();
  const installerUrl = getInstallerUrl(version);

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA] text-zinc-900 antialiased">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-zinc-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to website
          </Link>
          <div className="flex items-center gap-2">
            <Image
              src="/icons/POS.png"
              alt="Tasty Bites POS"
              width={28}
              height={28}
              className="rounded"
            />
            <span className="text-sm font-semibold">Tasty Bites POS</span>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-16">
        <Card className="border-zinc-200 shadow-sm">
          <CardContent className="p-8 sm:p-10">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50">
                <Monitor className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Tasty Bites POS
                </h1>
                <p className="text-sm text-zinc-500">Windows Desktop POS</p>
              </div>
            </div>

            <p className="mb-8 max-w-lg text-sm leading-relaxed text-zinc-600">
              Run Tasty Bites POS as a dedicated Windows application. Install
              once, then sign in with your existing employee credentials — the
              desktop app connects to the same production POS you use in the
              browser.
            </p>

            <Button
              size="lg"
              className="mb-6 bg-orange-500 hover:bg-orange-600"
              asChild
            >
              <a href={installerUrl} download>
                <Download className="mr-2 h-5 w-5" />
                Download POS for Windows
              </a>
            </Button>

            <dl className="grid gap-3 border-t border-zinc-100 pt-6 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Version</dt>
                <dd className="font-medium tabular-nums">{version}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">System</dt>
                <dd className="font-medium">Windows 10 / Windows 11</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Installer</dt>
                <dd className="truncate font-mono text-xs text-zinc-600">
                  {installerUrl.startsWith('http')
                    ? installerUrl
                    : `Tasty-Bites-POS-Setup-${version}.exe`}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

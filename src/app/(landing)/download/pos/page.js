import { PosDownloadsCenter } from '@/components/downloads/PosDownloadsCenter';

export const metadata = {
  title: 'Downloads | Tasty Bites POS',
  description:
    'Download the latest Tasty Bites POS application for Android tablets and Windows computers.',
};

export default function DownloadPosPage() {
  return <PosDownloadsCenter variant="public" />;
}

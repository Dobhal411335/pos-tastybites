import { PosDownloadsCenter } from '@/components/downloads/PosDownloadsCenter';

export const metadata = {
  title: 'Downloads | Admin',
  description: 'Download the latest Tasty Bites POS applications.',
};

export default function AdminDownloadsPage() {
  return <PosDownloadsCenter variant="admin" />;
}

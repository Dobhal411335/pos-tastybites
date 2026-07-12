import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Unauthorized() {
  return (
    <div className="flex h-screen flex-col items-center justify-center space-y-4">
      <h2 className="text-3xl font-bold text-destructive">401 - Unauthorized</h2>
      <p className="text-muted-foreground">You do not have permission to view this page.</p>
      <Button asChild>
        <Link href="/">Return Home</Link>
      </Button>
    </div>
  );
}

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isLoggedIn } from '@/lib/api';

export default function Root() {
  const router = useRouter();

  useEffect(() => {
    router.replace(isLoggedIn() ? '/dashboard' : '/login');
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-white">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-violet-600" />
    </div>
  );
}

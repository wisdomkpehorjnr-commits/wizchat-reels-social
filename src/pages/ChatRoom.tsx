
import React, { lazy, Suspense } from 'react';

const Optimized = lazy(() => import('@/features/chat/OptimizedChatRoom'));

const Fallback = () => <div className="min-h-[40vh] flex items-center justify-center">Loading chat...</div>;

export default function ChatRoomLoader() {
  return (
    <Suspense fallback={<Fallback />}>
      <Optimized />
    </Suspense>
  );
}

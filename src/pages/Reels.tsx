import React from 'react';
import Layout from '@/components/Layout';
import ReelsFeed from '@/components/ReelsModern/ReelsFeed';

const ReelsPage: React.FC = () => {
  return (
    <Layout>
      {/* Container constrained between header (h-16 = 64px) and mobile bottom nav (h-16 = 64px on mobile) */}
      <div className="h-[calc(100vh-64px)] md:h-[calc(100vh-64px)] overflow-hidden">
        <ReelsFeed />
      </div>
    </Layout>
  );
};

export default ReelsPage;

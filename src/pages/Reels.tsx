import React from 'react';
import Layout from '@/components/Layout';
import ReelsFeed from '@/components/ReelsModern/ReelsFeed';

const ReelsPage: React.FC = () => {
  return (
    <Layout>
      <div className="h-[calc(100vh-64px)]">{/* leave full viewport for reels */}
        <ReelsFeed />
      </div>
    </Layout>
  );
};

export default ReelsPage;

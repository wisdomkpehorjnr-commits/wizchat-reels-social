import React from 'react';
import Layout from '@/components/Layout';
import ReelsContainer from '@/components/Reels/ReelsContainer';

const ReelsPage: React.FC = () => {
  return (
    <Layout>
      <div className="w-full h-screen bg-background">
        <ReelsContainer />
      </div>
    </Layout>
  );
};

export default ReelsPage;

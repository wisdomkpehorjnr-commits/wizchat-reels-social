
import React from 'react';
import Layout from '@/components/Layout';
import TopicRooms from '@/components/TopicRooms';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Topics = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="border-2 green-border mb-6">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-foreground">Topic Rooms</CardTitle>
              <p className="text-muted-foreground">
                Join discussions on topics you're interested in
              </p>
            </CardHeader>
          </Card>
          
          <TopicRooms />
        </div>
      </div>
    </Layout>
  );
};

export default Topics;

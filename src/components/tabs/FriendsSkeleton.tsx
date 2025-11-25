import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search } from 'lucide-react';

const FriendsSkeleton = () => {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-4xl mx-auto">
        {/* Search bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search for friends..."
              className="pl-10"
              disabled
            />
          </div>
        </div>

        {/* Tabs skeleton */}
        <Tabs defaultValue="friends" className="mb-6">
          <TabsList>
            <TabsTrigger value="friends">Friends (0)</TabsTrigger>
            <TabsTrigger value="requests">Requests (0)</TabsTrigger>
            <TabsTrigger value="sent">Sent (0)</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Friends grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(9)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex flex-col items-center space-y-3">
                  <Skeleton className="w-20 h-20 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FriendsSkeleton;


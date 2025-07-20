import { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { mockPosts } from '@/lib/mockData';
import { Post } from '@/types';
import { Calendar, MapPin, Link as LinkIcon, Edit } from 'lucide-react';

const Profile = () => {
  const { user } = useAuth();
  const [userPosts] = useState<Post[]>(mockPosts.filter(post => post.userId === user?.id));
  const [userReels] = useState<Post[]>(mockPosts.filter(post => post.userId === user?.id && post.isReel));

  if (!user) return null;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
              <Avatar className="w-24 h-24">
                <AvatarImage src={user.photoURL} />
                <AvatarFallback className="text-2xl">
                  {user.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-4">
                <div>
                  <h1 className="text-2xl font-bold">{user.name}</h1>
                  <p className="text-muted-foreground">{user.email}</p>
                </div>
                
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>Joined {new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(user.createdAt)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-4 h-4" />
                    <span>Location</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <LinkIcon className="w-4 h-4" />
                    <span>website.com</span>
                  </div>
                </div>
                
                <div className="flex space-x-6">
                  <div className="text-center">
                    <p className="text-xl font-bold">{userPosts.length}</p>
                    <p className="text-sm text-muted-foreground">Posts</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold">{userReels.length}</p>
                    <p className="text-sm text-muted-foreground">Reels</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold">1.2K</p>
                    <p className="text-sm text-muted-foreground">Followers</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold">856</p>
                    <p className="text-sm text-muted-foreground">Following</p>
                  </div>
                </div>
              </div>
              
              <Button variant="outline" className="flex items-center space-x-2">
                <Edit className="w-4 h-4" />
                <span>Edit Profile</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Content Tabs */}
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="reels">Reels</TabsTrigger>
          </TabsList>
          
          <TabsContent value="posts" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userPosts.map((post) => (
                <Card key={post.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    {post.imageUrl && (
                      <img
                        src={post.imageUrl}
                        alt="Post"
                        className="w-full h-48 object-cover rounded-lg mb-3"
                      />
                    )}
                    <p className="text-sm line-clamp-3">{post.content}</p>
                    <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
                      <span>{post.likes.length} likes</span>
                      <span>{post.comments.length} comments</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {userPosts.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No posts yet</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="reels" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {userReels.map((reel) => (
                <Card key={reel.id} className="hover:shadow-md transition-shadow aspect-[9/16]">
                  <CardContent className="p-0 h-full">
                    {reel.videoUrl && (
                      <div className="relative h-full">
                        <video
                          src={reel.videoUrl}
                          className="w-full h-full object-cover rounded-lg"
                          muted
                          loop
                        />
                        <div className="absolute bottom-2 left-2 right-2">
                          <p className="text-white text-sm line-clamp-2 bg-black/50 rounded p-2">
                            {reel.content}
                          </p>
                        </div>
                        <Badge className="absolute top-2 right-2">
                          {reel.likes.length}
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {userReels.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No reels yet</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Profile;
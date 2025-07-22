
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Post } from '@/types';
import { dataService } from '@/services/dataService';
import { Image, Video, Send } from 'lucide-react';

interface CreatePostProps {
  onPostCreated: (post: Post) => void;
}

const CreatePost: React.FC<CreatePostProps> = ({ onPostCreated }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;

    setLoading(true);
    try {
      const newPost = await dataService.createPost({
        content,
        isReel: false,
      });
      onPostCreated(newPost);
      setContent('');
    } catch (error) {
      console.error('Error creating post:', error);
      // For now, we'll create a temporary post structure
      // This should be removed when real API is implemented
      const tempPost: Post = {
        id: Date.now().toString(),
        userId: 'current-user',
        user: {
          id: 'current-user',
          name: 'Current User',
          username: '@currentuser',
          email: 'user@example.com',
          photoURL: '',
          avatar: '',
          createdAt: new Date(),
        },
        content,
        likes: [],
        comments: [],
        reactions: [],
        hashtags: [],
        createdAt: new Date(),
      };
      onPostCreated(tempPost);
      setContent('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <Textarea
          placeholder="What's on your mind?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[100px]"
          disabled={loading}
        />
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" disabled={loading}>
              <Image className="w-4 h-4 mr-2" />
              Photo
            </Button>
            <Button variant="outline" size="sm" disabled={loading}>
              <Video className="w-4 h-4 mr-2" />
              Video
            </Button>
          </div>
          <Button onClick={handleSubmit} disabled={!content.trim() || loading}>
            <Send className="w-4 h-4 mr-2" />
            {loading ? 'Posting...' : 'Post'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CreatePost;

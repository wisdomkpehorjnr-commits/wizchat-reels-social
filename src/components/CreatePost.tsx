import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Post } from '@/types';
import { mockCurrentUser } from '@/lib/mockData';
import { Image, Video, Send } from 'lucide-react';

interface CreatePostProps {
  onPostCreated: (post: Post) => void;
}

const CreatePost: React.FC<CreatePostProps> = ({ onPostCreated }) => {
  const [content, setContent] = useState('');

  const handleSubmit = () => {
    if (!content.trim()) return;

    const newPost: Post = {
      id: Date.now().toString(),
      userId: mockCurrentUser.id,
      user: mockCurrentUser,
      content,
      likes: [],
      comments: [],
      createdAt: new Date(),
    };

    onPostCreated(newPost);
    setContent('');
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <Textarea
          placeholder="What's on your mind?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[100px]"
        />
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              <Image className="w-4 h-4 mr-2" />
              Photo
            </Button>
            <Button variant="outline" size="sm">
              <Video className="w-4 h-4 mr-2" />
              Video
            </Button>
          </div>
          <Button onClick={handleSubmit} disabled={!content.trim()}>
            <Send className="w-4 h-4 mr-2" />
            Post
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CreatePost;
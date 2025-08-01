import React from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

const StoryCarousel = () => {
  // Mock data for stories
  const stories = [
    {
      id: '1',
      user: {
        name: 'Your Story',
        avatar: '',
        username: 'you'
      },
      isAddStory: true
    },
    {
      id: '2',
      user: {
        name: 'John Doe',
        avatar: '',
        username: 'johndoe'
      },
      hasNewStory: true
    },
    {
      id: '3',
      user: {
        name: 'Jane Smith',
        avatar: '',
        username: 'janesmith'
      },
      hasNewStory: true
    }
  ];

  return (
    <Card className="p-4">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex space-x-4">
          {stories.map((story) => (
            <div
              key={story.id}
              className="flex flex-col items-center space-y-2 min-w-[60px] cursor-pointer"
            >
              <div className={`relative ${story.hasNewStory ? 'ring-2 ring-primary rounded-full p-0.5' : ''}`}>
                <Avatar className="w-12 h-12">
                  <AvatarImage src={story.user.avatar} />
                  <AvatarFallback>{story.user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                {story.isAddStory && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-white text-xs">
                    +
                  </div>
                )}
              </div>
              <span className="text-xs text-muted-foreground text-center max-w-[60px] truncate">
                {story.isAddStory ? 'Add Story' : story.user.name}
              </span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
};

export default StoryCarousel;
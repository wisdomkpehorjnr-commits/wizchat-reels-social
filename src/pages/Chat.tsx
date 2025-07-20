import { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { mockChats } from '@/lib/mockData';
import { Chat as ChatType } from '@/types';
import { MessageCircle, Users, Plus } from 'lucide-react';

const Chat = () => {
  const [chats] = useState<ChatType[]>(mockChats);

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Messages</h1>
          <Button className="flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </Button>
        </div>

        <div className="grid gap-4">
          {chats.map((chat) => (
            <Link key={chat.id} to={`/chat/${chat.id}`}>
              <Card className="hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      {chat.isGroup ? (
                        <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                          <Users className="w-6 h-6 text-primary-foreground" />
                        </div>
                      ) : (
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={chat.participants[1]?.photoURL} />
                          <AvatarFallback>
                            {chat.participants[1]?.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      {!chat.lastMessage?.seen && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full"></div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold truncate">
                          {chat.isGroup 
                            ? chat.name 
                            : chat.participants.find(p => p.id !== '1')?.name}
                        </h3>
                        <span className="text-sm text-muted-foreground">
                          {chat.lastMessage && formatTime(chat.lastMessage.timestamp)}
                        </span>
                      </div>
                      
                      {chat.lastMessage && (
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-sm text-muted-foreground truncate">
                            {chat.isGroup && chat.lastMessage.user.name + ': '}
                            {chat.lastMessage.content}
                          </p>
                          {!chat.lastMessage.seen && (
                            <Badge variant="default" className="ml-2 text-xs">
                              New
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      {chat.isGroup && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {chat.participants.length} participants
                        </p>
                      )}
                    </div>

                    <MessageCircle className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {chats.length === 0 && (
          <div className="text-center py-12">
            <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No conversations yet. Start chatting!</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Chat;
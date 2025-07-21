
import { useState, useRef, useEffect } from 'react';
import Layout from '@/components/Layout';
import ReelCard from '@/components/ReelCard';
import { dataService } from '@/services/dataService';
import { Post } from '@/types';

const Reels = () => {
  const [reels, setReels] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentReelIndex, setCurrentReelIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadReels = async () => {
      try {
        const fetchedPosts = await dataService.getPosts();
        const reelPosts = fetchedPosts.filter(post => post.isReel);
        setReels(reelPosts);
      } catch (error) {
        console.error('Error loading reels:', error);
      } finally {
        setLoading(false);
      }
    };

    loadReels();
  }, []);

  const handleScroll = () => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const scrollTop = container.scrollTop;
    const itemHeight = container.clientHeight;
    const newIndex = Math.round(scrollTop / itemHeight);
    
    if (newIndex !== currentReelIndex && newIndex >= 0 && newIndex < reels.length) {
      setCurrentReelIndex(newIndex);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [currentReelIndex]);

  const handleLike = async (postId: string) => {
    try {
      await dataService.likePost(postId);
      console.log('Liked reel:', postId);
    } catch (error) {
      console.error('Error liking reel:', error);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="fixed inset-0 top-16 bg-black flex items-center justify-center">
          <div className="text-center text-white">
            <p className="text-xl mb-4">Loading reels...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="fixed inset-0 top-16 bg-black">
        <div
          ref={containerRef}
          className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {reels.map((reel, index) => (
            <div key={reel.id} className="h-full snap-start">
              <ReelCard
                reel={reel}
                isActive={index === currentReelIndex}
                onLike={handleLike}
              />
            </div>
          ))}
        </div>
        
        {reels.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-white">
              <p className="text-xl mb-4">No reels yet</p>
              <p className="text-gray-400">Start creating amazing content!</p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Reels;

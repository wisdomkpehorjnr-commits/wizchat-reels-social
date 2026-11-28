import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '@/components/Layout';
import ReelsFeed from '@/components/ReelsModern/ReelsFeed';
import { Search, X, Clapperboard } from 'lucide-react';

const ReelsPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const initialReelId = searchParams.get('reel') || undefined;

  return (
    <Layout>
      {/* Reels top bar */}
      <div className="sticky top-16 z-40 border-b border-border/50 bg-background/85 backdrop-blur-xl">
        <div className="flex h-14 items-center gap-2 px-3">
          {!searchOpen ? (
            <>
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15">
                  <Clapperboard className="h-4 w-4 text-primary" />
                </span>
                <span className="home-instagram-title text-lg text-foreground">
                  Reels
                </span>
              </div>

              <div className="flex-1" />

              <button
                type="button"
                aria-label="Search reels"
                onClick={() => setSearchOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-foreground/15 bg-foreground/10 text-foreground backdrop-blur-xl transition-transform active:scale-95"
              >
                <Search className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <input
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search reels"
                  className="h-10 w-full rounded-full border border-border/60 bg-foreground/5 pl-9 pr-9 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/60"
                />

                {query && (
                  <button
                    type="button"
                    aria-label="Clear"
                    onClick={() => setQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setSearchOpen(false);
                  setQuery('');
                }}
                className="shrink-0 rounded-full border border-foreground/20 bg-foreground/10 px-3.5 py-2 text-sm font-medium text-foreground backdrop-blur-xl transition-transform active:scale-95"
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>

      {/* Reels viewport */}
      <div className="h-[calc(100vh-208px)] [height:calc(100dvh-208px)] overflow-hidden md:h-[calc(100vh-120px)] md:[height:calc(100dvh-120px)]">
        <ReelsFeed
          searchQuery={query}
          initialReelId={initialReelId}
          onClearSearch={() => {
            setQuery('');
            setSearchOpen(false);
          }}
        />
      </div>
    </Layout>
  );
};

export default ReelsPage;

import React, { useState } from 'react';
import Layout from '@/components/Layout';
import ReelsFeed from '@/components/ReelsModern/ReelsFeed';
import { Search, X, Clapperboard } from 'lucide-react';

const ReelsPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <Layout>
      {/* YouTube-style top bar */}
      <div className="sticky top-16 z-40 bg-background/85 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center gap-2 px-3 h-14">
          {!searchOpen ? (
            <>
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Clapperboard className="w-4 h-4 text-primary" />
                </span>
                <span className="text-lg font-semibold tracking-tight text-foreground">Reels</span>
              </div>
              <div className="flex-1" />
              <button
                type="button"
                aria-label="Search reels"
                onClick={() => setSearchOpen(true)}
                className="h-9 w-9 rounded-full bg-foreground/10 backdrop-blur-xl border border-foreground/15 flex items-center justify-center text-foreground transition-transform active:scale-95"
              >
                <Search className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search reels"
                  className="w-full h-10 rounded-full bg-foreground/5 border border-border/60 pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/60"
                />
                {query && (
                  <button
                    type="button"
                    aria-label="Clear"
                    onClick={() => setQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => { setSearchOpen(false); setQuery(''); }}
                className="shrink-0 rounded-full px-3.5 py-2 text-sm font-medium text-foreground bg-foreground/10 backdrop-blur-xl border border-foreground/20 transition-transform active:scale-95"
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>

      {/* Feed: viewport minus header (64) minus reels bar (56) */}
      <div className="h-[calc(100vh-120px)] overflow-hidden">
        <ReelsFeed searchQuery={query} />
      </div>
    </Layout>
  );
};

export default ReelsPage;

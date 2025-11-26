import React, { createContext, useCallback, useReducer, ReactNode } from 'react';
import { Reel, ReelFeedState } from '../types';

interface FeedAction {
  type: string;
  payload?: any;
}

interface ReelsFeedContextType {
  state: ReelFeedState;
  actions: {
    addReels: (reels: Reel[]) => void;
    setCurrentIndex: (index: number) => void;
    toggleLike: (reelId: string) => void;
    toggleSave: (reelId: string) => void;
    toggleFollow: (userId: string) => void;
    setLoading: (loading: boolean) => void;
    setError: (error?: string) => void;
    setHasMore: (hasMore: boolean) => void;
    reset: () => void;
  };
}

const initialState: ReelFeedState = {
  reels: [],
  currentIndex: 0,
  isLoading: false,
  hasMore: true,
  error: undefined,
  likedReelIds: new Set(),
  savedReelIds: new Set(),
  followedUserIds: new Set(),
};

const feedReducer = (state: ReelFeedState, action: FeedAction): ReelFeedState => {
  switch (action.type) {
    case 'ADD_REELS': {
      const newReels = action.payload.map((reel: Reel) => ({
        ...reel,
        isLiked: state.likedReelIds.has(reel.id),
        isSaved: state.savedReelIds.has(reel.id),
        isFollowing: state.followedUserIds.has(reel.userId),
      }));
      return {
        ...state,
        reels: [...state.reels, ...newReels],
      };
    }

    case 'SET_CURRENT_INDEX':
      return {
        ...state,
        currentIndex: action.payload,
      };

    case 'TOGGLE_LIKE': {
      const reelId = action.payload;
      const newLikedIds = new Set(state.likedReelIds);
      if (newLikedIds.has(reelId)) {
        newLikedIds.delete(reelId);
      } else {
        newLikedIds.add(reelId);
      }
      return {
        ...state,
        likedReelIds: newLikedIds,
        reels: state.reels.map((r) =>
          r.id === reelId
            ? {
                ...r,
                isLiked: !r.isLiked,
                likesCount: r.isLiked ? r.likesCount - 1 : r.likesCount + 1,
              }
            : r
        ),
      };
    }

    case 'TOGGLE_SAVE': {
      const reelId = action.payload;
      const newSavedIds = new Set(state.savedReelIds);
      if (newSavedIds.has(reelId)) {
        newSavedIds.delete(reelId);
      } else {
        newSavedIds.add(reelId);
      }
      return {
        ...state,
        savedReelIds: newSavedIds,
        reels: state.reels.map((r) =>
          r.id === reelId
            ? {
                ...r,
                isSaved: !r.isSaved,
              }
            : r
        ),
      };
    }

    case 'TOGGLE_FOLLOW': {
      const userId = action.payload;
      const newFollowedIds = new Set(state.followedUserIds);
      if (newFollowedIds.has(userId)) {
        newFollowedIds.delete(userId);
      } else {
        newFollowedIds.add(userId);
      }
      return {
        ...state,
        followedUserIds: newFollowedIds,
        reels: state.reels.map((r) =>
          r.userId === userId
            ? {
                ...r,
                isFollowing: !r.isFollowing,
              }
            : r
        ),
      };
    }

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case 'SET_HAS_MORE':
      return {
        ...state,
        hasMore: action.payload,
      };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
};

export const ReelsFeedContext = createContext<ReelsFeedContextType | null>(null);

export const ReelsFeedProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(feedReducer, initialState);

  const actions = {
    addReels: useCallback((reels: Reel[]) => {
      dispatch({ type: 'ADD_REELS', payload: reels });
    }, []),

    setCurrentIndex: useCallback((index: number) => {
      dispatch({ type: 'SET_CURRENT_INDEX', payload: index });
    }, []),

    toggleLike: useCallback((reelId: string) => {
      dispatch({ type: 'TOGGLE_LIKE', payload: reelId });
    }, []),

    toggleSave: useCallback((reelId: string) => {
      dispatch({ type: 'TOGGLE_SAVE', payload: reelId });
    }, []),

    toggleFollow: useCallback((userId: string) => {
      dispatch({ type: 'TOGGLE_FOLLOW', payload: userId });
    }, []),

    setLoading: useCallback((loading: boolean) => {
      dispatch({ type: 'SET_LOADING', payload: loading });
    }, []),

    setError: useCallback((error?: string) => {
      dispatch({ type: 'SET_ERROR', payload: error });
    }, []),

    setHasMore: useCallback((hasMore: boolean) => {
      dispatch({ type: 'SET_HAS_MORE', payload: hasMore });
    }, []),

    reset: useCallback(() => {
      dispatch({ type: 'RESET' });
    }, []),
  };

  const value: ReelsFeedContextType = {
    state,
    actions,
  };

  return (
    <ReelsFeedContext.Provider value={value}>
      {children}
    </ReelsFeedContext.Provider>
  );
};

export const useReelsFeed = () => {
  const context = React.useContext(ReelsFeedContext);
  if (!context) {
    throw new Error('useReelsFeed must be used within ReelsFeedProvider');
  }
  return context;
};

import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ScrollPositionProvider } from "./contexts/ScrollPositionContext";
import { TabManagerProvider } from "./contexts/TabManagerContext";

import Login from "./pages/Login";
import Home from "./pages/Home";
import ProtectedRoute from "./components/ProtectedRoute";
import MainTabsContainer from "./components/MainTabsContainer";

// ✅ Lazy load non-critical pages
const Reels = lazy(() => import("./pages/Reels"));
const Chat = lazy(() => import("./pages/Chat"));
const ChatRoom = lazy(() => import("./pages/ChatRoom"));
const Topics = lazy(() => import("./pages/Topics"));
const TopicRoom = lazy(() => import("./pages/TopicRoom"));
const Profile = lazy(() => import("./pages/Profile"));
const Friends = lazy(() => import("./pages/Friends"));
const Admin = lazy(() => import("./pages/Admin"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));

// ✅ Avatar customization page
const AvatarStudio = lazy(() => import("./components/AvatarStudio"));

// ✅ Premium pages
const Premium = lazy(() => import("./pages/Premium"));
const Advertise = lazy(() => import("./pages/premium/Advertise"));
const VerifyAccount = lazy(() => import("./pages/premium/VerifyAccount"));
const BeAnAdmin = lazy(() => import("./pages/premium/BeAnAdmin"));
const WizBoost = lazy(() => import("./pages/premium/WizBoost"));
const UnlimitedWizAi = lazy(() => import("./pages/premium/UnlimitedWizAi"));
const PremiumThemes = lazy(() => import("./pages/premium/PremiumThemes"));
const GPP = lazy(() => import("./pages/premium/GPP"));

// ✅ React Query client config
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // cache for 5 mins
      gcTime: 10 * 60 * 1000,   // garbage collect after 10 mins
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// ✅ Simple fallback loader
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <ScrollPositionProvider>
              <TabManagerProvider>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                  {/* Public routes */}
                  <Route path="/login" element={<Login />} />

                  {/* Protected routes - Main tabs use pre-rendered container */}
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <MainTabsContainer />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/reels"
                    element={
                      <ProtectedRoute>
                        <MainTabsContainer />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/chat"
                    element={
                      <ProtectedRoute>
                        <MainTabsContainer />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/chat/:chatId"
                    element={
                      <ProtectedRoute>
                        <ChatRoom />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/topics"
                    element={
                      <ProtectedRoute>
                        <MainTabsContainer />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/topic-room/:roomId"
                    element={
                      <ProtectedRoute>
                        <TopicRoom />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/profile/:userIdentifier"
                    element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/friends"
                    element={
                      <ProtectedRoute>
                        <MainTabsContainer />
                      </ProtectedRoute>
                    }
                  />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute>
                      <Admin />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  }
                />

                {/* ✅ Avatar Customization Page */}
                <Route
                  path="/avatar"
                  element={
                    <ProtectedRoute>
                      <AvatarStudio />
                    </ProtectedRoute>
                  }
                />

                {/* ✅ Premium Pages */}
                <Route
                  path="/premium"
                  element={
                    <ProtectedRoute>
                      <Premium />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/premium/advertise"
                  element={
                    <ProtectedRoute>
                      <Advertise />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/premium/verify"
                  element={
                    <ProtectedRoute>
                      <VerifyAccount />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/premium/admin"
                  element={
                    <ProtectedRoute>
                      <BeAnAdmin />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/premium/wizboost"
                  element={
                    <ProtectedRoute>
                      <WizBoost />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/premium/wizai"
                  element={
                    <ProtectedRoute>
                      <UnlimitedWizAi />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/premium/themes"
                  element={
                    <ProtectedRoute>
                      <PremiumThemes />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/premium/gpp"
                  element={
                    <ProtectedRoute>
                      <GPP />
                    </ProtectedRoute>
                  }
                />

                {/* Catch-all route */}
                <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              </TabManagerProvider>
            </ScrollPositionProvider>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

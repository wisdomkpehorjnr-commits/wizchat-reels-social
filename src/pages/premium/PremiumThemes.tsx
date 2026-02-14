import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Palette, Moon, Flag, BookOpen, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PremiumCodeVerification from '@/components/PremiumCodeVerification';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/contexts/ThemeContext';

const PremiumThemes = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { themeMode, setThemeMode } = useTheme();
  const [showVerification, setShowVerification] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState('');
  const [purchasedThemes, setPurchasedThemes] = useState<string[]>([]);

  useEffect(() => {
    // Load purchased themes from localStorage
    const purchased = JSON.parse(localStorage.getItem('purchased-themes') || '[]');
    setPurchasedThemes(purchased);
  }, []);

  const themes = [
    {
      id: 'light',
      icon: Palette,
      title: 'Green/White',
      price: 'FREE',
      description: 'Default WizChat theme',
      colors: ['bg-green-500', 'bg-white'],
      free: true
    },
    {
      id: 'dark',
      icon: Moon,
      title: 'Night Mode',
      price: 'FREE',
      description: 'Dark green & black',
      colors: ['bg-green-900', 'bg-black'],
      free: true
    },
    {
      id: 'ghana',
      icon: Flag,
      title: 'Ghana Pride',
      price: '₵70',
      description: 'Flag colors & cultural patterns',
      colors: ['bg-red-500', 'bg-yellow-500', 'bg-green-500'],
      free: false
    },
    {
      id: 'ultra',
      icon: BookOpen,
      title: 'Ultra',
      price: '₵120',
      description: 'Black & white focus mode — minimal distractions',
      colors: ['bg-black', 'bg-white'],
      free: false
    }
  ];

  const isThemePurchased = (themeId: string) => {
    return purchasedThemes.includes(themeId);
  };

  const isThemeActive = (themeId: string) => {
    if (themeId === 'light') return themeMode === 'light';
    if (themeId === 'dark') return themeMode === 'dark';
    if (themeId === 'ultra') return themeMode === 'ultra';
    if (themeId === 'ghana') return themeMode === 'ghana';
    return false;
  };

  const handleThemeToggle = (themeId: string) => {
    const currentlyActive = isThemeActive(themeId);

    if (themeId === 'light') {
      setThemeMode('light');
    } else if (themeId === 'dark') {
      setThemeMode('dark');
    } else if (themeId === 'ultra') {
      if (currentlyActive) {
        setThemeMode('light');
        toast({ title: 'Ultra Theme Deactivated', description: 'Returned to default theme.' });
        return;
      }

      if (isThemePurchased('ultra')) {
        setThemeMode('ultra');
        toast({ title: 'Ultra Theme Activated', description: 'Black & white focus mode is now active' });
      }
    } else if (themeId === 'ghana') {
      if (currentlyActive) {
        setThemeMode('light');
        toast({ title: 'Ghana Pride Deactivated', description: 'Returned to default theme.' });
        return;
      }

      if (isThemePurchased('ghana')) {
        setThemeMode('ghana');
        toast({ title: 'Ghana Pride Activated', description: 'Ghana Pride theme is now active' });
      }
    }
  };

  const handlePurchaseSuccess = (themeId: string) => {
    const newPurchased = [...purchasedThemes, themeId];
    setPurchasedThemes(newPurchased);
    localStorage.setItem('purchased-themes', JSON.stringify(newPurchased));
    
    // Activate the theme immediately after purchase
    if (themeId === 'ultra') {
      setThemeMode('ultra');
      toast({
        title: 'Ultra Theme Purchased & Activated!',
        description: 'Your black & white focus mode is now active. Enjoy the minimal experience!',
      });
    }

    if (themeId === 'ghana') {
      setThemeMode('ghana');
      toast({
        title: 'Ghana Pride Purchased & Activated!',
        description: 'The Ghana Pride theme is now active. Enjoy the colors!',
      });
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/premium')}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Premium
          </Button>

          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Palette className="w-12 h-12 text-pink-500" />
              <h1 className="text-4xl font-bold text-foreground">
                Premium Themes
              </h1>
            </div>
            <p className="text-muted-foreground text-lg">
              Customize Your WizChat Experience
            </p>
          </div>

          <div className="grid gap-6 mb-8">
            {themes.map((theme) => {
              const Icon = theme.icon;
              const isActive = isThemeActive(theme.id);
              const isPurchased = theme.free || isThemePurchased(theme.id);
              
              return (
                <Card 
                  key={theme.id} 
                  className={`border-2 hover:shadow-lg transition-all duration-300 ${
                    isActive ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border'
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-full ${isActive ? 'bg-primary/20' : 'bg-muted'}`}>
                          <Icon className={`w-6 h-6 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                        <div>
                          <CardTitle className="text-xl flex items-center gap-2">
                            {theme.title}
                            {isActive && (
                              <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                Active
                              </span>
                            )}
                            {isPurchased && !theme.free && !isActive && (
                              <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full">
                                Owned
                              </span>
                            )}
                          </CardTitle>
                          <CardDescription>{theme.description}</CardDescription>
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-primary">{theme.price}</div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">Preview:</span>
                        <div className="flex gap-2">
                          {theme.colors.map((color, idx) => (
                            <div 
                              key={idx} 
                              className={`w-8 h-8 rounded-full border-2 border-border ${color}`}
                            />
                          ))}
                        </div>
                      </div>
                      
                      {isPurchased ? (
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">
                            {isActive ? 'Enabled' : 'Enable'}
                          </span>
                          <Switch
                            checked={isActive}
                            onCheckedChange={() => handleThemeToggle(theme.id)}
                          />
                        </div>
                      ) : (
                        <Button 
                          onClick={() => {
                            setSelectedFeature(theme.title);
                            setShowVerification(true);
                          }}
                        >
                          Get Premium
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="bg-muted/50 border-2">
            <CardContent className="p-6">
              <p className="text-center text-sm text-muted-foreground">
                🔄 Themes sync across devices — no data loss!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <PremiumCodeVerification
        open={showVerification}
        onOpenChange={setShowVerification}
        onVerified={() => {
          const themeId = selectedFeature === 'Ultra' ? 'ultra' : 
                          selectedFeature === 'Ghana Pride' ? 'ghana' : '';
          if (themeId) {
            handlePurchaseSuccess(themeId);
          }
        }}
        featureName={selectedFeature}
      />
    </Layout>
  );
};

export default PremiumThemes;
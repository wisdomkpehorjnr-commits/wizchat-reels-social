import React from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Palette, Moon, PartyPopper, Flag, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PremiumThemes = () => {
  const navigate = useNavigate();

  const themes = [
    {
      icon: Palette,
      title: 'Green/White',
      price: 'FREE',
      description: 'Default WizChat theme',
      colors: ['bg-green-500', 'bg-white'],
      active: true
    },
    {
      icon: Moon,
      title: 'Night Mode',
      price: '₵3',
      description: 'Dark green & black',
      colors: ['bg-green-900', 'bg-black']
    },
    {
      icon: PartyPopper,
      title: 'Party Mode',
      price: '₵5',
      description: 'Animated emojis & confetti',
      colors: ['bg-purple-500', 'bg-pink-500', 'bg-yellow-500']
    },
    {
      icon: Flag,
      title: 'Ghana Pride',
      price: '₵7',
      description: 'Flag colors & cultural patterns',
      colors: ['bg-red-500', 'bg-yellow-500', 'bg-green-500']
    },
    {
      icon: BookOpen,
      title: 'Exam Mode',
      price: '₵4',
      description: 'Calm blue with focus timer',
      colors: ['bg-blue-400', 'bg-blue-600']
    }
  ];

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
            {themes.map((theme, index) => {
              const Icon = theme.icon;
              return (
                <Card 
                  key={index} 
                  className={`border-2 hover:shadow-lg transition-shadow ${
                    theme.active ? 'border-primary bg-primary/5' : ''
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-background rounded-full">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-xl flex items-center gap-2">
                            {theme.title}
                            {theme.active && (
                              <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                                Active
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
                    <div className="flex items-center gap-4 mb-4">
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
                    <Button 
                      className="w-full"
                      variant={theme.active ? 'outline' : 'default'}
                      disabled={theme.active}
                    >
                      {theme.active ? 'Currently Active' : 'Apply Theme Now'}
                    </Button>
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
    </Layout>
  );
};

export default PremiumThemes;

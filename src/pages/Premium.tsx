import React from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { 
  Megaphone, 
  BadgeCheck, 
  Crown, 
  Rocket, 
  Bot, 
  Palette, 
  DollarSign 
} from 'lucide-react';

const Premium = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Megaphone,
      title: 'Advertise',
      description: 'Reach thousands of WizChat users — promote your business, event, or service.',
      path: '/premium/advertise',
      color: 'text-blue-500'
    },
    {
      icon: BadgeCheck,
      title: 'Verify Account',
      description: 'Show you\'re legit — get the blue checkmark and unlock trust features.',
      path: '/premium/verify',
      color: 'text-green-500'
    },
    {
      icon: Crown,
      title: 'Be an Admin',
      description: 'Create and manage exclusive groups — charge members, control access, earn money.',
      path: '/premium/admin',
      color: 'text-yellow-500'
    },
    {
      icon: Rocket,
      title: 'WizBoost',
      description: 'Push your chat, group, or profile to the top — get more eyes, more engagement.',
      path: '/premium/wizboost',
      color: 'text-purple-500'
    },
    {
      icon: Bot,
      title: 'Unlimited WizAi',
      description: 'Your smart assistant — always on, always helpful, no limits.',
      path: '/premium/wizai',
      color: 'text-cyan-500'
    },
    {
      icon: Palette,
      title: 'Premium Themes',
      description: 'Make your chat look unique — choose from exclusive designs and animations.',
      path: '/premium/themes',
      color: 'text-pink-500'
    },
    {
      icon: DollarSign,
      title: 'GPP (Get Paid Plan)',
      description: 'Turn your WizChat into a money-making machine — get paid for what you do.',
      path: '/premium/gpp',
      color: 'text-emerald-500'
    }
  ];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              WizChat Pro
            </h1>
            <p className="text-muted-foreground text-lg">
              Unlock premium features and take your WizChat experience to the next level
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card 
                  key={index}
                  className="border-2 hover:shadow-lg transition-all duration-300 cursor-pointer hover:scale-105"
                  onClick={() => navigate(feature.path)}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-full bg-background ${feature.color}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                    </div>
                    <CardDescription className="text-sm leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(feature.path);
                      }}
                    >
                      Learn More
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Premium;

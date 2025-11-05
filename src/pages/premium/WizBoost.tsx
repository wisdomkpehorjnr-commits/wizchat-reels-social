import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Flame, Compass, Megaphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PremiumCodeVerification from '@/components/PremiumCodeVerification';
import { useToast } from '@/hooks/use-toast';

const WizBoost = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showVerification, setShowVerification] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState('');

  const boostOptions = [
    {
      icon: Flame,
      title: 'Feed Boost',
      price: '₵15',
      duration: '6 hours',
      description: 'Pin your post to Top Feed',
      features: ['Top visibility', 'More likes & comments', 'Track engagement']
    },
    {
      icon: Compass,
      title: 'Discovery Boost',
      price: '₵15',
      duration: '24 hours',
      description: 'Show your profile/group in "Nearby Discover"',
      features: ['Local visibility', 'New followers', 'Group members']
    },
    {
      icon: Megaphone,
      title: 'Group Blast',
      price: '₵35',
      duration: 'One-time',
      description: 'Notify 100+ nearby users about your group',
      features: ['Direct notifications', 'Targeted audience', 'Instant reach']
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
            <h1 className="text-4xl font-bold mb-4 text-foreground">
              WizBoost — Get Noticed Instantly
            </h1>
            <p className="text-muted-foreground text-lg">
              Push your content to the top — get more eyes, more engagement
            </p>
          </div>

          <div className="grid gap-6 mb-8">
            {boostOptions.map((option, index) => {
              const Icon = option.icon;
              return (
                <Card key={index} className="border-2 hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary/10 rounded-full">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">{option.title}</CardTitle>
                          <CardDescription>{option.description}</CardDescription>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">{option.price}</div>
                        <div className="text-xs text-muted-foreground">{option.duration}</div>
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {option.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      className="w-full"
                      onClick={() => {
                        setSelectedFeature(option.title);
                        setShowVerification(true);
                      }}
                    >
                      Get Premium
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="bg-muted/50 border-2">
            <CardContent className="p-6">
              <p className="text-center text-sm text-muted-foreground">
                ⚡ Only 3 boosts per user per week — keeps it fair!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <PremiumCodeVerification
        open={showVerification}
        onOpenChange={setShowVerification}
        onVerified={() => toast({ title: "Success!", description: `${selectedFeature} activated!` })}
        featureName={selectedFeature}
      />
    </Layout>
  );
};

export default WizBoost;

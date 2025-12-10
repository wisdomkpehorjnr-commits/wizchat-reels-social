import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, DollarSign, MapPin, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PremiumCodeVerification from '@/components/PremiumCodeVerification';
import { useToast } from '@/hooks/use-toast';

const Advertise = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showVerification, setShowVerification] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState('');

  const adOptions = [
    {
      icon: DollarSign,
      title: 'Boosted Post',
      price: '₵10',
      description: 'Pin your post to "Top Feed" for 24 hours',
      features: ['Top visibility', 'Reach thousands', 'Track views']
    },
    {
      icon: MapPin,
      title: 'Geo-Targeted Ad',
      price: '₵35',
      description: 'Show your ad to users in Accra/Kumasi only',
      features: ['Location targeting', 'Higher conversion', 'Track by city']
    },
    {
      icon: Users,
      title: 'Group Sponsorship',
      price: '₵60',
      description: 'Sponsor a popular study group',
      features: ['Direct audience', 'Engaged users', 'Brand awareness']
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
              Promote Your Brand on WizChat
            </h1>
            <p className="text-muted-foreground text-lg">
              Get seen by students, hustlers, and local businesses across Ghana
            </p>
          </div>

          <div className="grid gap-6 mb-8">
            {adOptions.map((option, index) => {
              const Icon = option.icon;
              return (
                <Card key={index} className="border-2">
                  <CardHeader>
                    <div className="flex items-start justify-between">
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
                        <div className="text-3xl font-bold text-primary">{option.price}</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 mb-4">
                      {option.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                          {feature}
                        </li>
                      ))}
                    </ul>
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
                All ads reviewed manually — no spam allowed
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

export default Advertise;

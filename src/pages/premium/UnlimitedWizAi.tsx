import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Bot, MessageSquare, Languages, FileText, Wifi } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PremiumCodeVerification from '@/components/PremiumCodeVerification';
import { useToast } from '@/hooks/use-toast';

const UnlimitedWizAi = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showVerification, setShowVerification] = useState(false);

  const features = [
    {
      icon: MessageSquare,
      title: 'Summarize Long Chats',
      description: 'Get instant summaries of group discussions'
    },
    {
      icon: MessageSquare,
      title: 'Draft Smart Replies',
      description: 'Help me reply to my lecturer professionally'
    },
    {
      icon: Languages,
      title: 'Translate Languages',
      description: 'Twi/Ga to English and vice versa'
    },
    {
      icon: FileText,
      title: 'Generate Study Notes',
      description: 'From voice memos to organized notes'
    },
    {
      icon: Wifi,
      title: 'Offline Mode',
      description: 'Works without internet connection'
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
              <Bot className="w-12 h-12 text-cyan-500" />
              <h1 className="text-4xl font-bold text-foreground">
                Unlimited WizAi
              </h1>
            </div>
            <p className="text-muted-foreground text-lg">
              Your Personal Chat Assistant
            </p>
          </div>

          <Card className="mb-8 border-2">
            <CardHeader>
              <CardTitle className="text-2xl">Features Included</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {features.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <div key={index} className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                      <Icon className="w-5 h-5 text-primary mt-1" />
                      <div>
                        <h3 className="font-semibold mb-1">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card className="border-2">
              <CardHeader>
                <CardTitle>Free Tier</CardTitle>
                <CardDescription>Limited access</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-muted-foreground mb-2">3 uses</div>
                <p className="text-sm text-muted-foreground mb-4">per week</p>
                <Button variant="outline" className="w-full" disabled>
                  Current Plan
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary bg-primary/5">
              <CardHeader>
                <CardTitle className="text-primary">Pro Tier</CardTitle>
                <CardDescription>Unlimited + custom tones</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary mb-2">Unlimited</div>
                <p className="text-sm text-muted-foreground mb-4">+ professional, funny, polite modes</p>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Weekly</span>
                    <span className="font-bold">₵20</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Monthly</span>
                    <span className="font-bold text-primary">₵70</span>
                  </div>
                </div>
                <Button 
                  className="w-full"
                  onClick={() => setShowVerification(true)}
                >
                  Unlock Unlimited AI
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-muted/50 border-2">
            <CardContent className="p-6">
              <p className="text-center text-sm text-muted-foreground">
                🎓 Students get 50% off with .edu email!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <PremiumCodeVerification
        open={showVerification}
        onOpenChange={setShowVerification}
        onVerified={() => toast({ title: "Success!", description: "Unlimited WizAi activated!" })}
        featureName="Unlimited WizAi"
      />
    </Layout>
  );
};

export default UnlimitedWizAi;

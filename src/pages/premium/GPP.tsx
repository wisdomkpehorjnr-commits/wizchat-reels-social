import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, DollarSign, BookOpen, Radio, ShoppingBag, Trophy, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PremiumCodeVerification from '@/components/PremiumCodeVerification';
import { useToast } from '@/hooks/use-toast';

const GPP = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showVerification, setShowVerification] = useState(false);

  const earningWays = [
    {
      icon: MessageSquare,
      title: 'Tips from Users',
      description: 'Receive direct tips via MoMo'
    },
    {
      icon: BookOpen,
      title: 'Selling Study Notes',
      description: 'Share and sell your guides'
    },
    {
      icon: Radio,
      title: 'Live Audio Rooms',
      description: 'Host paid ticket events'
    },
    {
      icon: ShoppingBag,
      title: 'Product Promotion',
      description: 'Earn via affiliate links'
    },
    {
      icon: Trophy,
      title: 'Weekly Contests',
      description: 'Win cash prizes'
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
              <DollarSign className="w-12 h-12 text-emerald-500" />
              <h1 className="text-4xl font-bold text-foreground">
                GPP — Get Paid Plan
              </h1>
            </div>
            <p className="text-muted-foreground text-lg">
              Monetize Everything You Do
            </p>
          </div>

          <Card className="mb-8 border-2">
            <CardHeader>
              <CardTitle className="text-2xl">What You Can Earn From</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {earningWays.map((way, index) => {
                  const Icon = way.icon;
                  return (
                    <div key={index} className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                      <Icon className="w-5 h-5 text-primary mt-1" />
                      <div>
                        <h3 className="font-semibold mb-1">{way.title}</h3>
                        <p className="text-sm text-muted-foreground">{way.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="mb-8 border-2">
            <CardHeader>
              <CardTitle className="text-2xl">Setup in 3 Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Link Your MoMo Number</h3>
                    <p className="text-sm text-muted-foreground">
                      Connect your mobile money account securely
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Enable "Get Paid" Toggle</h3>
                    <p className="text-sm text-muted-foreground">
                      Activate earning features on your profile
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Share Your "Tip Me" Link</h3>
                    <p className="text-sm text-muted-foreground">
                      wizchat.app/tip/yourname
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-8 border-2 bg-primary/5">
            <CardContent className="p-6">
              <div className="text-center mb-4">
                <div className="text-2xl font-bold text-primary mb-2">0% Fee</div>
                <p className="text-sm text-muted-foreground">
                  For the first 3 months → then 5% transaction fee
                </p>
              </div>
            <Button 
              size="lg" 
              className="w-full"
              onClick={() => setShowVerification(true)}
            >
              Get Premium
            </Button>
            </CardContent>
          </Card>

          <Card className="border-2 bg-muted/50">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="text-4xl">💬</div>
                <div>
                  <p className="font-semibold mb-1 text-foreground">Real Success Story</p>
                  <p className="text-sm text-muted-foreground">
                    "I made ₵350 last week helping students with assignments!"
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <PremiumCodeVerification
        open={showVerification}
        onOpenChange={setShowVerification}
        onVerified={() => toast({ title: "Success!", description: "GPP activated! Start earning today!" })}
        featureName="Get Paid Plan (GPP)"
      />
    </Layout>
  );
};

export default GPP;

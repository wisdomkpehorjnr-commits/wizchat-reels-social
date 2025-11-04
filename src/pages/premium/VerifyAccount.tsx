import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BadgeCheck, Shield, TrendingUp, HeadphonesIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PremiumCodeVerification from '@/components/PremiumCodeVerification';
import { useToast } from '@/hooks/use-toast';

const VerifyAccount = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showVerification, setShowVerification] = useState(false);

  const benefits = [
    {
      icon: BadgeCheck,
      title: 'Blue Verified Badge',
      description: 'Show next to your name everywhere'
    },
    {
      icon: HeadphonesIcon,
      title: 'Priority Support',
      description: 'Get help faster when you need it'
    },
    {
      icon: Shield,
      title: 'Create Verified Groups',
      description: 'Build trusted communities'
    },
    {
      icon: TrendingUp,
      title: 'Higher Visibility',
      description: 'Appear higher in search results'
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
              <BadgeCheck className="w-12 h-12 text-primary" />
              <h1 className="text-4xl font-bold text-foreground">
                Get Verified
              </h1>
            </div>
            <p className="text-muted-foreground text-lg">
              Build Trust & Credibility
            </p>
          </div>

          <Card className="mb-8 border-2">
            <CardHeader>
              <CardTitle className="text-2xl">Why Verify?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {benefits.map((benefit, index) => {
                  const Icon = benefit.icon;
                  return (
                    <div key={index} className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                      <Icon className="w-5 h-5 text-primary mt-1" />
                      <div>
                        <h3 className="font-semibold mb-1">{benefit.title}</h3>
                        <p className="text-sm text-muted-foreground">{benefit.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="mb-8 border-2">
            <CardHeader>
              <CardTitle className="text-2xl">Verification Steps</CardTitle>
              <CardDescription>Simple 3-step process</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Upload ID</h3>
                    <p className="text-sm text-muted-foreground">
                      Driver's License, Student Card, or Business Registration
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Record Selfie Video</h3>
                    <p className="text-sm text-muted-foreground">
                      Say "I'm [Your Name] from WizChat"
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Wait 24 Hours</h3>
                    <p className="text-sm text-muted-foreground">
                      Get verified after review
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 bg-primary/5">
            <CardContent className="p-8 text-center">
              <div className="text-4xl font-bold text-primary mb-2">₵45</div>
              <p className="text-muted-foreground mb-4">One-time verification fee</p>
            <Button 
              size="lg" 
              className="w-full max-w-md"
              onClick={() => setShowVerification(true)}
            >
              Apply
            </Button>
              <p className="text-sm text-muted-foreground mt-4">
                ✨ Bonus: Verified users get 1 free WizBoost per month!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

              <PremiumCodeVerification
                open={showVerification}
                onOpenChange={setShowVerification}
                onVerified={() => {
                  toast({ 
                    title: "Success! ✅", 
                    description: "Account verified! Check your profile for the blue tick." 
                  });
                }}
                featureName="Verification"
              />
    </Layout>
  );
};

export default VerifyAccount;

import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Crown, Users, DollarSign, BarChart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PremiumCodeVerification from '@/components/PremiumCodeVerification';
import { useToast } from '@/hooks/use-toast';

const BeAnAdmin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showVerification, setShowVerification] = useState(false);

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
              <Crown className="w-12 h-12 text-yellow-500" />
              <h1 className="text-4xl font-bold text-foreground">
                Become a WizChat Admin
              </h1>
            </div>
            <p className="text-muted-foreground text-lg">
              Monetize Your Community
            </p>
          </div>

          <Card className="mb-8 border-2">
            <CardHeader>
              <CardTitle className="text-2xl">What You Get</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                  <Users className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">Create Private Groups</h3>
                    <p className="text-sm text-muted-foreground">Up to 500 members per group</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                  <DollarSign className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">Set Monthly Fees</h3>
                    <p className="text-sm text-muted-foreground">₵15–₵100 per member</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                  <DollarSign className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">Collect Payments via MoMo</h3>
                    <p className="text-sm text-muted-foreground">Direct to your mobile money account</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                  <BarChart className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">View Member Analytics</h3>
                    <p className="text-sm text-muted-foreground">Track who's active and who paid</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-8 border-2">
            <CardHeader>
              <CardTitle className="text-2xl">How It Works</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  'Click "Create Admin Group"',
                  'Set name, price, and rules',
                  'Share invite link → users pay to join',
                  'You earn 90% — we take 10%'
                ].map((step, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold flex-shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-muted-foreground pt-1">{step}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 bg-primary/5">
            <CardContent className="p-8 text-center">
            <Button 
              size="lg" 
              className="w-full max-w-md mb-4"
              onClick={() => setShowVerification(true)}
            >
              Get Premium
            </Button>
              <p className="text-sm text-muted-foreground">
                💡 Tip: Perfect for tutors, coaches, or side hustle teams!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <PremiumCodeVerification
        open={showVerification}
        onOpenChange={setShowVerification}
        onVerified={() => toast({ title: "Success!", description: "Admin features unlocked!" })}
        featureName="Admin Features"
      />
    </Layout>
  );
};

export default BeAnAdmin;

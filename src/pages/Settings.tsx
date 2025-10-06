import { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  HelpCircle,
  Shield,
  Globe,
  Bell,
  Lock,
  UserCog,
  Moon,
  Info,
  AlertTriangle,
  Trash2,
  LogOut,
  MessageCircle,
  Eye,
  Volume2,
  Vibrate,
  Star,
  Share2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import ConfirmationDialog from '@/components/ui/confirmation-dialog';

const Settings = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [fontSize, setFontSize] = useState([16]);
  const [notifications, setNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [hideOnlineStatus, setHideOnlineStatus] = useState(false);
  const [messagePermission, setMessagePermission] = useState('everyone');
  const [language, setLanguage] = useState('en');
  const [highContrast, setHighContrast] = useState(false);
  const [darkMode, setDarkMode] = useState('auto');
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const handleSaveSettings = () => {
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated successfully.",
    });
  };

  const handleReportProblem = () => {
    if (!reportReason.trim()) {
      toast({
        title: "Error",
        description: "Please describe the problem.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Report submitted",
      description: "Thank you! Our team will review your report shortly.",
    });
    setReportReason('');
    setReportDetails('');
  };

  const handleSubmitFeedback = () => {
    if (!feedbackText.trim()) {
      toast({
        title: "Error",
        description: "Please enter your feedback.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Feedback submitted",
      description: "Thank you for helping us improve!",
    });
    setFeedbackText('');
  };

  const handleClearCache = () => {
    toast({
      title: "Cache cleared",
      description: "App cache has been cleared successfully.",
    });
  };

  const handleDeleteAccount = async () => {
    toast({
      title: "Account deletion requested",
      description: "Your account will be deleted in 7 days. You can cancel this anytime.",
      variant: "destructive"
    });
    setShowDeleteDialog(false);
  };

  const handleLogoutAllDevices = async () => {
    try {
      await supabase.auth.signOut({ scope: 'global' });
      toast({
        title: "Logged out from all devices",
        description: "You've been logged out from all active sessions.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout from all devices.",
        variant: "destructive"
      });
    }
    setShowLogoutDialog(false);
  };

  return (
    <Layout>
      <div className="container max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>

        <Tabs defaultValue="help" className="w-full">
          <TabsList className="grid grid-cols-4 lg:grid-cols-8 w-full mb-6">
            <TabsTrigger value="help"><HelpCircle className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="safety"><Shield className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="language"><Globe className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="notifications"><Bell className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="privacy"><Lock className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="account"><UserCog className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="appearance"><Moon className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="about"><Info className="w-4 h-4" /></TabsTrigger>
          </TabsList>

          {/* Help & Support */}
          <TabsContent value="help" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5" />
                  Help & Support
                </CardTitle>
                <CardDescription>Get help and contact support</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Contact Support
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <HelpCircle className="w-4 h-4 mr-2" />
                    View FAQs
                  </Button>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label htmlFor="problem">Report a Problem</Label>
                  <Textarea
                    id="problem"
                    placeholder="Describe the issue you're experiencing..."
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <Input
                    placeholder="Additional details (optional)"
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                  />
                  <Button onClick={handleReportProblem} className="w-full">
                    Submit Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Safety & Reporting */}
          <TabsContent value="safety" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Safety & Reporting
                </CardTitle>
                <CardDescription>Manage your safety preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start text-destructive hover:bg-destructive hover:text-destructive-foreground">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Report a User
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Shield className="w-4 h-4 mr-2" />
                    Blocked Users
                  </Button>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium">Safety Guide</h4>
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p>• Never share personal information with strangers</p>
                    <p>• Report suspicious behavior immediately</p>
                    <p>• Use strong, unique passwords</p>
                    <p>• Enable two-factor authentication</p>
                    <p>• Be cautious of phishing attempts</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Language & Accessibility */}
          <TabsContent value="language" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Language & Accessibility
                </CardTitle>
                <CardDescription>Customize your experience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="language">App Language</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger id="language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="de">Deutsch</SelectItem>
                      <SelectItem value="zh">中文</SelectItem>
                      <SelectItem value="ja">日本語</SelectItem>
                      <SelectItem value="ar">العربية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label>Font Size: {fontSize[0]}px</Label>
                  <Slider
                    value={fontSize}
                    onValueChange={setFontSize}
                    min={12}
                    max={24}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>High Contrast Mode</Label>
                    <p className="text-sm text-muted-foreground">Improve visibility</p>
                  </div>
                  <Switch
                    checked={highContrast}
                    onCheckedChange={setHighContrast}
                  />
                </div>

                <Button onClick={handleSaveSettings} className="w-full">
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notifications
                </CardTitle>
                <CardDescription>Control your notification preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Master Notifications</Label>
                    <p className="text-sm text-muted-foreground">Turn all notifications on/off</p>
                  </div>
                  <Switch
                    checked={notifications}
                    onCheckedChange={setNotifications}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4" />
                    <Label>Sound</Label>
                  </div>
                  <Switch
                    checked={soundEnabled}
                    onCheckedChange={setSoundEnabled}
                    disabled={!notifications}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Vibrate className="w-4 h-4" />
                    <Label>Vibration</Label>
                  </div>
                  <Switch
                    checked={vibrationEnabled}
                    onCheckedChange={setVibrationEnabled}
                    disabled={!notifications}
                  />
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label>Mute Conversations</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button variant="outline" size="sm">8 hours</Button>
                    <Button variant="outline" size="sm">1 day</Button>
                    <Button variant="outline" size="sm">1 week</Button>
                  </div>
                </div>

                <Button onClick={handleSaveSettings} className="w-full">
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy */}
          <TabsContent value="privacy" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Privacy
                </CardTitle>
                <CardDescription>Control who can see your information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label>Who can message me?</Label>
                  <Select value={messagePermission} onValueChange={setMessagePermission}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="everyone">Everyone</SelectItem>
                      <SelectItem value="contacts">Contacts Only</SelectItem>
                      <SelectItem value="nobody">Nobody</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    <div className="space-y-0.5">
                      <Label>Hide Online Status</Label>
                      <p className="text-sm text-muted-foreground">Others won't see when you're active</p>
                    </div>
                  </div>
                  <Switch
                    checked={hideOnlineStatus}
                    onCheckedChange={setHideOnlineStatus}
                  />
                </div>

                <Separator />

                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start" onClick={handleClearCache}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear Search History
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={handleClearCache}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear Cache
                  </Button>
                </div>

                <Button onClick={handleSaveSettings} className="w-full">
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account */}
          <TabsContent value="account" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCog className="w-5 h-5" />
                  Account
                </CardTitle>
                <CardDescription>Manage your account settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label htmlFor="password">Change Password</Label>
                  <Input id="password" type="password" placeholder="New password" />
                  <Input type="password" placeholder="Confirm new password" />
                  <Button className="w-full">Update Password</Button>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Two-Factor Authentication</Label>
                      <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                    </div>
                    <Badge variant="outline">Not enabled</Badge>
                  </div>
                  <Button variant="outline" className="w-full">
                    Enable 2FA
                  </Button>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setShowLogoutDialog(true)}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Log Out of All Devices
                  </Button>

                  <Button 
                    variant="destructive" 
                    className="w-full justify-start"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete My Account
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    You have 7 days to cancel account deletion
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance */}
          <TabsContent value="appearance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Moon className="w-5 h-5" />
                  Appearance
                </CardTitle>
                <CardDescription>Customize how the app looks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label>Dark Mode</Label>
                  <Select value={darkMode} onValueChange={setDarkMode}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto</SelectItem>
                      <SelectItem value="on">On</SelectItem>
                      <SelectItem value="off">Off</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleSaveSettings} className="w-full">
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* App Info */}
          <TabsContent value="about" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  App Info
                </CardTitle>
                <CardDescription>About WizchatPro</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Version</span>
                    <span className="font-medium">1.0.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Build</span>
                    <span className="font-medium">2025.01.20</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <Star className="w-4 h-4 mr-2" />
                    Rate Us on App Store
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share with Friends
                  </Button>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label htmlFor="feedback">Share Feedback</Label>
                  <Textarea
                    id="feedback"
                    placeholder="Tell us what you think..."
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <Button onClick={handleSubmitFeedback} className="w-full">
                    Submit Feedback
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        description="Are you sure you want to delete your account? This action cannot be undone. You have 7 days to cancel the deletion."
        confirmText="Delete Account"
        variant="destructive"
      />

      <ConfirmationDialog
        open={showLogoutDialog}
        onOpenChange={setShowLogoutDialog}
        onConfirm={handleLogoutAllDevices}
        title="Logout All Devices"
        description="This will log you out from all devices except this one. You'll need to log in again on other devices."
        confirmText="Logout All"
      />
    </Layout>
  );
};

export default Settings;
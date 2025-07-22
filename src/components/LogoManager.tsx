
import { useState, useRef } from 'react';
import { Upload, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dataService } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';

const LogoManager = () => {
  const [currentLogo, setCurrentLogo] = useState<string>('');
  const [newLogoFile, setNewLogoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const loadCurrentLogo = async () => {
    try {
      const logoUrl = await dataService.getSiteLogo();
      setCurrentLogo(logoUrl);
    } catch (error) {
      console.error('Error loading current logo:', error);
    }
  };

  useState(() => {
    loadCurrentLogo();
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setNewLogoFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const uploadLogo = async () => {
    if (!newLogoFile) return;

    setLoading(true);
    try {
      // In a real implementation, you'd upload to Supabase Storage
      // For now, we'll simulate with a mock URL
      const mockUrl = `/uploads/logo-${Date.now()}.${newLogoFile.name.split('.').pop()}`;
      
      await dataService.updateSiteLogo(mockUrl);
      setCurrentLogo(mockUrl);
      setNewLogoFile(null);
      setPreviewUrl('');
      
      toast({
        title: "Success",
        description: "Logo updated successfully!"
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Error",
        description: "Failed to update logo",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Site Logo Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Current Logo</Label>
          <div className="mt-2 p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
            {currentLogo ? (
              <img
                src={currentLogo}
                alt="Current Logo"
                className="max-w-full max-h-32 mx-auto object-contain"
              />
            ) : (
              <p className="text-muted-foreground">No logo set</p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="logo-upload">Upload New Logo</Label>
          <Input
            id="logo-upload"
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            ref={fileInputRef}
            className="mt-2"
          />
        </div>

        {previewUrl && (
          <div>
            <Label>Preview</Label>
            <div className="mt-2 p-4 border-2 border-dashed border-primary rounded-lg text-center">
              <img
                src={previewUrl}
                alt="Logo Preview"
                className="max-w-full max-h-32 mx-auto object-contain"
              />
            </div>
          </div>
        )}

        <div className="flex space-x-2">
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="flex-1"
          >
            <Upload className="h-4 w-4 mr-2" />
            Choose File
          </Button>
          
          {newLogoFile && (
            <Button
              onClick={uploadLogo}
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : 'Save Logo'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LogoManager;

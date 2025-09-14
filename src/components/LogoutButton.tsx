import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import ConfirmationDialog from './ui/confirmation-dialog';

interface LogoutButtonProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showIcon?: boolean;
}

const LogoutButton = ({ 
  variant = "ghost", 
  size = "default", 
  className = "",
  showIcon = true 
}: LogoutButtonProps) => {
  const { logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
      toast({
        title: "Logged out",
        description: "You have been successfully logged out"
      });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setShowConfirm(true)}
      >
        {showIcon && <LogOut className="w-4 h-4 mr-2" />}
        Logout
      </Button>
      
      <ConfirmationDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title="Logout"
        description="Are you sure you want to log out of your account?"
        onConfirm={handleLogout}
        confirmText="Logout"
        cancelText="Cancel"
      />
    </>
  );
};

export default LogoutButton;
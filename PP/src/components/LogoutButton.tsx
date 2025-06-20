import React from 'react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const LogoutButton: React.FC = () => {
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    toast.success('Logout realizado com sucesso');
  };

  return (
    <Button
      onClick={handleLogout}
      variant="outline"
      size="sm"
      className="bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600 hover:text-white transition-colors duration-200"
    >
      <LogOut className="w-4 h-4 mr-2" />
      Sair
    </Button>
  );
};

export default LogoutButton; 
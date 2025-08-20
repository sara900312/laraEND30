import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Lock, Mail } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LanguageToggle } from '@/components/ui/LanguageToggle';

const AdminLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    console.log("🔵 Attempting login with:", { email, password: "***hidden***" });
    console.log("🔵 Using Supabase URL:", supabase.supabaseUrl);

    try {
      console.log("🔵 Calling admin-login-v2 function...");
      const { data, error } = await supabase.functions.invoke('admin-login-v2', {
        body: { email, password }
      });

      console.log("🔵 Login response data:", data);
      console.log("🔵 Login response error:", error);

      if (error) {
        console.error("❌ Supabase function error:", error);
        throw error;
      }

      if (data?.success) {
        console.log("✅ Login successful, setting localStorage and navigating");
        localStorage.setItem('adminAuth', 'true');
        toast({
          title: "تسجيل دخول ناجح",
          description: "مرحباً بك في لوحة الإدارة",
        });
        navigate('/admin-aa-smn-justme9003');
      } else {
        console.log("❌ Login failed, data.success =", data?.success);
        console.log("❌ Error message:", data?.error);
        toast({
          title: "خطأ في تسجيل الدخول",
          description: data?.error || "بيانات الدخول غير صحيحة",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('❌ Login error caught:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        fullError: error
      });
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تسجيل الدخول",
        variant: "destructive",
      });
    } finally {
      console.log("🔵 Login process ended, disabling loading.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10 p-4" dir="rtl">
      {/* Theme and Language Controls */}
      <div className="fixed top-4 left-4 z-50 flex gap-2">
        <ThemeToggle />
        <LanguageToggle />
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">
            لوحة إدارة الطلبات
          </CardTitle>
          <CardDescription>
            قم بتسجيل الدخول للوصول إلى لوحة الإدارة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                البريد الإلكتروني
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                className="text-right"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                كلمة المرور
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="text-right"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
            </Button>
          </form>
          <div className="mt-4 text-center flex gap-2 justify-center" />
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLoginPage;

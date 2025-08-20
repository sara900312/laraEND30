import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Store } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LanguageToggle } from '@/components/ui/LanguageToggle';

const StoreLoginPage = () => {
  const [storeName, setStoreName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim() || !password.trim()) return;

    setIsLoading(true);
    console.log('🔵 Attempting store login:', { storeName: storeName.trim() });

    try {
      // Use the authenticate_store function
      const { data: storeId, error } = await supabase
        .rpc('authenticate_store', {
          store_name: storeName.trim(),
          store_password: password.trim()
        });

      console.log('🔵 Authentication response:', { storeId, error });

      if (error) {
        console.error('Store login error:', error);
        toast({
          title: "خطأ في تسجيل الدخول",
          description: `${error.message || "اسم المتجر أو كلمة المرور غير صحيحة"}`,
          variant: "destructive",
        });
        return;
      }

      if (storeId) {
        // جلب معلومات المتجر الصحيحة من قاعدة البيانات
        const { data: storeInfo, error: storeError } = await supabase
          .from('stores')
          .select('id, name')
          .eq('id', storeId)
          .single();

        if (storeError || !storeInfo) {
          console.error('Error fetching store info:', storeError);
          toast({
            title: "خطأ",
            description: "حدث خطأ في جلب معلومات المتجر",
            variant: "destructive",
          });
          return;
        }

        const storeData = {
          id: storeInfo.id,
          name: storeInfo.name  // استخدام الاسم الصحيح من قاعدة البيانات
        };

        localStorage.setItem('storeAuth', JSON.stringify(storeData));
        console.log('✅ Store auth saved to localStorage:', storeData);

        toast({
          title: "تسجيل دخول ناجح",
          description: `مرحباً بك في متجر ${storeInfo.name}`,
        });

        console.log('🔄 Navigating to /store-dashboard...');
        navigate('/store-dashboard');
      } else {
        toast({
          title: "خطأ في تسجيل الدخول",
          description: "اسم المتجر أو كلمة المرور غير صحيحة",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Store login error:', error);
      toast({
        title: "��طأ",
        description: "حدث خطأ أثناء تسجيل الدخول",
        variant: "destructive",
      });
    } finally {
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
          <CardTitle className="text-2xl font-bold text-primary flex items-center justify-center gap-2">
            <Store className="w-6 h-6" />
            دخول المتجر
          </CardTitle>
          <CardDescription>
            أدخل اسم متجرك للوصول إلى طلباتك
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="storeName" className="flex items-center gap-2">
                <Store className="w-4 h-4" />
                اسم المتجر
              </Label>
              <Input
                id="storeName"
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="أدخل اسم المتجر"
                required
                className="text-right"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Store className="w-4 h-4" />
                كلمة المرور
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور"
                required
                className="text-right"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !storeName.trim() || !password.trim()}
            >
              {isLoading ? 'جاري تسجيل الدخول...' : 'دخول المتجر'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default StoreLoginPage;

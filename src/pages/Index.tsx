import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Store, Shield, Package, Database } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
const Index = () => {
  const navigate = useNavigate();
  return <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 p-6" dir="rtl">
      {/* Theme and Language Controls */}
      <div className="fixed top-4 left-4 z-50 flex gap-2">
        <ThemeToggle />
        <LanguageToggle />
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-primary mb-4">نظام تتبع الطلبات</h1>
          <p className="text-xl text-muted-foreground">منصة لإدارة وتتبع الطلبات</p>
        </div>

        {/* Login Options */}
        <div className="flex flex-col md:flex-row gap-8 mb-12 justify-center max-w-4xl mx-auto">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/admin-aa-smn-justme9003')}>
            <CardHeader className="text-center">
              <Shield className="w-16 h-16 text-primary mx-auto mb-4" />
              <CardTitle className="text-2xl">لوحة الإدارة</CardTitle>
              <CardDescription>
                دخول المدير لإدارة الطلبات والمتاجر
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" size="lg">
                دخول الإدارة
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/store-login-space9003')}>
            <CardHeader className="text-center">
              <Store className="w-16 h-16 text-primary mx-auto mb-4" />
              <CardTitle className="text-2xl">دخول المتجر</CardTitle>
              <CardDescription>
                دخول أصحاب المتاجر لمتابعة طلباتهم
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline" size="lg">
                دخول المتجر
              </Button>
            </CardContent>
          </Card>

        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6 text-center">
              <Package className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-bold text-lg mb-2">تتبع ذكي</h3>
              <p className="text-muted-foreground">
                تتبع الطلبات في الوقت الفعلي مع تحديثات تلقائية
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-bold text-lg mb-2">أمان عالي</h3>
              <p className="text-muted-foreground">
                نظام أمان متقدم لحماية بيانات الطلبات والعملاء
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Store className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-bold text-lg mb-2">إدارة متقدمة</h3>
              <p className="text-muted-foreground">
                أدوات إدارة شاملة للمتاجر والطلبات والعملاء
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 pt-8 border-t">
          <p className="text-muted-foreground">
            <strong>
              "نظام تتبّع الطلبات الذكي يوفّر متابعة لحظية ودقيقة لحالة الطلبات من لحظة إنشائها وحتى تسليمها."
            </strong>
          </p>
          <p></p>
        </div>
      </div>
    </div>;
};
export default Index;

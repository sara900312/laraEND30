import React from 'react';
import { ArabicText } from './arabic-text';
import { Card, CardContent } from './card';
import { Button } from './button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <div className="flex flex-col items-center gap-4">
              <AlertTriangle className="w-12 h-12 text-red-500" />
              <div>
                <h3 className="font-semibold text-lg mb-2">
                  <ArabicText>حدث خطأ في تحميل المكون</ArabicText>
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  <ArabicText>
                    عذراً، حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.
                  </ArabicText>
                </p>
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="text-xs text-left bg-gray-100 p-2 rounded mb-4">
                    <summary className="cursor-pointer">تفاصيل الخطأ</summary>
                    <pre className="mt-2 whitespace-pre-wrap">
                      {this.state.error.message}
                    </pre>
                  </details>
                )}
              </div>
              <Button 
                onClick={this.handleReset}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <ArabicText>إعادة المحاولة</ArabicText>
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export const useErrorBoundary = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { captureError, resetError };
};

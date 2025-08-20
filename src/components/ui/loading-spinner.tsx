import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const LoadingSpinner = ({ className, size = "md" }: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8", 
    lg: "w-12 h-12"
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <div
          className={cn(
            "animate-spin rounded-full border-4 border-muted border-t-primary mx-auto mb-4",
            sizeClasses[size],
            className
          )}
        />
        <p className="text-muted-foreground text-sm" dir="rtl">
          جاري التحميل...
        </p>
      </div>
    </div>
  );
};

export default LoadingSpinner;

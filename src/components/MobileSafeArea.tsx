import { useIsMobile } from "@/hooks/use-mobile";
import { ReactNode } from "react";

interface MobileSafeAreaProps {
  children: ReactNode;
  className?: string;
}

export function MobileSafeArea({ children, className = "" }: MobileSafeAreaProps) {
  const isMobile = useIsMobile();

  return (
    <div 
      className={`${className} ${isMobile ? 'pb-24' : ''}`}
      style={{
        paddingBottom: isMobile ? '90px' : undefined,
        minHeight: isMobile ? 'calc(100vh - 90px)' : '100vh'
      }}
    >
      {children}
    </div>
  );
}

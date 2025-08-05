import React from 'react';

interface InvestProLogoProps {
  className?: string;
  size?: number;
}

export const InvestProLogo: React.FC<InvestProLogoProps> = ({ 
  className = "h-8 w-8", 
  size = 32 
}) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 192 192" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`grad1-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{stopColor:"#059669", stopOpacity:1}} />
          <stop offset="100%" style={{stopColor:"#047857", stopOpacity:1}} />
        </linearGradient>
      </defs>
      <rect width="192" height="192" rx="24" fill={`url(#grad1-${size})`}/>
      <g transform="translate(48, 48)">
        <rect x="0" y="60" width="12" height="36" fill="#fbbf24" rx="2"/>
        <rect x="20" y="45" width="12" height="51" fill="#fbbf24" rx="2"/>
        <rect x="40" y="30" width="12" height="66" fill="#fbbf24" rx="2"/>
        <rect x="60" y="15" width="12" height="81" fill="#fbbf24" rx="2"/>
        <rect x="80" y="0" width="12" height="96" fill="#fbbf24" rx="2"/>
        <path d="M85 15 L95 5 L105 15 L100 15 L100 30 L90 30 L90 15 Z" fill="white"/>
      </g>
      <text 
        x="96" 
        y="160" 
        textAnchor="middle" 
        fill="white" 
        fontFamily="Arial, sans-serif" 
        fontSize={size > 24 ? "18" : "12"} 
        fontWeight="bold"
      >
        InvestPro
      </text>
    </svg>
  );
};

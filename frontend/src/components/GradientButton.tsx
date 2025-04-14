
import React from 'react';
import { Button } from "./ui/button";
import { cn } from '../lib/utils';

interface GradientButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'secondary';
}

const GradientButton = ({ 
  children, 
  className, 
  variant = 'default',
  ...props 
}: GradientButtonProps) => {
  return (
    <Button
      className={cn(
        'relative overflow-hidden group transition-all duration-300 flex items-center justify-center',
        variant === 'default' 
          ? 'bg-gradient-to-r from-exam-purple to-exam-blue hover:shadow-lg hover:shadow-exam-purple/20 text-white'
          : 'bg-white text-exam-purple hover:bg-gray-50 hover:shadow-md',
        className
      )}
      {...props}
    >
      <span className="relative z-10">{children}</span>
      <span className="absolute inset-0 bg-gradient-to-r from-exam-blue via-exam-purple to-exam-pink opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-size-200 animate-gradient-x"></span>
      <span className="absolute inset-0 w-full h-full scale-0 rounded-full group-hover:scale-100 transition-transform duration-500 bg-white/10 origin-center"></span>
    </Button>
  );
};

export default GradientButton;

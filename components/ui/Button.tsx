import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'ghost';
}

export const Button: React.FC<ButtonProps> = ({ children, className, size = 'md', variant = 'primary', ...props }) => {
  const sizeClasses = {
    sm: 'h-9 px-3 rounded-md text-sm',
    md: 'h-10 py-2 px-4 text-sm',
    lg: 'h-11 px-8 rounded-md text-base',
  };

  const variantClasses = {
    primary: 'bg-primary-light text-white hover:bg-opacity-90 shadow',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    ghost: 'bg-transparent text-white hover:bg-white/10'
  }

  return (
    <button
      className={`inline-flex items-center justify-center rounded-md font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

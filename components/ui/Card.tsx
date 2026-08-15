import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className, ...props }) => {
  return (
    <div
      className={`rounded-lg border bg-card text-gray-800 shadow-md ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
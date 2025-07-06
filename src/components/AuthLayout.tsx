import React from 'react';
import { Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-gray-800">
            <Sparkles className="w-8 h-8 text-purple-600" />
            <span className="text-2xl font-bold">NEURA</span>
          </Link>
          <h2 className="text-2xl font-bold text-gray-800 mt-6">{title}</h2>
          <p className="text-gray-600 mt-2">{subtitle}</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';

interface GatewayProps {
  onUnlock: () => void;
}

export const Gateway: React.FC<GatewayProps> = ({ onUnlock }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const REQUIRED_PASS = 's1068575628';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === REQUIRED_PASS) {
      onUnlock();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
      setPassword('');
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#1a546d] flex items-center justify-center p-4">
      <form 
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 text-center"
      >
        <div className="relative group">
          <input
            autoFocus
            type="password"
            name="app-gateway-pass"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="الرجاء إدخال رمز الدخول"
            className={`w-full px-6 py-4 bg-white/10 border-2 rounded-2xl text-white text-center text-xl font-bold placeholder:text-white/30 focus:outline-none transition-all duration-300 ${
              error 
                ? 'border-red-500 animate-shake' 
                : 'border-white/20 focus:border-primary-light focus:bg-white/20'
            }`}
            dir="rtl"
          />
          
          {error && (
            <p className="absolute -bottom-8 left-0 right-0 text-red-300 text-sm font-bold animate-fade-in">
              رمز الدخول غير صحيح
            </p>
          )}
        </div>
        
        <button type="submit" className="hidden">Enter</button>
      </form>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 0.2s cubic-bezier(.36,.07,.19,.97) both;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

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
    <div className="fixed inset-0 z-[9999] bg-[#0c2d3a] flex flex-col items-center justify-center p-4">
      <form 
        onSubmit={handleSubmit}
        className="w-full max-w-xl flex flex-col items-center"
      >
        <div className="relative w-full group">
          <input
            autoFocus
            type="password"
            name="app-gateway-pass"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full px-8 py-6 bg-[#4d90a5]/10 border border-[#4d90a5]/30 rounded-[28px] text-white text-center text-2xl tracking-[0.4em] focus:outline-none transition-all duration-500 shadow-2xl backdrop-blur-md ${
              error 
                ? 'border-red-500/50 bg-red-500/5 animate-shake' 
                : 'hover:border-[#4d90a5]/50 focus:border-[#4d90a5]/60 focus:bg-[#4d90a5]/15'
            }`}
          />
          
          {error && (
            <p className="absolute -bottom-10 left-0 right-0 text-red-400 text-xs font-bold tracking-widest animate-fade-in text-center">
              ACCESS DENIED
            </p>
          )}
        </div>
        
        <div className="mt-12 text-[11px] uppercase tracking-[0.5em] text-[#4d90a5]/60 font-bold select-none">
          Access Protected
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

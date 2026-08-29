import { Link } from 'react-router-dom';
import { Leaf, MoveLeft } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="flex-1 w-full flex flex-col items-center justify-center px-4 py-20">
      <div className="relative text-center">
        {/* Animated background glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#8EE074]/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-emerald-500/10 rounded-full blur-[60px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <Leaf className="w-24 h-24 text-[#8EE074] opacity-80 animate-pulse" />
              <div className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4">
                <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white/90 to-white/20 tracking-tighter drop-shadow-sm">404</span>
              </div>
            </div>
          </div>
          
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
            Lost in the concrete jungle?
          </h1>
          
          <p className="text-lg text-white/60 max-w-md mx-auto mb-10">
            We couldn't find the route you're looking for. The page may have been moved or doesn't exist.
          </p>
          
          <Link 
            to="/" 
            className="group flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white px-6 py-3 rounded-full font-semibold transition-all hover:scale-105 active:scale-95"
          >
            <MoveLeft className="w-5 h-5 text-[#8EE074] group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

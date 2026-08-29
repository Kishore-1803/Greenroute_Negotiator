import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ArrowRight, Menu, X } from 'lucide-react';
import { cn } from '@/lib/cn';

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/trip', label: 'Trip' },
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/impact', label: 'Impact' },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 w-full px-6 sm:px-10 lg:px-14 pt-3.5 sm:pt-4.5 pb-1 shrink-0 bg-transparent transition-all">
      <div className="flex w-full items-center justify-between">
        {/* Very Left: Logo with leaf.png */}
        <NavLink to="/" className="flex items-center gap-2.5 group shrink-0" onClick={() => setMobileOpen(false)}>
          <img src="/leaf.png" alt="GreenRoute Leaf Logo" className="h-7 w-7 object-contain drop-shadow-sm transition-transform duration-200 group-hover:scale-105" />
          <span className="text-xl sm:text-2xl font-bold tracking-tight text-white drop-shadow-sm">GreenRoute</span>
        </NavLink>

        {/* Center: Desktop Navigation Links */}
        <nav className="hidden items-center gap-9 lg:gap-11 md:flex">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.label}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                cn(
                  'relative py-1 text-base lg:text-[1.05rem] font-medium transition-all duration-200',
                  isActive
                    ? 'text-white font-semibold after:absolute after:-bottom-1.5 after:left-0 after:right-0 after:h-0.5 after:rounded-full after:bg-[#8EE074]'
                    : 'text-white/80 hover:text-white'
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Very Right: Action Controls */}
        <div className="hidden items-center gap-4 sm:flex shrink-0">
          <button
            type="button"
            onClick={() => {
              const formEl = document.getElementById('plan-route-card');
              if (formEl) {
                formEl.scrollIntoView({ behavior: 'smooth' });
              } else {
                navigate('/');
              }
            }}
            className="flex items-center gap-2 rounded-full bg-[#4D7C3E] hover:bg-[#5A8F48] px-6 py-2.5 text-base font-medium text-white shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <span>Get Started</span>
            <ArrowRight className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white border border-white/10 hover:bg-white/25 sm:hidden"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Dropdown */}
      {mobileOpen && (
        <div className="mt-3 flex flex-col gap-1 rounded-2xl bg-black/70 p-3 backdrop-blur-2xl border border-white/15 shadow-2xl sm:hidden">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.label}
              to={link.to}
              end={link.to === '/'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'rounded-xl px-4 py-2.5 text-sm font-medium transition-colors',
                  isActive ? 'bg-emerald-600/40 text-[#75E265] font-semibold' : 'text-white/80 hover:bg-white/10 text-white'
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              const formEl = document.getElementById('plan-route-card');
              if (formEl) {
                formEl.scrollIntoView({ behavior: 'smooth' });
              } else {
                navigate('/');
              }
            }}
            className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-[#2ea63e] py-3 text-sm font-medium text-white shadow-md hover:bg-[#34b647]"
          >
            <span>Get Started</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </header>
  );
}

import { useState, useRef } from 'react';
import { MapPin, Calendar, Award, User, Camera, TreeDeciduous, Leaf, Car } from 'lucide-react';
import type { UserProfile } from '../data/profileData';

interface ProfileGlassCardProps {
  profile: UserProfile;
}

export function ProfileGlassCard({ profile }: ProfileGlassCardProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAvatarUrl(url);
    }
  };

  return (
    <div className="dark-glass-pane w-full rounded-[26px] sm:rounded-[32px] p-5 sm:p-7 lg:p-8 shadow-2xl border border-white/20 relative overflow-hidden backdrop-blur-xl bg-black/40">
      {/* Top Half: Avatar + User Info + Badges */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
        {/* User Identity Details */}
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Avatar Circle with Hover Camera Icon */}
          <div className="relative shrink-0">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Change Profile Photo"
              className="group relative h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-black/60 border border-white/25 shadow-inner flex items-center justify-center overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/40 transition-transform active:scale-95"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={profile.name} className="h-full w-full object-cover" />
              ) : (
                <User className="h-8 w-8 sm:h-10 sm:w-10 text-white/80 stroke-[1.5] transition-opacity group-hover:opacity-20" />
              )}

              {/* Hover Camera Overlay (White Outline Only, No Words) */}
              <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                <Camera className="h-6 w-6 sm:h-7 sm:w-7 text-white stroke-[1.5]" />
              </div>
            </button>
          </div>

          {/* Name, Tag, Location */}
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h2 className="text-2xl sm:text-3xl lg:text-[1.85rem] font-extrabold tracking-tight text-white drop-shadow-sm">
                {profile.name}
              </h2>
              <span className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-[#8EE074]">
                <span>•</span> {profile.personalityTag}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-white/70">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-[#8EE074]/80" />
                {profile.location}
              </span>
              <span className="text-white/30">•</span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-white/60" />
                Member since {profile.memberSince}
              </span>
            </div>
          </div>
        </div>

        {/* Sustainability Status & Preferred Modes */}
        <div className="flex flex-col items-start lg:items-end gap-3.5 w-full lg:w-auto">
          {/* Status Badge */}
          <div className="flex items-center gap-3 rounded-2xl bg-white/10 border border-white/15 px-4 py-2 shadow-sm backdrop-blur-md">
            <div className="h-8 w-8 rounded-xl bg-[#8EE074]/20 border border-[#8EE074]/30 flex items-center justify-center text-[#8EE074]">
              <Award className="h-4.5 w-4.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-widest text-white/60 font-bold leading-none mb-0.5">
                {profile.sustainabilityStatus.level}
              </span>
              <span className="text-xs sm:text-sm font-bold text-white leading-tight">
                {profile.sustainabilityStatus.title}
              </span>
            </div>
          </div>

          {/* Preferred Transportation Modes */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-white/60 mr-1">
              Modes:
            </span>
            {profile.preferredModes.map((mode) => (
              <span
                key={mode.id}
                className="flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 px-3 py-1 text-xs font-medium text-white/90 transition-colors"
              >
                <span>{mode.icon}</span>
                <span>{mode.label}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Middle Half: Key Mobility & Impact Statistics (4 Center-Aligned Columns) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 pt-5 sm:pt-6">
        {/* Stat 1: Avoided CO2 */}
        <div className="flex flex-col items-center justify-center text-center gap-1">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white/60">
            Avoided CO₂
          </span>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#8EE074] tracking-tight">
              {profile.stats.avoidedCo2Kg}
            </span>
            <span className="text-sm sm:text-base font-bold text-[#8EE074]/90">kg</span>
          </div>
        </div>

        {/* Stat 2: Cost Saved */}
        <div className="flex flex-col items-center justify-center text-center gap-1 md:border-l md:border-white/10">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white/60">
            Cost Saved
          </span>
          <div className="flex items-baseline justify-center">
            <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
              ₹{profile.stats.costSavedInr}
            </span>
          </div>
        </div>

        {/* Stat 3: Low-Carbon Rate */}
        <div className="flex flex-col items-center justify-center text-center gap-1 md:border-l md:border-white/10">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white/60">
            Low-Carbon Rate
          </span>
          <div className="flex items-baseline justify-center">
            <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#8EE074] tracking-tight">
              {profile.stats.lowCarbonRatePercent}%
            </span>
          </div>
        </div>

        {/* Stat 4: Total Journeys */}
        <div className="flex flex-col items-center justify-center text-center gap-1 md:border-l md:border-white/10">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white/60">
            Total Journeys
          </span>
          <div className="flex items-baseline justify-center">
            <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
              {profile.stats.totalJourneys}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom: Climate Impact Breakdown & Equivalencies */}
      <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-center justify-center sm:justify-start gap-2.5 rounded-xl bg-white/5 border border-white/10 px-3.5 py-2">
          <TreeDeciduous className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
          <div className="flex flex-col text-left">
            <span className="text-[10px] text-white/50 uppercase font-bold tracking-wider">Tree Absorption</span>
            <span className="text-xs font-bold text-white">{profile.stats.treesEquivalent} Mature Tree Equivalent</span>
          </div>
        </div>

        <div className="flex items-center justify-center sm:justify-start gap-2.5 rounded-xl bg-white/5 border border-white/10 px-3.5 py-2">
          <Leaf className="h-4.5 w-4.5 text-[#8EE074] shrink-0" />
          <div className="flex flex-col text-left">
            <span className="text-[10px] text-white/50 uppercase font-bold tracking-wider">Green Choices</span>
            <span className="text-xs font-bold text-white">{profile.stats.greenChoices} / {profile.stats.totalJourneys} Trips Eco-Friendly</span>
          </div>
        </div>

        <div className="flex items-center justify-center sm:justify-start gap-2.5 rounded-xl bg-white/5 border border-white/10 px-3.5 py-2">
          <Car className="h-4.5 w-4.5 text-amber-400 shrink-0" />
          <div className="flex flex-col text-left">
            <span className="text-[10px] text-white/50 uppercase font-bold tracking-wider">Cars Off The Road</span>
            <span className="text-xs font-bold text-white">{profile.stats.vehicleTripsPrevented} Shared Rides Prevented</span>
          </div>
        </div>
      </div>
    </div>
  );
}

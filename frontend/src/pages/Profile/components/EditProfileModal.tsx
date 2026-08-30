import { useState, useRef } from 'react';
import { X, Check, Camera, User, MapPin, Sparkles, Loader2 } from 'lucide-react';
import type { UserProfile } from '../data/profileData';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onSave: (updates: {
    name?: string;
    location?: string;
    personality_tag?: string;
    preferred_modes?: string[];
    avatar_base64?: string;
  }) => Promise<void>;
}

const AVAILABLE_MODES = [
  { id: 'car', label: 'Car', icon: '🚗', desc: 'Personal & Carpool' },
  { id: 'two_wheeler', label: 'Two-Wheeler / EV', icon: '⚡', desc: 'Electric & Scooter' },
  { id: 'cycling', label: 'Bicycle', icon: '🚲', desc: 'Active Commute' },
  { id: 'bus', label: 'Public Bus', icon: '🚌', desc: 'City Transit' },
  { id: 'metro', label: 'Metro Rail', icon: '🚇', desc: 'Rapid Transit' },
];

export function EditProfileModal({ isOpen, onClose, profile, onSave }: EditProfileModalProps) {
  const [name, setName] = useState(profile.name);
  const [location, setLocation] = useState(profile.location);
  const [personalityTag, setPersonalityTag] = useState(profile.personalityTag);
  const [preferredModes, setPreferredModes] = useState<string[]>(
    profile.preferredModes.map((m) => m.id)
  );
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatarUrl || null);
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);

      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleToggleMode = (modeId: string) => {
    setPreferredModes((prev) =>
      prev.includes(modeId)
        ? prev.filter((id) => id !== modeId)
        : [...prev, modeId]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        location: location.trim(),
        personality_tag: personalityTag.trim(),
        preferred_modes: preferredModes.length > 0 ? preferredModes : ['car', 'two_wheeler', 'cycling'],
        ...(avatarBase64 ? { avatar_base64: avatarBase64 } : {}),
      });
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 400);
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in">
      {/* Heavy Backdrop Blur */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-xl transition-opacity"
        onClick={onClose}
      />

      {/* Main Glassmorphic Modal Window */}
      <div className="relative w-full max-w-lg rounded-[28px] sm:rounded-[32px] bg-[#0c140c]/95 border border-white/20 shadow-[0_25px_70px_rgba(0,0,0,0.85)] backdrop-blur-3xl overflow-hidden flex flex-col my-auto z-10">
        
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#8EE074]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between p-5 sm:p-6 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[#8EE074]/20 border border-[#8EE074]/30 flex items-center justify-center text-[#8EE074] shadow-sm">
              <User className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                Edit Your Profile
              </h2>
              <p className="text-xs text-white/60">
                Update your commuter persona & routing preferences
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col gap-5 relative z-10 max-h-[65vh]">
          
          {/* Avatar Change Center Banner */}
          <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarFileChange}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative h-16 w-16 rounded-full bg-black/60 border-2 border-[#8EE074]/40 shadow-inner flex items-center justify-center overflow-hidden cursor-pointer transition-transform active:scale-95 shrink-0"
              title="Upload New Profile Photo"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt={name} className="h-full w-full object-cover" />
              ) : (
                <User className="h-8 w-8 text-white/60" />
              )}
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera className="h-5 w-5 text-[#8EE074]" />
              </div>
            </button>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-white">Profile Photo</span>
              <p className="text-[11px] text-white/50 leading-relaxed">
                Click the avatar to upload a custom PNG or JPEG.
              </p>
            </div>
          </div>

          {/* Full Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-white/70 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-[#8EE074]" />
              <span>Full Name</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Surya Narayanan"
              className="w-full bg-white/5 border border-white/15 focus:border-[#8EE074]/60 focus:bg-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none transition-all"
            />
          </div>

          {/* Location */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-white/70 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-[#8EE074]" />
              <span>City / Primary Region</span>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Chennai, TN"
              className="w-full bg-white/5 border border-white/15 focus:border-[#8EE074]/60 focus:bg-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none transition-all"
            />
          </div>

          {/* Personality Tag */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-white/70 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[#8EE074]" />
              <span>Commuter Tagline</span>
            </label>
            <input
              type="text"
              value={personalityTag}
              onChange={(e) => setPersonalityTag(e.target.value)}
              placeholder="e.g. Eco-Smart Daily Commuter"
              className="w-full bg-white/5 border border-white/15 focus:border-[#8EE074]/60 focus:bg-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none transition-all"
            />
          </div>

          {/* Preferred Transportation Modes */}
          <div className="flex flex-col gap-2 pt-1">
            <label className="text-xs font-bold uppercase tracking-wider text-white/70">
              Preferred Mobility Channels
            </label>
            <p className="text-[11px] text-white/50">
              Select modes to prioritize during multi-agent route negotiations:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
              {AVAILABLE_MODES.map((mode) => {
                const isSelected = preferredModes.includes(mode.id);
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => handleToggleMode(mode.id)}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#4D7C3E]/50 border-[#8EE074]/60 text-white shadow-[0_0_12px_rgba(142,224,116,0.2)]'
                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="text-xl shrink-0">{mode.icon}</span>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white">{mode.label}</span>
                      <span className="text-[10px] text-white/50">{mode.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-5 sm:p-6 border-t border-white/10 flex items-center justify-end gap-3 bg-black/40 relative z-10">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold bg-[#8EE074] hover:bg-[#9DF083] text-black shadow-lg hover:shadow-[0_0_20px_rgba(142,224,116,0.6)] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-black" />
                <span>Saving...</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check className="h-4 w-4 text-black stroke-[3]" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4 text-black stroke-[2.5]" />
                <span>Save Profile Changes</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}

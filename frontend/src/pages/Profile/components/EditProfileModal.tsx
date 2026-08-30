import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import type { UserProfile } from '../data/profileData';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onSave: (updates: any) => Promise<void>;
}

const AVAILABLE_MODES = [
  { id: 'car', label: 'Car', icon: '🚗' },
  { id: 'two_wheeler', label: 'Two Wheeler', icon: '⚡' },
  { id: 'cycling', label: 'Cycling', icon: '🚲' },
  { id: 'bus', label: 'Bus', icon: '🚌' },
  { id: 'metro', label: 'Metro', icon: '🚇' },
];

export function EditProfileModal({ isOpen, onClose, profile, onSave }: EditProfileModalProps) {
  const [name, setName] = useState(profile.name);
  const [location, setLocation] = useState(profile.location);
  const [personalityTag, setPersonalityTag] = useState(profile.personalityTag);
  const [preferredModes, setPreferredModes] = useState<string[]>(
    profile.preferredModes.map(m => m.id)
  );
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleToggleMode = (modeId: string) => {
    setPreferredModes(prev => 
      prev.includes(modeId) 
        ? prev.filter(id => id !== modeId)
        : [...prev, modeId]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        name,
        location,
        personality_tag: personalityTag,
        preferred_modes: preferredModes
      });
      onClose();
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md rounded-[24px] bg-[#0A0A0A] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Edit Profile</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/70 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-white/70 uppercase tracking-wider">Name</label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#8EE074]/50"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-white/70 uppercase tracking-wider">Location</label>
            <input 
              type="text" 
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#8EE074]/50"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-white/70 uppercase tracking-wider">Personality Tag</label>
            <input 
              type="text" 
              value={personalityTag}
              onChange={e => setPersonalityTag(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#8EE074]/50"
            />
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <label className="text-xs font-semibold text-white/70 uppercase tracking-wider">Preferred Modes</label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_MODES.map(mode => {
                const isSelected = preferredModes.includes(mode.id);
                return (
                  <button
                    key={mode.id}
                    onClick={() => handleToggleMode(mode.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all ${
                      isSelected 
                        ? 'bg-[#8EE074]/20 border-[#8EE074]/50 text-white' 
                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <span>{mode.icon}</span>
                    <span className="text-sm font-medium">{mode.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 sm:p-6 border-t border-white/10 flex justify-end gap-3 bg-white/[0.02]">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold bg-[#8EE074] text-black hover:bg-[#9DF083] transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : (
              <>
                <Check className="h-4 w-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { Car, Bike } from 'lucide-react-native';
import type { TravelMode } from '../../types/mode';
import { colors } from '../../theme/tokens';

interface ModeIconProps {
  mode: TravelMode;
  size?: number;
  color?: string;
}

export const ModeIcon: React.FC<ModeIconProps> = ({
  mode,
  size = 18,
  color = colors.textWhite,
}) => {
  switch (mode) {
    case 'car':
      return <Car size={size} color={color} />;
    case 'two_wheeler':
      return <Bike size={size} color={color} />;
    case 'cycling':
      return <Bike size={size} color={color} />;
    default:
      return <Car size={size} color={color} />;
  }
};

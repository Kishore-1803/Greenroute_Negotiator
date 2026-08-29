import { Bike, Car, Motorbike, type LucideProps } from 'lucide-react';
import type { TravelMode } from '@/types/mode';

const ICON_BY_MODE: Record<TravelMode, typeof Car> = {
  car: Car,
  two_wheeler: Motorbike,
  cycling: Bike,
};

export function ModeIcon({ mode, ...rest }: { mode: TravelMode } & LucideProps) {
  const Icon = ICON_BY_MODE[mode];
  return <Icon strokeWidth={2} {...rest} />;
}

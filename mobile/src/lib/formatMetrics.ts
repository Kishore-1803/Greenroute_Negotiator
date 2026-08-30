export function formatMinutes(minutes: number | null | undefined): string {
  if (minutes == null) return '-- min';
  return `${Math.round(minutes)} min`;
}

export function formatCost(cost: number | null | undefined): string {
  if (cost == null) return '₹--';
  return `₹${Math.round(cost)}`;
}

export function formatCarbon(grams: number | null | undefined): string {
  if (grams == null) return '-- g CO₂';
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(2)} kg CO₂`;
  }
  return `${Math.round(grams)} g CO₂`;
}

export function formatDistance(km: number | null | undefined): string {
  if (km == null) return '-- km';
  return `${km.toFixed(1)} km`;
}

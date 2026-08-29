export function formatCarbon(value: number | null | undefined): string {
  if (value == null) return "-";
  return `${value.toFixed(1)} gCO₂`;
}
export function formatCost(value: number | null | undefined): string {
  if (value == null) return "-";
  return `₹ ${value.toFixed(1)}`; 
}
export function formatDistance(meters: number | null | undefined): string {
  if (meters == null) return "-";
  return `${(meters / 1000).toFixed(1)} km`;
}
export function formatMinutes(minutes: number | null | undefined): string {
  if (minutes == null) return "-";
  return `${Math.round(minutes)} min`;
}

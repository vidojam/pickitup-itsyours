export function getMapUrl(location: string) {
  const trimmed = location.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmed)}`;
}

export function getItemLocation(item: { location?: string; address?: string }) {
  return item.location ?? item.address ?? "";
}

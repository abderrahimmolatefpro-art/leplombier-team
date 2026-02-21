/**
 * Geocoding côté serveur (extraction ville depuis adresse)
 */

const GOOGLE_MAPS_API_KEY =
  process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

function extractCity(result: { address_components?: Array<{ types: string[]; long_name: string }> }): string | null {
  const components = result.address_components;
  if (!components?.length) return null;
  const order = ['locality', 'administrative_area_level_2', 'administrative_area_level_1'];
  for (const type of order) {
    const comp = components.find((c) => c.types.includes(type));
    if (comp?.long_name) return comp.long_name;
  }
  return null;
}

/** Geocode une adresse et retourne lat, lng, city */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number; city: string | null } | null> {
  if (!GOOGLE_MAPS_API_KEY) return null;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&region=ma&key=${GOOGLE_MAPS_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== 'OK' || !data.results?.[0]) return null;
  const result = data.results[0];
  const { lat, lng } = result.geometry.location;
  return { lat, lng, city: extractCity(result) };
}

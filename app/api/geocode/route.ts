import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_MAPS_API_KEY =
  process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export async function GET(request: NextRequest) {
  try {
    if (!GOOGLE_MAPS_API_KEY) {
      return NextResponse.json({ error: 'Geocoding non configuré' }, { status: 503 });
    }

    const address = request.nextUrl.searchParams.get('address');
    const lat = request.nextUrl.searchParams.get('lat');
    const lng = request.nextUrl.searchParams.get('lng');

    // Reverse geocode: lat/lng → address
    if (lat != null && lng != null) {
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
        return NextResponse.json({ error: 'lat et lng doivent être des nombres' }, { status: 400 });
      }
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latNum},${lngNum}&region=ma&key=${GOOGLE_MAPS_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status !== 'OK' || !data.results?.[0]) {
        return NextResponse.json({ address: null });
      }
      return NextResponse.json({ address: data.results[0].formatted_address });
    }

    // Geocode: address → lat/lng
    if (!address || typeof address !== 'string') {
      return NextResponse.json({ error: 'Paramètre address ou lat+lng requis' }, { status: 400 });
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== 'OK' || !data.results?.[0]) {
      return NextResponse.json({ lat: null, lng: null });
    }

    const { lat: latRes, lng: lngRes } = data.results[0].geometry.location;
    return NextResponse.json({ lat: latRes, lng: lngRes });
  } catch (error) {
    console.error('[geocode] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

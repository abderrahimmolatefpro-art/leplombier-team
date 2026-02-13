'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { MapPin } from 'lucide-react';

interface AddressInputProps {
  value: string;
  onChange: (address: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  /** Quand false, désactive l'autocomplete et les maps (ex: formulaire masqué) */
  active?: boolean;
  label?: string;
}

export default function AddressInput({
  value,
  onChange,
  placeholder = 'Commencez à taper une adresse...',
  required = false,
  disabled = false,
  active = true,
  label = 'Adresse',
}: AddressInputProps) {
  const [addressPreviewCoords, setAddressPreviewCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showAddressMap, setShowAddressMap] = useState(false);
  const [geocodingMap, setGeocodingMap] = useState(false);
  const [showPickOnMap, setShowPickOnMap] = useState(false);
  const [pickingAddress, setPickingAddress] = useState(false);
  const [inputMounted, setInputMounted] = useState(false);

  const addressInputRef = useRef<HTMLInputElement | null>(null);
  const addressPreviewMapRef = useRef<HTMLDivElement>(null);
  const addressPreviewMapInstanceRef = useRef<google.maps.Map | null>(null);
  const pickOnMapRef = useRef<HTMLDivElement>(null);
  const pickOnMapInstanceRef = useRef<google.maps.Map | null>(null);
  const pickMarkerRef = useRef<google.maps.Marker | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const handleMapClickRef = useRef<(lat: number, lng: number) => Promise<void>>(() => Promise.resolve());

  const setAddressInputRef = useCallback((el: HTMLInputElement | null) => {
    addressInputRef.current = el;
    setInputMounted(!!el);
  }, []);

  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    setPickingAddress(true);
    try {
      const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
      const data = await res.json();
      if (data.address) {
        onChange(data.address);
        setAddressPreviewCoords({ lat, lng });
        setShowPickOnMap(false);
      }
    } finally {
      setPickingAddress(false);
    }
  }, [onChange]);

  handleMapClickRef.current = handleMapClick;

  const handleAddressChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
      setAddressPreviewCoords(null);
      setShowAddressMap(false);
      setShowPickOnMap(false);
    },
    [onChange]
  );

  const handleShowAddressOnMap = async () => {
    if (!value.trim()) return;
    if (addressPreviewCoords) {
      setShowAddressMap(true);
      return;
    }
    setGeocodingMap(true);
    try {
      const res = await fetch(`/api/geocode?address=${encodeURIComponent(value)}`);
      const data = await res.json();
      if (data.lat && data.lng) {
        setAddressPreviewCoords({ lat: data.lat, lng: data.lng });
        setShowAddressMap(true);
      }
    } finally {
      setGeocodingMap(false);
    }
  };

  useEffect(() => {
    if (!active || !inputMounted) return;
    const inputEl = addressInputRef.current;
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!inputEl || !key) return;

    const initAutocomplete = () => {
      const g = (window as unknown as { google?: typeof google }).google;
      if (!g?.maps?.places || !inputEl || autocompleteRef.current) return;
      try {
        const autocomplete = new g.maps.places.Autocomplete(inputEl, {
          componentRestrictions: { country: 'ma' },
          fields: ['formatted_address', 'geometry'],
        });
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (place.formatted_address) onChange(place.formatted_address);
          const loc = place.geometry?.location;
          if (loc) setAddressPreviewCoords({ lat: loc.lat(), lng: loc.lng() });
        });
        autocompleteRef.current = autocomplete;
      } catch {
        // ignore
      }
    };

    if ((window as unknown as { google?: typeof google }).google?.maps?.places) {
      initAutocomplete();
      return () => {
        autocompleteRef.current = null;
      };
    }

    const cbName = `__placesInit_${Date.now()}`;
    (window as unknown as Record<string, () => void>)[cbName] = () => {
      initAutocomplete();
      delete (window as unknown as Record<string, unknown>)[cbName];
    };

    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      let attempts = 0;
      const checkReady = () => {
        const g = (window as unknown as { google?: typeof google }).google;
        if (g?.maps?.places) {
          initAutocomplete();
          return;
        }
        if (++attempts < 50) setTimeout(checkReady, 100);
      };
      checkReady();
      return () => {
        autocompleteRef.current = null;
      };
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&loading=async&callback=${cbName}`;
    script.async = true;
    document.head.appendChild(script);
    return () => {
      autocompleteRef.current = null;
    };
  }, [active, inputMounted, onChange]);

  useEffect(() => {
    if (!active || !showAddressMap || !addressPreviewCoords || !addressPreviewMapRef.current) {
      addressPreviewMapInstanceRef.current = null;
      return;
    }
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) return;

    const initPreviewMap = () => {
      const g = (window as unknown as { google?: typeof google }).google;
      if (!g || !addressPreviewMapRef.current) return;
      if (addressPreviewMapInstanceRef.current) return;

      const map = new g.maps.Map(addressPreviewMapRef.current, {
        center: addressPreviewCoords,
        zoom: 16,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'greedy',
      });
      new g.maps.Marker({
        position: addressPreviewCoords,
        map,
        title: 'Adresse',
      });
      addressPreviewMapInstanceRef.current = map;
    };

    if ((window as unknown as { google?: typeof google }).google) {
      initPreviewMap();
      return () => {
        addressPreviewMapInstanceRef.current = null;
      };
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async`;
    script.async = true;
    script.onload = initPreviewMap;
    document.head.appendChild(script);
    return () => {
      addressPreviewMapInstanceRef.current = null;
    };
  }, [active, showAddressMap, addressPreviewCoords]);

  useEffect(() => {
    if (addressPreviewCoords && addressPreviewMapInstanceRef.current) {
      addressPreviewMapInstanceRef.current.setCenter(addressPreviewCoords);
    }
  }, [addressPreviewCoords]);

  useEffect(() => {
    if (!active || !showPickOnMap || !pickOnMapRef.current) {
      pickOnMapInstanceRef.current = null;
      pickMarkerRef.current = null;
      return;
    }
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) return;

    const initPickMap = () => {
      const g = (window as unknown as { google?: typeof google }).google;
      if (!g || !pickOnMapRef.current) return;
      if (pickOnMapInstanceRef.current) return;

      const center = addressPreviewCoords || { lat: 33.5731, lng: -7.5898 };
      const map = new g.maps.Map(pickOnMapRef.current, {
        center,
        zoom: 14,
        gestureHandling: 'greedy',
      });

      const marker = new g.maps.Marker({
        position: addressPreviewCoords || center,
        map: addressPreviewCoords ? map : null,
        draggable: true,
      });

      const updateFromPosition = (pos: { lat: () => number; lng: () => number }) => {
        handleMapClickRef.current(pos.lat(), pos.lng());
      };

      map.addListener('click', (e: google.maps.MapMouseEvent) => {
        const lat = e.latLng?.lat();
        const lng = e.latLng?.lng();
        if (lat != null && lng != null) {
          marker.setPosition({ lat, lng });
          marker.setMap(map);
          updateFromPosition({ lat: () => lat, lng: () => lng });
        }
      });

      marker.addListener('dragend', () => {
        const pos = marker.getPosition();
        if (pos) updateFromPosition(pos);
      });

      pickOnMapInstanceRef.current = map;
      pickMarkerRef.current = marker;
    };

    if ((window as unknown as { google?: typeof google }).google) {
      initPickMap();
      return () => {
        pickOnMapInstanceRef.current = null;
        pickMarkerRef.current = null;
      };
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async`;
    script.async = true;
    script.onload = initPickMap;
    document.head.appendChild(script);
    return () => {
      pickOnMapInstanceRef.current = null;
      pickMarkerRef.current = null;
    };
  }, [active, showPickOnMap, addressPreviewCoords]);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        ref={setAddressInputRef}
        type="text"
        value={value}
        onChange={handleAddressChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoComplete="off"
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
      />
      <p className="text-xs text-gray-500 mt-1">Suggestions Google pour le Maroc</p>
      <div className="mt-2 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setShowPickOnMap(true)}
          disabled={disabled}
          className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          <MapPin className="w-4 h-4" />
          Préciser sur la carte
        </button>
        {value.trim() && (
          <button
            type="button"
            onClick={handleShowAddressOnMap}
            disabled={geocodingMap || disabled}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-700 font-medium"
          >
            {geocodingMap ? 'Chargement...' : 'Afficher sur la carte'}
          </button>
        )}
      </div>
      {showAddressMap && addressPreviewCoords && (
        <div className="mt-3 rounded-lg overflow-hidden border border-gray-200">
          <div className="bg-primary-50 px-3 py-1.5 flex items-center justify-between">
            <span className="text-sm font-medium text-primary-800">Voilà ! C&apos;est ici</span>
            <button
              type="button"
              onClick={() => setShowAddressMap(false)}
              className="text-xs text-primary-600 hover:text-primary-800"
            >
              Masquer
            </button>
          </div>
          <div ref={addressPreviewMapRef} className="w-full h-40 bg-gray-100" aria-hidden />
        </div>
      )}

      {showPickOnMap && (
        <div className="fixed inset-0 z-50 bg-black/50 flex flex-col">
          <div className="bg-white rounded-t-2xl flex-1 flex flex-col mt-auto max-h-[85vh]">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <p className="text-sm font-medium text-gray-700">
                Cliquez sur la carte pour indiquer l&apos;emplacement exact
              </p>
              <button
                type="button"
                onClick={() => setShowPickOnMap(false)}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                Fermer
              </button>
            </div>
            <div className="flex-1 min-h-[300px] relative">
              <div ref={pickOnMapRef} className="absolute inset-0 w-full h-full min-h-[300px]" />
              {pickingAddress && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                  <span className="text-sm text-gray-600">Récupération de l&apos;adresse...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

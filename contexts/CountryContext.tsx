'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { Country } from '@/types';

const STORAGE_KEY = 'country_selection';

export type CountryFilter = Country | 'ALL';

interface CountryContextValue {
  selectedCountry: CountryFilter;
  setSelectedCountry: (c: CountryFilter) => void;
  /** Pour les requêtes Firestore : si ALL, retourne ['MA','ES'] ; sinon [country] */
  countryFilter: Country[];
}

const CountryContext = createContext<CountryContextValue | null>(null);

export function CountryProvider({ children }: { children: ReactNode }) {
  const [selectedCountry, setSelectedCountryState] = useState<CountryFilter>('MA');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as CountryFilter | null;
      if (stored && (stored === 'MA' || stored === 'ES' || stored === 'ALL')) {
        setSelectedCountryState(stored);
      }
    } catch {
      // ignore
    }
    setMounted(true);
  }, []);

  const setSelectedCountry = useCallback((c: CountryFilter) => {
    setSelectedCountryState(c);
    try {
      localStorage.setItem(STORAGE_KEY, c);
    } catch {
      // ignore
    }
  }, []);

  const countryFilter: Country[] =
    selectedCountry === 'ALL' ? ['MA', 'ES'] : [selectedCountry];

  const value: CountryContextValue = {
    selectedCountry,
    setSelectedCountry,
    countryFilter,
  };

  return (
    <CountryContext.Provider value={value}>
      {children}
    </CountryContext.Provider>
  );
}

export function useCountry() {
  const ctx = useContext(CountryContext);
  if (!ctx) {
    throw new Error('useCountry must be used within CountryProvider');
  }
  return ctx;
}

export function useCountryOptional() {
  return useContext(CountryContext);
}

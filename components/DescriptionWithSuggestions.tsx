'use client';

import { useState, useRef, useEffect } from 'react';
import { SERVICE_DETAILS, QUICK_SERVICES } from '@/lib/services';
import type { ServiceDetail } from '@/lib/services';

interface DescriptionWithSuggestionsProps {
  value: string;
  onChange: (value: string) => void;
  onServiceSelect?: (service: ServiceDetail) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  minRows?: number;
  label?: string;
}

export default function DescriptionWithSuggestions({
  value,
  onChange,
  onServiceSelect,
  placeholder = "Ex: Fuite sous l'évier, robinet qui goutte...",
  required,
  className = '',
  minRows = 4,
  label = 'Description du problème',
}: DescriptionWithSuggestionsProps) {
  const [focused, setFocused] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const trimmed = value.trim();
  const hasExactMatch = SERVICE_DETAILS.some((s) => s.label.toLowerCase() === trimmed.toLowerCase());
  const suggestions =
    trimmed.length >= 2
      ? SERVICE_DETAILS.filter(
          (s) =>
            s.label.toLowerCase().includes(trimmed.toLowerCase()) &&
            s.label.toLowerCase() !== trimmed.toLowerCase()
        ).slice(0, 8)
      : trimmed.length === 0
        ? QUICK_SERVICES
        : [];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setHighlightIndex(0);
  }, [value, suggestions.length]);

  const showSuggestions = focused && suggestions.length > 0 && !hasExactMatch;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const handleSelect = (svc: ServiceDetail) => {
    onChange(svc.label);
    setFocused(false);
    onServiceSelect?.(svc);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' && suggestions[highlightIndex]) {
      e.preventDefault();
      handleSelect(suggestions[highlightIndex]);
    } else if (e.key === 'Escape') {
      setFocused(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
        {label}
      </label>
      <textarea
        value={value}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
        rows={minRows}
        className={`w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-slate-400 ${className}`}
      />
      {showSuggestions && suggestions.length > 0 && (
        <ul
          className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg py-1"
          role="listbox"
        >
          <li className="px-3 py-1.5 text-xs text-slate-500 border-b border-slate-100">
            {trimmed.length === 0 ? 'Choisissez ou tapez votre besoin' : 'Suggestions — tapez ou sélectionnez'}
          </li>
          {suggestions.map((svc, i) => (
            <li
              key={svc.id}
              role="option"
              aria-selected={i === highlightIndex}
              className={`px-3 py-2.5 text-sm cursor-pointer transition-colors ${
                i === highlightIndex ? 'bg-primary-50 text-primary-900' : 'text-slate-700 hover:bg-slate-50'
              }`}
              onMouseEnter={() => setHighlightIndex(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(svc);
              }}
            >
              <span className="font-medium">{svc.label}</span>
              {svc.priceLabel && (
                <span className="ml-2 text-xs text-slate-500">
                  {svc.priceType === 'fixe' ? svc.priceLabel : `≥${svc.priceLabel}`}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

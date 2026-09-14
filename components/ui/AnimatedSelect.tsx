'use client';

import { useState, useRef, useEffect } from 'react';

export type SelectOption = {
  value: string;
  label: string;
  priceAdjustment?: number;
};

type Props = {
  label: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function AnimatedSelect({ label, options, value, onChange, className = '' }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (isOpen) {
      setIsAnimating(true);
      setTimeout(() => {
        setIsOpen(false);
        setIsAnimating(false);
      }, 200);
    } else {
      setIsOpen(true);
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 200);
    }
  };

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsAnimating(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsAnimating(false);
    }, 200);
  };

  return (
    <div className={`relative ${className}`}>
      <label className="block text-xs font-medium uppercase tracking-[0.2em] text-plum-700 mb-2">
        {label}
      </label>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className={[
          'w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all duration-200',
          'bg-surface text-ink-800 hover:border-plum-500 focus:outline-none focus:ring-2 focus:ring-plum-200',
          isOpen ? 'border-plum-700 ring-2 ring-plum-200' : 'border-cream-300',
        ].join(' ')}
      >
        <span className="font-medium">{selectedOption?.label}</span>
        <svg
          className={[
            'w-4 h-4 text-plum-700 transition-transform duration-200',
            isOpen ? 'rotate-180' : '',
          ].join(' ')}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className={[
            'absolute z-50 w-full mt-1 bg-surface border border-cream-300 rounded-lg shadow-lg overflow-hidden',
            'transition-all duration-200 origin-top',
            isAnimating ? 'opacity-0 scale-y-95' : 'opacity-100 scale-y-100',
          ].join(' ')}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={[
                'w-full px-4 py-3 text-left transition-colors duration-150',
                'hover:bg-plum-50 hover:text-plum-700',
                value === option.value
                  ? 'bg-plum-100 text-plum-700 font-medium'
                  : 'text-ink-800',
              ].join(' ')}
            >
              <span>{option.label}</span>
              {option.priceAdjustment !== undefined && option.priceAdjustment !== 0 && (
                <span className="ml-2 text-sm text-ink-500">
                  {option.priceAdjustment > 0 ? '+' : ''}${option.priceAdjustment}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

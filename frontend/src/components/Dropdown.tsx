'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, X, Search } from 'lucide-react';

interface DropdownOption {
  id: string | number;
  label: string;
  value?: string | number;
}

type DropdownInputOptions = DropdownOption[] | string[] | number[];

interface DropdownProps {
  options: DropdownInputOptions;
  placeholder?: string;
  isMultiSelect?: boolean;
  isSearchable?: boolean;
  // Returns the actual selected value(s), not the object
  onSelectionChange?: (selected: string | number | (string | number)[] | null) => void;
  value?: string | number | (string | number)[] | null;
  maxHeight?: string;
  showSelectAll?: boolean;
  showReset?: boolean;
  disabled?: boolean;
}

export default function Dropdown({
  options,
  placeholder = 'Select an option...',
  isMultiSelect = false,
  isSearchable = true,
  onSelectionChange,
  value,
  maxHeight = 'max-h-60',
  showSelectAll = true,
  showReset = true,
  disabled = false,
}: DropdownProps) {
  // Convert raw strings/numbers to DropdownOption objects
  const normalizedOptions: DropdownOption[] = useMemo(() => {
    return options.map((option, index) => {
      if (typeof option === 'object' && option !== null) {
        return option as DropdownOption;
      }
      // Convert string or number to DropdownOption
      return {
        id: index,
        label: String(option),
        value: option,
      };
    });
  }, [options]);

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [singleSelected, setSingleSelected] = useState<DropdownOption | null>(null);
  const [multiSelected, setMultiSelected] = useState<DropdownOption[]>([]);
    // Sync internal state with value prop (controlled mode)
    useEffect(() => {
      if (value !== undefined) {
        if (isMultiSelect) {
          if (Array.isArray(value)) {
            const newSelected = normalizedOptions.filter(opt => value.includes(opt.value ?? opt.label));
            // Only update if different
            if (
              newSelected.length !== multiSelected.length ||
              newSelected.some((opt, i) => opt.id !== multiSelected[i]?.id)
            ) {
              setMultiSelected(newSelected);
            }
          } else if (value === null && multiSelected.length > 0) {
            setMultiSelected([]);
          }
        } else {
          if (value === null && singleSelected !== null) {
            setSingleSelected(null);
          } else if (value !== null) {
            const found = normalizedOptions.find(opt => (opt.value ?? opt.label) === value);
            if (
              (found && (!singleSelected || found.id !== singleSelected.id)) ||
              (!found && singleSelected !== null)
            ) {
              setSingleSelected(found || null);
            }
          }
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, normalizedOptions, isMultiSelect]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selected = isMultiSelect ? multiSelected : singleSelected;

  // Filter options based on search term
  const filteredOptions = normalizedOptions.filter((option) =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && isSearchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, isSearchable]);

  // Handle single select
  const handleSingleSelect = (option: DropdownOption) => {
    setSingleSelected(option);
    setIsOpen(false);
    setSearchTerm('');
  };

  // Handle multi select
  const handleMultiSelect = (option: DropdownOption) => {
    setMultiSelected((prev) => {
      const isSelected = prev.some((item) => item.id === option.id);
      return isSelected ? prev.filter((item) => item.id !== option.id) : [...prev, option];
    });
  };

  // Handle select all
  const handleSelectAll = () => {
    const newSelection = filteredOptions.length === multiSelected.length ? [] : filteredOptions;
    setMultiSelected(newSelection);
  };

  // Handle reset
  const handleReset = () => {
    if (isMultiSelect) {
      setMultiSelected([]);
    } else {
      setSingleSelected(null);
    }
    onSelectionChange?.(isMultiSelect ? [] : null);
    setSearchTerm('');
  };

  // Remove individual item from multi-select
  const handleRemoveTag = (id: string | number) => {
    setMultiSelected((prev) => prev.filter((item) => item.id !== id));
  };

  // Notify parent of selection changes (fixes React error)
  React.useEffect(() => {
    if (isMultiSelect) {
      onSelectionChange?.(multiSelected.map((item) => item.value ?? item.label));
    } else {
      onSelectionChange?.(singleSelected ? (singleSelected.value ?? singleSelected.label) : null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multiSelected, singleSelected]);

  // Get display text
  const getDisplayText = (): string => {
    if (isMultiSelect) {
      if (multiSelected.length === 0) return placeholder;
      if (multiSelected.length === 1) return multiSelected[0].label;
      return `${multiSelected.length} selected`;
    } else {
      return singleSelected?.label || placeholder;
    }
  };

  return (
    <div ref={dropdownRef} className="relative w-full">
      {/* Dropdown Button */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-left flex items-center justify-between transition-all ${
          disabled ? 'bg-gray-100 cursor-not-allowed opacity-50' : 'hover:border-gray-400'
        } ${isOpen ? 'border-blue-500 ring-2 ring-blue-200' : ''}`}
      >
        <div
          className={
            `flex-1 flex flex-wrap gap-1 items-center overflow-x-auto scrollbar-thin scrollbar-thumb-blue-200 scrollbar-track-blue-50` +
            (isMultiSelect && multiSelected.length > 0 ? ' max-h-[2.5rem] min-h-[2.5rem]' : '')
          }
          style={isMultiSelect && multiSelected.length > 0 ? { maxHeight: '2.5rem', minHeight: '2.5rem' } : undefined}
        >
          {isMultiSelect && multiSelected.length > 0 ? (
            multiSelected.map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm"
              >
                {item.label}
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Remove ${item.label}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveTag(item.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation();
                      handleRemoveTag(item.id);
                    }
                  }}
                  className="hover:bg-blue-200 rounded cursor-pointer p-0.5"
                  style={{ display: 'inline-flex' }}
                >
                  <X size={14} />
                </span>
              </span>
            ))
          ) : (
            <span className={singleSelected || multiSelected.length > 0 ? 'text-gray-900' : 'text-gray-500'}>
              {getDisplayText()}
            </span>
          )}
        </div>
        <ChevronDown
          size={20}
          className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
          {/* Search Input */}
          {isSearchable && (
            <div className="p-2 border-b border-gray-200">
              <div className="relative">
                <Search size={16} className="absolute left-2 top-2.5 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search options..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Select All / Reset Buttons (Multi-select) */}
          {isMultiSelect && (showSelectAll || showReset) && (
            <div className="flex gap-2 p-2 border-b border-gray-200">
              {showSelectAll && (
                <button
                  onClick={handleSelectAll}
                  className="flex-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                >
                  {filteredOptions.length === multiSelected.length && multiSelected.length > 0
                    ? 'Deselect All'
                    : 'Select All'}
                </button>
              )}
              {showReset && (
                <button
                  onClick={handleReset}
                  className="flex-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          )}

          {/* Options List */}
          <div className={`${maxHeight} overflow-y-auto`}>
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">No options found</div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = isMultiSelect
                  ? multiSelected.some((item) => item.id === option.id)
                  : singleSelected?.id === option.id;

                // Split label by newline to support multi-line display
                const labelLines = option.label.split('\n');
                const mainLabel = labelLines[0];
                const subLabel = labelLines.slice(1).join('\n');

                return (
                  <button
                    key={option.id}
                    onClick={() => (isMultiSelect ? handleMultiSelect(option) : handleSingleSelect(option))}
                    className={`w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-blue-50 transition-colors ${
                      isSelected ? 'bg-blue-100 text-blue-900' : 'text-gray-900'
                    }`}
                  >
                    {isMultiSelect && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        aria-label={`Select ${option.label}`}
                        className="w-4 h-4 rounded border-gray-300 cursor-pointer accent-blue-600"
                      />
                    )}
                    <div className="flex-1">
                      <div className="font-semibold">{mainLabel}</div>
                      {subLabel && <div className="text-xs text-gray-500 mt-0.5">{subLabel}</div>}
                    </div>
                    {!isMultiSelect && isSelected && <span className="text-blue-600 font-bold">✓</span>}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

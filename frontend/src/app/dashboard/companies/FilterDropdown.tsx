"use client";

import { useEffect, useRef, useState } from "react";
import { Filter } from "lucide-react";

export interface FilterDropdownProps {
  options: string[];
  onSelectionChange: (value: string | number | (string | number)[] | null) => void;
  hasActiveFilter: boolean;
}

function getOptionsKey(options: string[]) {
  return "dashboard_filterDropdown_" + btoa(options.join(","));
}

export default function FilterDropdown({ options, onSelectionChange, hasActiveFilter }: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const key = getOptionsKey(options);
      const stored = localStorage.getItem(key);
      if (stored) return JSON.parse(stored);
    }
    return [];
  });
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const key = getOptionsKey(options);
    localStorage.setItem(key, JSON.stringify(selectedItems));
  }, [selectedItems, options]);

  const filteredOptions = options.filter(option => option.toLowerCase().includes(searchTerm.toLowerCase()));

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleScroll() {
      setIsOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, []);

  const handleToggleItem = (item: string) => {
    const newSelected = selectedItems.includes(item)
      ? selectedItems.filter(i => i !== item)
      : [...selectedItems, item];

    setSelectedItems(newSelected);
    onSelectionChange(newSelected.length > 0 ? newSelected : null);
  };

  const handleSelectAll = () => {
    if (selectedItems.length === filteredOptions.length && filteredOptions.length > 0) {
      setSelectedItems([]);
      onSelectionChange(null);
    } else {
      setSelectedItems(filteredOptions);
      onSelectionChange(filteredOptions);
    }
  };

  const handleReset = () => {
    setSelectedItems([]);
    setSearchTerm("");
    onSelectionChange(null);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className={`p-1 rounded transition-colors ${hasActiveFilter ? "text-teal-600 hover:bg-gray-200" : "text-gray-500 hover:bg-gray-200"}`}
        title="Filter"
        type="button"
      >
        <Filter size={16} />
      </button>

      {isOpen && (
        <div
          className="fixed z-[100] mt-1 w-64 rounded-lg border border-gray-300 bg-white shadow-lg"
          style={{
            top: dropdownRef.current ? `${dropdownRef.current.getBoundingClientRect().bottom + 4}px` : "0",
            left: dropdownRef.current ? `${dropdownRef.current.getBoundingClientRect().left}px` : "0",
          }}
        >
          <div className="border-b border-gray-200 p-2">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={event => event.stopPropagation()}
            />
          </div>

          <div className="flex gap-2 border-b border-gray-200 p-2">
            <button
              onClick={handleSelectAll}
              className="flex-1 rounded bg-blue-50 px-3 py-1.5 text-xs text-blue-600 transition-colors hover:bg-blue-100"
              type="button"
            >
              {selectedItems.length === filteredOptions.length && filteredOptions.length > 0 ? "Deselect All" : "Select All"}
            </button>
            <button
              onClick={handleReset}
              className="flex-1 rounded bg-gray-100 px-3 py-1.5 text-xs text-gray-600 transition-colors hover:bg-gray-200"
              type="button"
            >
              Reset
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">No options found</div>
            ) : (
              filteredOptions.map(option => {
                const isSelected = selectedItems.includes(option);
                return (
                  <button
                    key={option}
                    onClick={() => handleToggleItem(option)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-blue-50 ${
                      isSelected ? "bg-blue-100 text-blue-900" : "text-gray-900"
                    }`}
                    type="button"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      aria-label={`Select ${option}`}
                      className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-blue-600"
                    />
                    <span className="flex-1">{option}</span>
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

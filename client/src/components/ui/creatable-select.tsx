import { useState, useRef, useEffect } from "react";

type Option = {
  value: string;
  label: string;
};

type CreatableSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  allowCreate?: boolean;
  onCreateOption?: (value: string) => void;
};

export function CreatableSelect({
  value,
  onChange,
  options,
  placeholder = "Select or type...",
  className = "",
  allowCreate = true,
  onCreateOption,
}: CreatableSelectProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if current value is a custom one (not in options)
  const isCustomValue = value && !options.some(opt => opt.value === value);

  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    if (selectedValue === "__create__") {
      setIsCreating(true);
      setCustomValue("");
    } else {
      setIsCreating(false);
      onChange(selectedValue);
    }
  };

  const handleCustomSubmit = () => {
    if (customValue.trim()) {
      onChange(customValue.trim());
      onCreateOption?.(customValue.trim());
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCustomSubmit();
    } else if (e.key === "Escape") {
      setIsCreating(false);
      setCustomValue("");
    }
  };

  if (isCreating) {
    return (
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (customValue.trim()) {
              handleCustomSubmit();
            } else {
              setIsCreating(false);
            }
          }}
          placeholder="Type custom value..."
          className={`flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
        />
        <button
          type="button"
          onClick={handleCustomSubmit}
          className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Add
        </button>
        <button
          type="button"
          onClick={() => {
            setIsCreating(false);
            setCustomValue("");
          }}
          className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <select
      value={isCustomValue ? "__custom__" : value}
      onChange={handleSelectChange}
      className={`px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 ${className}`}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
      {isCustomValue && (
        <option value="__custom__">{value} (custom)</option>
      )}
      {allowCreate && (
        <option value="__create__">+ Add new...</option>
      )}
    </select>
  );
}

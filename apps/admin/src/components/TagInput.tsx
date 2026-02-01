import {
  useState,
  useCallback,
  useRef,
  type KeyboardEvent,
  type ChangeEvent,
} from 'react';

export interface TagInputProps {
  /** Current tags */
  value: string[];
  /** Called when tags change */
  onChange: (tags: string[]) => void;
  /** Placeholder text for the input */
  placeholder?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Maximum number of tags allowed */
  maxTags?: number;
  /** Maximum length for each tag */
  maxTagLength?: number;
  /** Label for the input field */
  label?: string;
  /** ID for the input field */
  id?: string;
  /** Error message to display */
  error?: string;
}

/**
 * Normalize a tag string: trim whitespace, convert to lowercase, remove empty
 */
export function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase();
}

/**
 * TagInput component for managing a list of tags
 * - Creates tags on Enter or comma
 * - Displays tags as removable chips
 * - Supports keyboard navigation
 * - Prevents duplicates
 */
export function TagInput({
  value,
  onChange,
  placeholder = 'Add a tag...',
  disabled = false,
  maxTags,
  maxTagLength = 50,
  label,
  id = 'tag-input',
  error,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [focusedTagIndex, setFocusedTagIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const addTag = useCallback(
    (rawTag: string) => {
      const tag = normalizeTag(rawTag);

      // Validate tag
      if (!tag) return false;
      if (tag.length > maxTagLength) return false;
      if (value.includes(tag)) return false;
      if (maxTags && value.length >= maxTags) return false;

      onChange([...value, tag]);
      return true;
    },
    [value, onChange, maxTags, maxTagLength]
  );

  const removeTag = useCallback(
    (index: number) => {
      const newTags = value.filter((_, i) => i !== index);
      onChange(newTags);
      setFocusedTagIndex(null);
      inputRef.current?.focus();
    },
    [value, onChange]
  );

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // Check for comma to create tag
    if (newValue.includes(',')) {
      const parts = newValue.split(',');
      // Add all parts except the last one as tags
      parts.slice(0, -1).forEach((part) => addTag(part));
      // Keep the last part in the input
      setInputValue(parts[parts.length - 1]);
    } else {
      setInputValue(newValue);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const trimmedInput = inputValue.trim();

    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        if (trimmedInput) {
          if (addTag(trimmedInput)) {
            setInputValue('');
          }
        }
        break;

      case 'Backspace':
        if (!trimmedInput && value.length > 0) {
          // If input is empty and we have tags, focus the last tag
          if (focusedTagIndex === null) {
            setFocusedTagIndex(value.length - 1);
          } else {
            // Remove the focused tag
            removeTag(focusedTagIndex);
          }
        }
        break;

      case 'Escape':
        setFocusedTagIndex(null);
        setInputValue('');
        break;

      case 'ArrowLeft':
        if (!trimmedInput && value.length > 0) {
          e.preventDefault();
          if (focusedTagIndex === null) {
            setFocusedTagIndex(value.length - 1);
          } else if (focusedTagIndex > 0) {
            setFocusedTagIndex(focusedTagIndex - 1);
          }
        }
        break;

      case 'ArrowRight':
        if (focusedTagIndex !== null) {
          e.preventDefault();
          if (focusedTagIndex < value.length - 1) {
            setFocusedTagIndex(focusedTagIndex + 1);
          } else {
            setFocusedTagIndex(null);
            inputRef.current?.focus();
          }
        }
        break;

      case 'Delete':
        if (focusedTagIndex !== null) {
          removeTag(focusedTagIndex);
        }
        break;
    }
  };

  const handleTagKeyDown = (
    e: KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    switch (e.key) {
      case 'Backspace':
      case 'Delete':
        e.preventDefault();
        removeTag(index);
        break;

      case 'ArrowLeft':
        e.preventDefault();
        if (index > 0) {
          setFocusedTagIndex(index - 1);
        }
        break;

      case 'ArrowRight':
        e.preventDefault();
        if (index < value.length - 1) {
          setFocusedTagIndex(index + 1);
        } else {
          setFocusedTagIndex(null);
          inputRef.current?.focus();
        }
        break;

      case 'Escape':
        setFocusedTagIndex(null);
        inputRef.current?.focus();
        break;
    }
  };

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  const handleInputFocus = () => {
    setFocusedTagIndex(null);
  };

  const isMaxTagsReached = maxTags ? value.length >= maxTags : false;

  return (
    <div className="space-y-1">
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-text-primary"
        >
          {label}
        </label>
      )}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        ref={containerRef}
        onClick={handleContainerClick}
        className={`flex flex-wrap items-center gap-2 min-h-[42px] px-3 py-2 rounded-lg border ${
          error
            ? 'border-status-error focus-within:border-status-error focus-within:ring-status-error'
            : 'border-border focus-within:border-primary-500 focus-within:ring-primary-500'
        } bg-background-primary focus-within:outline-none focus-within:ring-1 ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'
        }`}
      >
        {value.map((tag, index) => (
          <span
            key={`${tag}-${index}`}
            className={`inline-flex items-center gap-1 px-2 py-1 text-sm rounded-md ${
              focusedTagIndex === index
                ? 'bg-primary text-white ring-2 ring-primary-300'
                : 'bg-background-tertiary text-text-primary'
            }`}
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(index);
              }}
              onKeyDown={(e) => handleTagKeyDown(e, index)}
              disabled={disabled}
              className={`flex-shrink-0 w-4 h-4 inline-flex items-center justify-center rounded-full hover:bg-black/10 focus:outline-none focus:ring-1 focus:ring-offset-1 ${
                focusedTagIndex === index
                  ? 'hover:bg-white/20 focus:ring-white'
                  : 'focus:ring-primary-500'
              }`}
              aria-label={`Remove ${tag} tag`}
            >
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          placeholder={value.length === 0 ? placeholder : ''}
          disabled={disabled || isMaxTagsReached}
          className="flex-1 min-w-[120px] bg-transparent border-0 p-0 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-0"
          aria-describedby={error ? `${id}-error` : undefined}
        />
      </div>
      {error && (
        <p id={`${id}-error`} className="text-sm text-status-error">
          {error}
        </p>
      )}
      {maxTags && (
        <p className="text-xs text-text-muted">
          {value.length}/{maxTags} tags
        </p>
      )}
    </div>
  );
}

import { useState, useRef, useCallback, type DragEvent } from 'react';

export interface ImageUploaderProps {
  /** Current image URL */
  value?: string | null;
  /** Called when image is uploaded */
  onUpload: (url: string) => void;
  /** Called when image is removed */
  onRemove?: () => void;
  /** Whether upload is in progress */
  isUploading?: boolean;
  /** Error message */
  error?: string | null;
  /** Upload handler function */
  uploadHandler: (file: File) => Promise<{ url: string; key: string }>;
}

export function ImageUploader({
  value,
  onUpload,
  onRemove,
  isUploading = false,
  error,
  uploadHandler,
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    const acceptedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ];
    const maxFileSize = 5 * 1024 * 1024; // 5MB

    if (!acceptedTypes.includes(file.type)) {
      return 'Please upload a JPEG, PNG, WebP, or GIF image';
    }
    if (file.size > maxFileSize) {
      return 'File size must be less than 5MB';
    }
    return null;
  }, []);

  const acceptedTypesStr = 'image/jpeg,image/png,image/webp,image/gif';

  const handleFile = useCallback(
    async (file: File) => {
      setUploadError(null);

      const validationError = validateFile(file);
      if (validationError) {
        setUploadError(validationError);
        return;
      }

      try {
        setUploading(true);
        const result = await uploadHandler(file);
        onUpload(result.url);
      } catch (err) {
        console.error('Upload failed:', err);
        setUploadError('Failed to upload image. Please try again.');
      } finally {
        setUploading(false);
      }
    },
    [uploadHandler, onUpload, validateFile]
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [handleFile]
  );

  const handleClick = () => {
    if (!uploading && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  const displayError = error || uploadError;
  const loading = uploading || isUploading;

  if (value) {
    return (
      <div className="relative group">
        <img
          src={value}
          alt="Product"
          className="w-full h-48 object-cover rounded-lg border border-border"
        />
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={handleClick}
            disabled={loading}
            className="px-3 py-1.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-600 transition-colors"
          >
            Replace
          </button>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              disabled={loading}
              className="px-3 py-1.5 text-sm font-medium text-white bg-status-error rounded-lg hover:bg-status-error/80 transition-colors"
            >
              Remove
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypesStr}
          onChange={handleFileSelect}
          className="hidden"
        />
        {displayError && (
          <p className="mt-2 text-sm text-status-error">{displayError}</p>
        )}
      </div>
    );
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          isDragging
            ? 'border-primary bg-primary-50'
            : displayError
              ? 'border-status-error bg-status-error/5'
              : 'border-border hover:border-primary-300 hover:bg-background-tertiary'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypesStr}
          onChange={handleFileSelect}
          className="hidden"
        />

        {loading ? (
          <div className="flex flex-col items-center">
            <svg
              className="animate-spin h-8 w-8 text-primary mb-3"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <p className="text-sm text-text-secondary">Uploading...</p>
          </div>
        ) : (
          <>
            <div className="flex justify-center mb-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className={`w-10 h-10 ${
                  isDragging ? 'text-primary' : 'text-text-muted'
                }`}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                />
              </svg>
            </div>
            <p className="text-sm text-text-primary font-medium mb-1">
              {isDragging
                ? 'Drop to upload'
                : 'Drop an image here or click to browse'}
            </p>
            <p className="text-xs text-text-muted">
              JPEG, PNG, WebP, or GIF up to 5MB
            </p>
          </>
        )}
      </div>

      {displayError && (
        <p className="mt-2 text-sm text-status-error">{displayError}</p>
      )}
    </div>
  );
}

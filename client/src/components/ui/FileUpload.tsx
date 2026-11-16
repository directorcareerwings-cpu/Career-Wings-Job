import React, { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { cn } from '@/lib/utils'
import { Upload, File, X, CheckCircle } from 'lucide-react'

interface FileUploadProps {
  accept?: Record<string, string[]>
  maxSize?: number // bytes
  onFileAccepted: (file: File) => void
  label?: string
  hint?: string
  currentFileName?: string
  currentFileUrl?: string
  onRemove?: () => void
  isUploading?: boolean
  error?: string
  className?: string
}

export function FileUpload({
  accept = {
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  },
  maxSize = 5 * 1024 * 1024, // 5MB
  onFileAccepted,
  label,
  hint,
  currentFileName,
  currentFileUrl,
  onRemove,
  isUploading = false,
  error,
  className,
}: FileUploadProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles[0]) {
        onFileAccepted(acceptedFiles[0])
      }
    },
    [onFileAccepted]
  )

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false,
  })

  const rejectionMessage = fileRejections[0]?.errors[0]?.message

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      )}

      {currentFileName ? (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-green-800 truncate">{currentFileName}</p>
            {currentFileUrl && (
              <a
                href={currentFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-green-600 hover:underline"
              >
                View current file
              </a>
            )}
          </div>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="p-1 hover:bg-green-100 rounded-lg transition-colors"
            >
              <X className="h-4 w-4 text-green-700" />
            </button>
          )}
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={cn(
            'flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all',
            isDragActive
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50',
            error && 'border-red-400 bg-red-50',
            isUploading && 'opacity-60 cursor-not-allowed'
          )}
        >
          <input {...getInputProps()} disabled={isUploading} />
          <div className="flex flex-col items-center gap-2 text-center">
            {isUploading ? (
              <>
                <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center animate-pulse">
                  <Upload className="h-5 w-5 text-primary-600" />
                </div>
                <p className="text-sm text-gray-600">Uploading...</p>
              </>
            ) : isDragActive ? (
              <>
                <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                  <Upload className="h-5 w-5 text-primary-600" />
                </div>
                <p className="text-sm font-medium text-primary-700">Drop file here</p>
              </>
            ) : (
              <>
                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <File className="h-5 w-5 text-gray-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Drag & drop file here, or{' '}
                    <span className="text-primary-600">browse</span>
                  </p>
                  {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {(error || rejectionMessage) && (
        <p className="mt-1.5 text-xs text-red-600">
          {error || rejectionMessage}
        </p>
      )}
    </div>
  )
}

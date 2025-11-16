import { CheckCircle, Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import PDFViewer from './PDFViewer'
import Report from './Report'

function PDFResultCard({ fileNumber, fileName, status, result, error }) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getStatusBadge = () => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
            <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
            Pending
          </span>
        )
      case 'processing':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </span>
        )
      case 'completed':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
            <CheckCircle className="w-4 h-4 mr-2" />
            Completed
          </span>
        )
      case 'error':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
            <AlertCircle className="w-4 h-4 mr-2" />
            Error
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden border-2 border-gray-200">
      {/* Header */}
      <div
        onClick={() => status === 'completed' && setIsExpanded(!isExpanded)}
        className={`p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 ${
          status === 'completed' ? 'cursor-pointer hover:from-gray-100 hover:to-gray-200' : ''
        } transition-colors`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            {/* Number Badge */}
            <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center text-lg font-bold">
              {fileNumber}
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {fileName}
              </h3>
              {result?.report && (
                <p className="text-sm text-gray-600">
                  {result.report.total_detections} detection{result.report.total_detections !== 1 ? 's' : ''} found
                </p>
              )}
            </div>
          </div>

          {/* Status & Expand */}
          <div className="flex items-center space-x-3">
            {getStatusBadge()}
            {status === 'completed' && (
              <button className="p-1 rounded-full hover:bg-gray-200 transition-colors">
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {status === 'error' && error && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">Processing Failed</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      {status === 'completed' && result?.report && !isExpanded && (
        <div className="p-4 bg-gray-50">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{result.report.total_pages}</p>
              <p className="text-xs text-gray-600">Pages</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{result.report.total_detections}</p>
              <p className="text-xs text-gray-600">Detections</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {result.report.total_pages > 0
                  ? (result.report.total_detections / result.report.total_pages).toFixed(1)
                  : '0'}
              </p>
              <p className="text-xs text-gray-600">Per Page</p>
            </div>
          </div>
        </div>
      )}

      {/* Expanded Content */}
      {isExpanded && status === 'completed' && result && (
        <div className="p-6 space-y-6 bg-gray-50">
          {/* Report */}
          <Report report={result.report} />

          {/* Preprocessing Visualization */}
          {result.preprocessing_viz_url && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl shadow-lg p-6 border-2 border-purple-300">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                <span className="text-2xl">✨</span>
                <span>Preprocessing Visualization</span>
              </h2>
              <PDFViewer
                title="Original vs Enhanced"
                pdfUrl={result.preprocessing_viz_url}
                icon="output"
              />
            </div>
          )}

          {/* PDF Viewers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PDFViewer
              title="Input PDF"
              pdfUrl={result.input_pdf_url}
              icon="input"
            />
            <PDFViewer
              title="Output PDF (with detections)"
              pdfUrl={result.output_pdf_url}
              icon="output"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default PDFResultCard

import { useState, useMemo } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, FileInput, FileCheck, ExternalLink, Loader2 } from 'lucide-react'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'

// Configure PDF.js worker - using CDN for reliability
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`

function PDFViewer({ title, pdfUrl, icon }) {
  const [numPages, setNumPages] = useState(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(0.25)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Memoize options to prevent unnecessary re-renders
  const options = useMemo(
    () => ({
      cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
    }),
    []
  )

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages)
    setPageNumber(1)
    setLoading(false)
    setError(null)
  }

  function onDocumentLoadError(error) {
    console.error('Error loading PDF:', error)
    setError(error.message || 'Failed to load PDF')
    setLoading(false)
  }

  const changePage = (offset) => {
    setPageNumber(prevPageNumber => prevPageNumber + offset)
  }

  const previousPage = () => {
    changePage(-1)
  }

  const nextPage = () => {
    changePage(1)
  }

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.1, 3.0))
  }

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.1, 0.25))
  }

  const setZoomLevel = (level) => {
    setScale(level)
  }

  const IconComponent = icon === 'input' ? FileInput : FileCheck

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <IconComponent className="w-5 h-5 text-white" />
            <h3 className="text-lg font-semibold text-white">{title}</h3>
          </div>
          <div className="flex items-center space-x-2">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 px-3 py-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg text-white text-sm font-medium transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open</span>
            </a>
            <a
              href={pdfUrl}
              download
              className="flex items-center space-x-1 px-3 py-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg text-white text-sm font-medium transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </a>
          </div>
        </div>
      </div>

      {/* PDF Display */}
      <div className="bg-gray-100 p-4">
        <div className="bg-white border-2 border-gray-300 rounded-lg overflow-auto" style={{ maxHeight: '600px' }}>
          {error ? (
            <div className="flex flex-col items-center justify-center h-96 text-center p-8">
              <div className="text-red-600 mb-4">
                <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-lg font-semibold mb-2">Failed to load PDF</p>
                <p className="text-sm text-gray-600 mb-4">{error}</p>
              </div>
              <div className="space-x-2">
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open in New Tab</span>
                </a>
                <a
                  href={pdfUrl}
                  download
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="flex justify-center p-4">
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                options={options}
                loading={
                  <div className="flex flex-col items-center justify-center h-96">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
                    <p className="text-gray-600">Loading PDF...</p>
                  </div>
                }
              >
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  loading={
                    <div className="flex items-center justify-center h-96">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                  }
                />
              </Document>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      {!error && numPages && (
        <div className="bg-gray-50 border-t border-gray-200 p-4">
          <div className="flex items-center justify-between">
            {/* Page Navigation */}
            <div className="flex items-center space-x-2">
              <button
                onClick={previousPage}
                disabled={pageNumber <= 1}
                className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm font-medium text-gray-700 px-3">
                Page {pageNumber} of {numPages}
              </span>
              <button
                onClick={nextPage}
                disabled={pageNumber >= numPages}
                className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={zoomOut}
                className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-100 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-5 h-5" />
              </button>

              {/* Preset zoom buttons */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setZoomLevel(0.5)}
                  className={`px-2 py-1 text-xs rounded ${scale === 0.5 ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 hover:bg-gray-100'} transition-colors`}
                >
                  50%
                </button>
                <button
                  onClick={() => setZoomLevel(0.75)}
                  className={`px-2 py-1 text-xs rounded ${scale === 0.75 ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 hover:bg-gray-100'} transition-colors`}
                >
                  75%
                </button>
                <button
                  onClick={() => setZoomLevel(1.0)}
                  className={`px-2 py-1 text-xs rounded ${scale === 1.0 ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 hover:bg-gray-100'} transition-colors`}
                >
                  100%
                </button>
                <button
                  onClick={() => setZoomLevel(1.5)}
                  className={`px-2 py-1 text-xs rounded ${scale === 1.5 ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 hover:bg-gray-100'} transition-colors`}
                >
                  150%
                </button>
              </div>

              <span className="text-sm font-medium text-gray-700 px-2 bg-gray-100 rounded">
                {Math.round(scale * 100)}%
              </span>

              <button
                onClick={zoomIn}
                className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-100 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PDFViewer

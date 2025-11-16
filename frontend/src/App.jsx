import { useState } from 'react'
import { Settings, FileText, Loader2, PlayCircle } from 'lucide-react'
import axios from 'axios'
import FileDropZone from './components/FileDropZone'
import PDFResultCard from './components/PDFResultCard'
import ThresholdControls from './components/ThresholdControls'
import PreprocessingControls from './components/PreprocessingControls'
import './App.css'

function App() {
  const [files, setFiles] = useState([])
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState({})
  const [thresholds, setThresholds] = useState({
    confidence: 0.20,
    iou: 0.30,
    maxDetections: 100
  })
  const [preprocessing, setPreprocessing] = useState({
    qrEnhancement: true  // По умолчанию включен
  })

  const processSinglePDF = async (file, index) => {
    console.log(`🚀 Processing file ${index + 1}/${files.length}: ${file.name}`)

    // Set status to processing
    setResults(prev => ({
      ...prev,
      [index]: { status: 'processing' }
    }))

    const formData = new FormData()
    formData.append('pdf_file', file)
    formData.append('confidence_threshold', thresholds.confidence)
    formData.append('iou_threshold', thresholds.iou)
    formData.append('max_detections', thresholds.maxDetections)
    // При включении qrEnhancement включаем оба параметра
    formData.append('use_clahe', false)
    formData.append('use_denoise', preprocessing.qrEnhancement)
    formData.append('use_threshold', preprocessing.qrEnhancement)

    try {
      const response = await axios.post('/api/process-pdf/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 300000, // 5 minutes timeout
      })

      console.log(`✅ File ${index + 1} completed`)
      setResults(prev => ({
        ...prev,
        [index]: {
          status: 'completed',
          result: response.data
        }
      }))
    } catch (err) {
      console.error(`❌ Error processing file ${index + 1}:`, err)
      setResults(prev => ({
        ...prev,
        [index]: {
          status: 'error',
          error: err.response?.data?.error || err.message || 'Processing failed'
        }
      }))
    }
  }

  const handleProcessAllPDFs = async () => {
    if (files.length === 0) {
      return
    }

    console.log(`🚀 Starting batch processing of ${files.length} files...`)
    setProcessing(true)

    // Initialize all files as pending
    const initialResults = {}
    files.forEach((_, index) => {
      initialResults[index] = { status: 'pending' }
    })
    setResults(initialResults)

    // Process files sequentially
    for (let i = 0; i < files.length; i++) {
      await processSinglePDF(files[i], i)
    }

    console.log('🏁 Batch processing finished')
    setProcessing(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-3 rounded-lg">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">PDF Object Detection</h1>
                <p className="text-sm text-gray-600">Detect signatures, stamps, and QR codes in PDF documents</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Upload Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Upload PDF Files</h2>

          <div className="space-y-6">
            {/* Drag & Drop Zone */}
            <FileDropZone files={files} setFiles={setFiles} />

            {/* Threshold Controls */}
            <ThresholdControls thresholds={thresholds} setThresholds={setThresholds} />

            {/* Preprocessing Controls */}
            <PreprocessingControls preprocessing={preprocessing} setPreprocessing={setPreprocessing} />

            {/* Process Button */}
            <button
              onClick={handleProcessAllPDFs}
              disabled={files.length === 0 || processing}
              className={`w-full py-4 px-6 rounded-lg font-semibold text-white text-lg transition-all duration-300 flex items-center justify-center space-x-2 ${
                files.length === 0 || processing
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
              }`}
            >
              {processing ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Processing {files.length} file{files.length !== 1 ? 's' : ''}...</span>
                </>
              ) : (
                <>
                  <PlayCircle className="w-6 h-6" />
                  <span>Process {files.length} PDF{files.length !== 1 ? 's' : ''}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Section */}
        {Object.keys(results).length > 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-800 flex items-center space-x-2">
              <FileText className="w-6 h-6 text-blue-600" />
              <span>Processing Results</span>
            </h2>

            {files.map((file, index) => (
              <PDFResultCard
                key={index}
                fileNumber={index + 1}
                fileName={file.name}
                status={results[index]?.status || 'pending'}
                result={results[index]?.result}
                error={results[index]?.error}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-gray-600 text-sm">
            Powered by YOLO Object Detection • Built with React & Django
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App

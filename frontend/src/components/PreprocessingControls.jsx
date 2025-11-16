import { Sparkles, Info } from 'lucide-react'
import { useState } from 'react'

function PreprocessingControls({ preprocessing, setPreprocessing }) {
  const [showInfo, setShowInfo] = useState(false)

  const handleToggle = (key) => {
    setPreprocessing(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  return (
    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-800">Image Enhancement</h3>
        </div>
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="p-1.5 rounded-full hover:bg-white hover:bg-opacity-50 transition-colors"
        >
          <Info className="w-4 h-4 text-purple-600" />
        </button>
      </div>

      {showInfo && (
        <div className="mb-4 p-4 bg-white bg-opacity-70 rounded-lg text-sm text-gray-700">
          <p className="font-semibold mb-2">Улучшения изображения для лучшего распознавания QR-кодов:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li><strong>Denoising:</strong> Убирает шумы от сканера, пятна и помехи</li>
            <li><strong>Thresholding:</strong> Бинаризация - помогает QR-кодам быть детектируемыми</li>
          </ul>
          <p className="text-xs text-gray-600 mt-2">
            При включении дополнительно детектирует QR-коды в правом нижнем углу (10% изображения)
          </p>
        </div>
      )}

    </div>
  )
}

export default PreprocessingControls

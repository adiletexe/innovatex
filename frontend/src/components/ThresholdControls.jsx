import { Sliders } from 'lucide-react'

function ThresholdControls({ thresholds, setThresholds }) {
  const handleChange = (key, value) => {
    setThresholds(prev => ({
      ...prev,
      [key]: parseFloat(value)
    }))
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
      <div className="flex items-center space-x-2 mb-4">
        <Sliders className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-800">Detection Parameters</h3>
      </div>

      <div className="space-y-4">
        {/* Confidence Threshold */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-gray-700">
              Confidence Threshold
            </label>
            <span className="text-sm font-semibold text-blue-600 bg-white px-3 py-1 rounded-full">
              {thresholds.confidence.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min="0.1"
            max="0.95"
            step="0.05"
            value={thresholds.confidence}
            onChange={(e) => handleChange('confidence', e.target.value)}
            className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <p className="text-xs text-gray-600 mt-1">
            Higher values reduce false positives but may miss some objects
          </p>
        </div>

        {/* IOU Threshold */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-gray-700">
              IOU Threshold
            </label>
            <span className="text-sm font-semibold text-blue-600 bg-white px-3 py-1 rounded-full">
              {thresholds.iou.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min="0.1"
            max="0.9"
            step="0.05"
            value={thresholds.iou}
            onChange={(e) => handleChange('iou', e.target.value)}
            className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <p className="text-xs text-gray-600 mt-1">
            Controls overlap threshold for duplicate detection removal
          </p>
        </div>

        {/* Max Detections */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-gray-700">
              Max Detections per Page
            </label>
            <span className="text-sm font-semibold text-blue-600 bg-white px-3 py-1 rounded-full">
              {thresholds.maxDetections}
            </span>
          </div>
          <input
            type="range"
            min="10"
            max="500"
            step="10"
            value={thresholds.maxDetections}
            onChange={(e) => handleChange('maxDetections', e.target.value)}
            className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <p className="text-xs text-gray-600 mt-1">
            Maximum number of objects to detect per page
          </p>
        </div>
      </div>
    </div>
  )
}

export default ThresholdControls

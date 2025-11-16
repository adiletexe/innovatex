import { BarChart3, FileText, Target, Settings2 } from 'lucide-react'

function Report({ report }) {
  const { total_pages, total_detections, detections_per_class, page_stats, model_classes, thresholds, preprocessing, quadrant_detection } = report

  // Color mapping for classes
  const classColors = {
    signature: 'bg-red-100 text-red-800 border-red-300',
    stamp: 'bg-green-100 text-green-800 border-green-300',
    qr_code: 'bg-blue-100 text-blue-800 border-blue-300',
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="flex items-center space-x-2 mb-6">
        <BarChart3 className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-semibold text-gray-800">Detection Report</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 mb-1">Total Pages</p>
              <p className="text-3xl font-bold text-blue-900">{total_pages}</p>
            </div>
            <FileText className="w-10 h-10 text-blue-500 opacity-50" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600 mb-1">Total Detections</p>
              <p className="text-3xl font-bold text-green-900">{total_detections}</p>
            </div>
            <Target className="w-10 h-10 text-green-500 opacity-50" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600 mb-1">Avg per Page</p>
              <p className="text-3xl font-bold text-purple-900">
                {total_pages > 0 ? (total_detections / total_pages).toFixed(1) : '0'}
              </p>
            </div>
            <Settings2 className="w-10 h-10 text-purple-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Detections by Class */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Detections by Type</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(detections_per_class).map(([className, count]) => {
            const colorClass = classColors[className] || 'bg-gray-100 text-gray-800 border-gray-300'
            const percentage = total_detections > 0 ? ((count / total_detections) * 100).toFixed(1) : 0

            return (
              <div key={className} className={`rounded-lg p-4 border-2 ${colorClass}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold uppercase tracking-wide">{className.replace('_', ' ')}</p>
                  <p className="text-2xl font-bold">{count}</p>
                </div>
                <div className="w-full bg-white bg-opacity-50 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-current opacity-60"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <p className="text-xs mt-1 font-medium">{percentage}% of total</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Page-by-Page Breakdown */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Page-by-Page Analysis</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Page
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Detections
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Types Found
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {page_stats.map((stat) => (
                <tr key={stat.page} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Page {stat.page}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {stat.detections}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {Object.keys(stat.classes).length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(stat.classes).map(([className, count]) => {
                          const colorClass = classColors[className] || 'bg-gray-100 text-gray-800 border-gray-300'
                          return (
                            <span
                              key={className}
                              className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${colorClass}`}
                            >
                              {className.replace('_', ' ')}: {count}
                            </span>
                          )
                        })}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">No detections</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Model Settings */}
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Detection Settings Used</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Confidence</p>
              <p className="font-semibold text-gray-900">{thresholds.confidence}</p>
            </div>
            <div>
              <p className="text-gray-600">IOU</p>
              <p className="font-semibold text-gray-900">{thresholds.iou}</p>
            </div>
            <div>
              <p className="text-gray-600">Max Detections</p>
              <p className="font-semibold text-gray-900">{thresholds.max_detections}</p>
            </div>
          </div>
        </div>

        {/* Preprocessing Info */}
        {preprocessing && preprocessing.enabled && (
          <div className="bg-purple-50 rounded-lg p-4 border-2 border-purple-300">
            <h4 className="text-sm font-semibold text-purple-900 mb-3 flex items-center space-x-2">
              <span>✨</span>
              <span>Image Preprocessing Applied</span>
            </h4>

            {/* Two-Pass Mode Info */}
            {preprocessing.two_pass_mode && (
              <div className="mb-3 p-3 bg-purple-100 rounded-lg border border-purple-400">
                <p className="text-sm font-semibold text-purple-900 mb-1 flex items-center space-x-1">
                  <span>🔄</span>
                  <span>Two-Pass Detection Mode Active</span>
                </p>
                <p className="text-xs text-purple-700">
                  Pass 1: Signatures & Stamps detected on original image (no preprocessing)<br />
                  Pass 2: QR codes detected on preprocessed image (with enhancements)
                </p>
              </div>
            )}

            <div className="space-y-2">
              {preprocessing.techniques && preprocessing.techniques.length > 0 ? (
                <ul className="text-sm text-purple-800 space-y-1">
                  {preprocessing.techniques.map((technique, idx) => (
                    <li key={idx} className="flex items-center space-x-2">
                      <span className="text-purple-600">•</span>
                      <span className="font-medium">{technique}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-purple-700">Preprocessing enabled (details not available)</p>
              )}
            </div>
          </div>
        )}

        {/* Quadrant Detection Info */}
        {quadrant_detection && (
          <div className="bg-orange-50 rounded-lg p-4 border-2 border-orange-300">
            <h4 className="text-sm font-semibold text-orange-900 mb-2 flex items-center space-x-2">
              <span>🔲</span>
              <span>Quadrant Detection Enabled</span>
            </h4>
            <p className="text-xs text-orange-700">
              Each page was split into 4 quadrants for more accurate detection of small QR codes.
              This mode is slower but provides better results for small objects.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Report

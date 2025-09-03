import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Trash2, RotateCcw, X } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Trash() {
  const workspaces = useQuery(api.workspaces.getWorkspaces)
  const deletedDocuments = useQuery(
    api.documents.getDeletedDocuments,
    workspaces && workspaces.length > 0 ? { workspaceId: workspaces[0]._id } : "skip"
  )
  
  const restoreDocument = useMutation(api.documents.restoreDocument)
  const permanentDeleteDocument = useMutation(api.documents.permanentDeleteDocument)

  const handleRestore = async (docId) => {
    try {
      await restoreDocument({ id: docId })
      toast.success('Document restored!')
    } catch (error) {
      toast.error('Failed to restore document')
    }
  }

  const handlePermanentDelete = async (docId) => {
    if (!window.confirm('Are you sure? This action cannot be undone.')) return
    
    try {
      await permanentDeleteDocument({ id: docId })
      toast.success('Document permanently deleted!')
    } catch (error) {
      toast.error('Failed to delete document')
    }
  }

  if (!deletedDocuments) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="h-full bg-notion overflow-auto">
      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4 flex items-center gap-3">
            <Trash2 className="w-8 h-8" />
            Trash
          </h1>
          <p className="text-gray-600">
            Items in trash are automatically deleted after 30 days.
          </p>
        </div>

        {deletedDocuments.length === 0 ? (
          <div className="text-center py-12">
            <Trash2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Trash is empty
            </h3>
            <p className="text-gray-600">
              Items you delete will appear here before being permanently removed.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {deletedDocuments.map(doc => (
              <div
                key={doc._id}
                className="bg-white rounded-lg border border-notion p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-xl">{doc.emoji || '📄'}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">
                      {doc.title}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Deleted {new Date(doc.deletedAt).toLocaleDateString()} at{' '}
                      {new Date(doc.deletedAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRestore(doc._id)}
                    className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Restore"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Restore
                  </button>
                  
                  <button
                    onClick={() => handlePermanentDelete(doc._id)}
                    className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete permanently"
                  >
                    <X className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
            
            <div className="pt-6 border-t border-notion">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  {deletedDocuments.length} item{deletedDocuments.length !== 1 ? 's' : ''} in trash
                </p>
                
                <button
                  onClick={() => {
                    if (!window.confirm('Are you sure you want to empty the trash? This action cannot be undone.')) return
                    
                    deletedDocuments.forEach(doc => {
                      permanentDeleteDocument({ id: doc._id })
                    })
                    
                    toast.success('Trash emptied!')
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                  Empty Trash
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Plus, File, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Home() {
  const workspaces = useQuery(api.workspaces.getWorkspaces)
  const createDocument = useMutation(api.documents.createDocument)
  const createWorkspace = useMutation(api.workspaces.createWorkspace)

  const handleCreateDocument = async () => {
    if (!workspaces || workspaces.length === 0) {
      toast.error('Please create a workspace first')
      return
    }
    
    try {
      const docId = await createDocument({
        title: 'Untitled',
        workspaceId: workspaces[0]._id,
        emoji: '📄'
      })
      toast.success('Document created!')
      // Navigate to the new document
      window.location.href = `/document/${docId}`
    } catch (error) {
      toast.error('Failed to create document')
    }
  }

  const handleCreateWorkspace = async () => {
    const name = prompt('Enter workspace name:')
    if (!name) return
    
    try {
      await createWorkspace({ name })
      toast.success('Workspace created!')
    } catch (error) {
      toast.error('Failed to create workspace')
    }
  }

  if (!workspaces) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="h-full bg-white">
      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Good morning! 👋
          </h1>
          <p className="text-lg text-gray-600">
            Welcome to your personal workspace. What would you like to work on today?
          </p>
        </div>

        {workspaces.length === 0 ? (
          <div className="text-center py-12">
            <div className="mb-6">
              <File className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No workspaces yet
              </h3>
              <p className="text-gray-600">
                Create your first workspace to get started with organizing your documents.
              </p>
            </div>
            <button
              onClick={handleCreateWorkspace}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create First Workspace
            </button>
          </div>
        ) : (
          <div className="grid gap-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900">Quick Actions</h2>
              <button
                onClick={handleCreateDocument}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Page
              </button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div
                onClick={handleCreateDocument}
                className="p-6 border-2 border-dashed border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
              >
                <Plus className="w-8 h-8 text-gray-400 mb-3" />
                <h3 className="font-medium text-gray-900 mb-1">Blank Page</h3>
                <p className="text-sm text-gray-600">Start with a blank canvas</p>
              </div>

              <div className="p-6 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                <File className="w-8 h-8 text-blue-600 mb-3" />
                <h3 className="font-medium text-gray-900 mb-1">Meeting Notes</h3>
                <p className="text-sm text-gray-600">Template for meeting notes</p>
              </div>

              <div className="p-6 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                <Clock className="w-8 h-8 text-green-600 mb-3" />
                <h3 className="font-medium text-gray-900 mb-1">Daily Journal</h3>
                <p className="text-sm text-gray-600">Template for daily journaling</p>
              </div>
            </div>

            <div className="mt-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Your Workspaces</h2>
              <div className="grid gap-4">
                {workspaces.map(workspace => (
                  <div
                    key={workspace._id}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <h3 className="font-medium text-gray-900 mb-2">{workspace.name}</h3>
                    <p className="text-sm text-gray-600">
                      Created {new Date(workspace.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
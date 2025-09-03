import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Plus, File, Clock, Folder, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="h-full bg-background">
      <div className="max-w-6xl mx-auto px-8 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Good morning! 👋
          </h1>
          <p className="text-lg text-muted-foreground">
            Welcome to your personal workspace. What would you like to work on today?
          </p>
        </div>

        {workspaces.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent className="pt-6">
              <div className="mb-6">
                <Folder className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <CardTitle className="text-xl mb-2">
                  No workspaces yet
                </CardTitle>
                <CardDescription className="text-base">
                  Create your first workspace to get started with organizing your documents.
                </CardDescription>
              </div>
              <Button
                onClick={handleCreateWorkspace}
                size="lg"
                className="mt-4"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Workspace
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-foreground">Quick Actions</h2>
              <Button
                onClick={handleCreateDocument}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Page
              </Button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card
                onClick={handleCreateDocument}
                className="border-2 border-dashed hover:border-primary hover:bg-primary/5 cursor-pointer transition-colors"
              >
                <CardContent className="p-6">
                  <Plus className="w-8 h-8 text-muted-foreground mb-3" />
                  <CardTitle className="text-base mb-1">Blank Page</CardTitle>
                  <CardDescription>Start with a blank canvas</CardDescription>
                </CardContent>
              </Card>

              <Card className="hover:bg-muted/50 cursor-pointer transition-colors">
                <CardContent className="p-6">
                  <File className="w-8 h-8 text-blue-600 mb-3" />
                  <CardTitle className="text-base mb-1">Meeting Notes</CardTitle>
                  <CardDescription>Template for meeting notes</CardDescription>
                  <Badge variant="secondary" className="mt-2 text-xs">Template</Badge>
                </CardContent>
              </Card>

              <Card className="hover:bg-muted/50 cursor-pointer transition-colors">
                <CardContent className="p-6">
                  <Clock className="w-8 h-8 text-green-600 mb-3" />
                  <CardTitle className="text-base mb-1">Daily Journal</CardTitle>
                  <CardDescription>Template for daily journaling</CardDescription>
                  <Badge variant="secondary" className="mt-2 text-xs">Template</Badge>
                </CardContent>
              </Card>
            </div>

            <div className="mt-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-foreground">Your Workspaces</h2>
                <Button
                  variant="outline"
                  onClick={handleCreateWorkspace}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  New Workspace
                </Button>
              </div>
              <div className="grid gap-4">
                {workspaces.map(workspace => (
                  <Card
                    key={workspace._id}
                    className="hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-md">
                            <Folder className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base mb-1">{workspace.name}</CardTitle>
                            <CardDescription>
                              Created {new Date(workspace.createdAt).toLocaleDateString()}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          <Zap className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
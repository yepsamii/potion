import { useState } from 'react'
import { useQuery, useAction } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Github, Lock, Unlock, ExternalLink, CheckCircle, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function GitHubSyncModal({ isOpen, onClose, document }) {
  const [selectedRepository, setSelectedRepository] = useState('')
  const [commitMessage, setCommitMessage] = useState('')
  const [customPath, setCustomPath] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Get user repository access (repositories with personal access tokens)
  const userRepositoryAccess = useQuery(api.github.getUserRepositoryAccess)
  const syncToRepository = useAction(api.github.syncDocumentToRepository)

  const handleSync = async () => {
    if (!selectedRepository || !document) return

    setIsLoading(true)
    try {
      const result = await syncToRepository({
        documentId: document._id,
        repositoryId: selectedRepository,
        commitMessage: commitMessage.trim() || undefined,
        filePath: customPath.trim() || undefined,
      })

      toast.success('Document synced to GitHub successfully!')
      
      // Show success details
      if (result.url) {
        toast.success(
          <div>
            <p>File synced: <strong>{result.filePath}</strong></p>
            <a 
              href={result.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm"
            >
              View on GitHub →
            </a>
          </div>,
          { duration: 5000 }
        )
      }
      
      onClose()
      
      // Reset form
      setSelectedRepository('')
      setCommitMessage('')
      setCustomPath('')
    } catch (error) {
      toast.error(`Sync failed: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const selectedAccess = userRepositoryAccess?.find(access => access.repositoryId === selectedRepository)
  const selectedRepo = selectedAccess?.repository

  // Generate default file path
  const defaultPath = document ? 
    `docs/${document.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-').toLowerCase()}.md` :
    'docs/document.md'

  const finalPath = customPath.trim() || defaultPath

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="w-5 h-5" />
            Sync to GitHub Repository
          </DialogTitle>
          <DialogDescription>
            Choose a repository and customize the sync settings for "{document?.title}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Repository Selection */}
          <div className="space-y-2">
            <Label htmlFor="repository">Select Repository</Label>
            {userRepositoryAccess && userRepositoryAccess.length > 0 ? (
              <Select value={selectedRepository} onValueChange={setSelectedRepository}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a repository..." />
                </SelectTrigger>
                <SelectContent>
                  {userRepositoryAccess
                    .filter(access => access.hasAccess && access.accessLevel !== "read")
                    .map((access) => (
                    <SelectItem key={access.repositoryId} value={access.repositoryId}>
                      <div className="flex items-center gap-2 w-full">
                        <span className="font-medium">{access.repository.owner}/{access.repository.repoName}</span>
                        <div className="flex items-center gap-1 ml-auto">
                          <Badge variant="outline" className="text-xs">{access.accessLevel}</Badge>
                          {access.hasAccess && (
                            <CheckCircle className="w-3 h-3 text-green-600" />
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="p-4 border border-amber-200 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">No repositories available for syncing</span>
                </div>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Go to Settings → GitHub Integration to add repositories and configure access tokens.
                </p>
              </div>
            )}
          </div>

          {/* Selected Repository Info */}
          {selectedRepo && (
            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="font-medium text-green-900 dark:text-green-100">
                  {selectedRepo.owner}/{selectedRepo.repoName}
                </span>
                <a
                  href={selectedRepo.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-600 hover:text-green-800"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  {selectedAccess?.accessLevel} access
                </Badge>
                {selectedAccess?.lastSyncedAt && (
                  <span className="text-xs text-green-600">
                    Last synced: {new Date(selectedAccess.lastSyncedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* File Path */}
          <div className="space-y-2">
            <Label htmlFor="filePath">File Path (optional)</Label>
            <Input
              id="filePath"
              placeholder={defaultPath}
              value={customPath}
              onChange={(e) => setCustomPath(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Will be saved as: <code className="bg-muted px-1 rounded">{finalPath}</code>
            </p>
          </div>

          {/* Commit Message */}
          <div className="space-y-2">
            <Label htmlFor="commitMessage">Commit Message (optional)</Label>
            <Textarea
              id="commitMessage"
              placeholder={`Update: ${document?.title || 'document'}`}
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              rows={3}
            />
          </div>

          {/* Preview */}
          {selectedRepository && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                Sync Preview
              </h4>
              <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <p><strong>Repository:</strong> {selectedRepo?.owner}/{selectedRepo?.repoName}</p>
                <p><strong>Branch:</strong> main</p>
                <p><strong>File:</strong> {finalPath}</p>
                <p><strong>Message:</strong> {commitMessage.trim() || `Update: ${document?.title}`}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSync}
            disabled={!selectedRepository || isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <Github className="w-4 h-4" />
                Sync to GitHub
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
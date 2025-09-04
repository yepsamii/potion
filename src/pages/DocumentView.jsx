import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import Editor from '../components/Editor'
import GitHubSyncModal from '../components/GitHubSyncModal'
import { 
  MoreHorizontal, Trash2, Share2, Star, 
  Github, Clock
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function DocumentView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [emoji, setEmoji] = useState('')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showGitHubSync, setShowGitHubSync] = useState(false)

  const document = useQuery(api.documents.getDocument, { id })
  const updateDocument = useMutation(api.documents.updateDocument)
  const deleteDocument = useMutation(api.documents.deleteDocument)
  
  // GitHub integration
  const githubProfile = useQuery(api.github.getGitHubProfile)
  const userRepositoryAccess = useQuery(api.github.getUserRepositoryAccess)

  useEffect(() => {
    if (document) {
      setTitle(document.title)
      setEmoji(document.emoji || '📄')
    }
  }, [document])

  const handleTitleChange = useCallback(async (newTitle) => {
    if (!newTitle.trim() || newTitle === document?.title) return
    
    try {
      await updateDocument({ 
        id, 
        title: newTitle.trim() 
      })
      toast.success('Title updated!')
    } catch (error) {
      toast.error('Failed to update title')
      setTitle(document?.title || '')
    }
  }, [id, updateDocument, document?.title])

  const handleContentChange = useCallback(async (content) => {
    if (!content || !document) return

    try {
      await updateDocument({ 
        id, 
        content 
      })
    } catch (error) {
      console.error('Failed to save content:', error)
    }
  }, [id, updateDocument, document])

  const handleEmojiChange = useCallback(async (newEmoji) => {
    try {
      await updateDocument({ 
        id, 
        emoji: newEmoji 
      })
      setEmoji(newEmoji)
      setShowEmojiPicker(false)
      toast.success('Icon updated!')
    } catch (error) {
      toast.error('Failed to update icon')
    }
  }, [id, updateDocument])

  const handleDelete = async () => {
    try {
      await deleteDocument({ id })
      toast.success('Document moved to trash!')
      navigate('/')
    } catch (error) {
      toast.error('Failed to delete document')
    }
  }

  const handleShare = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
    toast.success('Link copied to clipboard!')
  }

  if (!document) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  const emojis = ['📄', '📝', '📋', '📊', '📈', '📅', '💡', '🔥', '⭐', '❤️', '🎯', '🚀', '💼', '🏠', '🎨', '🎵']

  return (
    <div className="h-full bg-background">
      {/* Header */}
      <div className="border-b border-border px-8 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* Emoji Picker */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="text-2xl h-auto p-1"
              >
                {emoji}
              </Button>
              
              {showEmojiPicker && (
                <div className="absolute top-full left-0 mt-2 bg-background border border-border shadow-lg rounded-lg p-3 z-10">
                  <div className="grid grid-cols-4 gap-2">
                    {emojis.map(e => (
                      <Button
                        key={e}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEmojiChange(e)}
                        className="text-2xl h-auto p-2"
                      >
                        {e}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Title */}
            {isEditingTitle ? (
              <Input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => {
                  setIsEditingTitle(false)
                  handleTitleChange(title)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setIsEditingTitle(false)
                    handleTitleChange(title)
                  }
                  if (e.key === 'Escape') {
                    setIsEditingTitle(false)
                    setTitle(document.title)
                  }
                }}
                className="text-2xl font-bold bg-transparent border-0 shadow-none p-0 h-auto flex-1 min-w-0 focus-visible:ring-0"
                autoFocus
              />
            ) : (
              <h1
                onClick={() => setIsEditingTitle(true)}
                className="text-2xl font-bold cursor-pointer hover:bg-muted px-2 py-1 rounded flex-1 min-w-0 truncate"
              >
                {title}
              </h1>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="h-8 w-8"
            >
              <Share2 className="w-4 h-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
            >
              <Star className="w-4 h-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowGitHubSync(true)}
              disabled={!githubProfile || !userRepositoryAccess?.length}
              title={
                !githubProfile 
                  ? 'Connect GitHub in Settings first'
                  : !userRepositoryAccess?.length
                  ? 'Add repository access tokens in Settings first'
                  : 'Sync to GitHub repository'
              }
            >
              <Github className="w-4 h-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
            >
              <Clock className="w-4 h-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Star className="mr-2 h-4 w-4" />
                  Add to favorites
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setShowGitHubSync(true)}
                  disabled={!githubProfile || !userRepositoryAccess?.length}
                >
                  <Github className="mr-2 h-4 w-4" />
                  Sync to GitHub
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Clock className="mr-2 h-4 w-4" />
                  Version history
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDeleteDialog(true)}
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Document Info */}
      <div className="px-8 py-2 border-b border-border">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Created by</span>
              {document.author ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Avatar className="h-5 w-5 cursor-pointer">
                        <AvatarImage src={document.author.image} alt={document.author.name} />
                        <AvatarFallback className="text-xs">
                          {document.author.name?.charAt(0)?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{document.author.name}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <span className="font-medium">Unknown</span>
              )}
              <span>on {new Date(document.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Last edited by</span>
              {document.lastEditor || document.author ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Avatar className="h-5 w-5 cursor-pointer">
                        <AvatarImage 
                          src={(document.lastEditor || document.author)?.image} 
                          alt={(document.lastEditor || document.author)?.name} 
                        />
                        <AvatarFallback className="text-xs">
                          {(document.lastEditor || document.author)?.name?.charAt(0)?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{(document.lastEditor || document.author)?.name}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <span className="font-medium">Unknown</span>
              )}
              <span>on {new Date(document.updatedAt).toLocaleString()}</span>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            Shared
          </Badge>
        </div>
      </div>

      {/* Editor */}
      <div className="editor-container">
        <Editor
          content={document.content}
          onChange={handleContentChange}
          placeholder="Start writing..."
        />
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? It will be moved to the trash where you can restore it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* GitHub Sync Modal */}
      <GitHubSyncModal
        isOpen={showGitHubSync}
        onClose={() => setShowGitHubSync(false)}
        document={document}
      />
    </div>
  )
}
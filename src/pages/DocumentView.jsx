import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import Editor from '../components/Editor'
import { 
  FiMoreHorizontal, FiTrash2, FiShare2, FiStar, 
  FiImage, FiSmile, FiGithub, FiClock 
} from 'react-icons/fi'
import toast from 'react-hot-toast'

export default function DocumentView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [emoji, setEmoji] = useState('')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const document = useQuery(api.documents.getDocument, { id })
  const updateDocument = useMutation(api.documents.updateDocument)
  const deleteDocument = useMutation(api.documents.deleteDocument)

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
    if (!window.confirm('Are you sure you want to delete this document?')) return
    
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
    <div className="h-full bg-white">
      {/* Header */}
      <div className="border-b border-notion px-8 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* Emoji Picker */}
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="text-2xl hover:bg-notion-gray-100 p-1 rounded transition-colors"
              >
                {emoji}
              </button>
              
              {showEmojiPicker && (
                <div className="absolute top-full left-0 mt-2 bg-white border border-notion shadow-lg rounded-lg p-3 z-10">
                  <div className="grid grid-cols-4 gap-2">
                    {emojis.map(e => (
                      <button
                        key={e}
                        onClick={() => handleEmojiChange(e)}
                        className="text-2xl p-2 hover:bg-notion-gray-100 rounded transition-colors"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Title */}
            {isEditingTitle ? (
              <input
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
                className="text-2xl font-bold bg-transparent border-0 outline-none flex-1 min-w-0"
                autoFocus
              />
            ) : (
              <h1
                onClick={() => setIsEditingTitle(true)}
                className="text-2xl font-bold cursor-pointer hover:bg-notion-gray-100 px-2 py-1 rounded flex-1 min-w-0 truncate"
              >
                {title}
              </h1>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-2 hover:bg-notion-gray-100 rounded transition-colors"
              title="Share"
            >
              <FiShare2 className="w-4 h-4" />
            </button>
            
            <button
              className="p-2 hover:bg-notion-gray-100 rounded transition-colors"
              title="Add to favorites"
            >
              <FiStar className="w-4 h-4" />
            </button>
            
            <button
              className="p-2 hover:bg-notion-gray-100 rounded transition-colors"
              title="Sync to GitHub"
            >
              <FiGithub className="w-4 h-4" />
            </button>
            
            <button
              className="p-2 hover:bg-notion-gray-100 rounded transition-colors"
              title="Version history"
            >
              <FiClock className="w-4 h-4" />
            </button>

            <div className="relative">
              <button
                className="p-2 hover:bg-notion-gray-100 rounded transition-colors"
                title="More options"
              >
                <FiMoreHorizontal className="w-4 h-4" />
              </button>
            </div>
            
            <button
              onClick={handleDelete}
              className="p-2 hover:bg-red-100 text-red-600 rounded transition-colors"
              title="Delete"
            >
              <FiTrash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Document Info */}
      <div className="px-8 py-2 border-b border-notion text-sm text-gray-500">
        <div className="max-w-4xl mx-auto">
          Last edited {new Date(document.updatedAt).toLocaleString()}
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
    </div>
  )
}
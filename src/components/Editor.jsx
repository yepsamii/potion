import { useCallback, useEffect, useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import toast from 'react-hot-toast'
import { 
  BlockNoteView, 
  useCreateBlockNote
} from '@blocknote/react'
import {
  BlockNoteSchema,
  defaultBlockSpecs,
  insertOrUpdateBlock
} from '@blocknote/core'
import '@blocknote/core/fonts/inter.css'
import '@blocknote/react/style.css'
import '@blocknote/mantine/style.css'

export default function Editor({ 
  content, 
  onChange, 
  editable = true,
  showLineNumbers = false
}) {
  const [mounted, setMounted] = useState(false)
  const [theme, setTheme] = useState('light')
  const [currentLine, setCurrentLine] = useState(1)
  const [totalLines, setTotalLines] = useState(1)
  const storeFile = useMutation(api.files.storeFile)

  // Create custom schema with all available blocks
  const schema = BlockNoteSchema.create({
    blockSpecs: {
      ...defaultBlockSpecs,
      // Add any additional custom blocks here if needed
    },
  })

  const editor = useCreateBlockNote({
    schema,
    initialContent: content && Array.isArray(content) ? content : undefined,
    uploadFile: async (file) => {
      try {
        // Generate upload URL
        const postUrl = await fetch('/api/upload', {
          method: 'POST'
        }).then(r => r.json())
        
        // Upload to Convex storage
        const result = await fetch(postUrl.uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': file.type },
          body: file
        })
        
        const { storageId } = await result.json()
        
        // Store file metadata
        await storeFile({
          name: file.name,
          type: file.type,
          size: file.size,
          storageId
        })
        
        // Return the storage URL
        const fileUrl = `/api/files/${storageId}`
        return fileUrl
      } catch (error) {
        console.error('File upload failed:', error)
        // Fallback to base64 for now
        const base64 = await fileToBase64(file)
        return `data:${file.type};base64,${base64}`
      }
    },
    // Enable all formatting options
    _tiptapOptions: {
      extensions: [
        // Additional Tiptap extensions can be added here
      ],
    },
    // Custom slash menu items
    slashMenuItems: [
      {
        name: "Heading 1",
        execute: (editor) => {
          insertOrUpdateBlock(editor, {
            type: "heading",
            props: { level: 1 },
          })
        },
        aliases: ["h1", "heading1"],
        group: "Headings",
        icon: "📰",
        hint: "Large heading"
      },
      {
        name: "Heading 2",
        execute: (editor) => {
          insertOrUpdateBlock(editor, {
            type: "heading",
            props: { level: 2 },
          })
        },
        aliases: ["h2", "heading2"],
        group: "Headings",
        icon: "📄",
        hint: "Medium heading"
      },
      {
        name: "Heading 3",
        execute: (editor) => {
          insertOrUpdateBlock(editor, {
            type: "heading",
            props: { level: 3 },
          })
        },
        aliases: ["h3", "heading3"],
        group: "Headings",
        icon: "📝",
        hint: "Small heading"
      },
      {
        name: "Numbered List",
        execute: (editor) => {
          insertOrUpdateBlock(editor, {
            type: "numberedListItem",
          })
        },
        aliases: ["ol", "list", "numbered"],
        group: "Lists",
        icon: "🔢",
        hint: "Create a numbered list"
      },
      {
        name: "Bullet List",
        execute: (editor) => {
          insertOrUpdateBlock(editor, {
            type: "bulletListItem",
          })
        },
        aliases: ["ul", "list", "bullet"],
        group: "Lists",
        icon: "•",
        hint: "Create a bullet list"
      },
      {
        name: "Check List",
        execute: (editor) => {
          insertOrUpdateBlock(editor, {
            type: "checkListItem",
          })
        },
        aliases: ["todo", "task", "check"],
        group: "Lists",
        icon: "✅",
        hint: "Create a task list"
      },
      {
        name: "Quote",
        execute: (editor) => {
          insertOrUpdateBlock(editor, {
            type: "paragraph",
            content: ">"
          })
        },
        aliases: ["blockquote", "quote"],
        group: "Advanced",
        icon: "💬",
        hint: "Create a quote block"
      },
      {
        name: "Code Block",
        execute: (editor) => {
          insertOrUpdateBlock(editor, {
            type: "codeBlock",
          })
        },
        aliases: ["code", "codeblock"],
        group: "Advanced",
        icon: "💻",
        hint: "Create a code block"
      },
      {
        name: "Table",
        execute: (editor) => {
          insertOrUpdateBlock(editor, {
            type: "table",
          })
        },
        aliases: ["table"],
        group: "Advanced",
        icon: "📊",
        hint: "Create a table"
      },
      {
        name: "Image",
        execute: (editor) => {
          insertOrUpdateBlock(editor, {
            type: "image",
          })
        },
        aliases: ["img", "image", "photo"],
        group: "Media",
        icon: "🖼️",
        hint: "Insert an image"
      },
      {
        name: "Video",
        execute: (editor) => {
          insertOrUpdateBlock(editor, {
            type: "video",
          })
        },
        aliases: ["video", "vid"],
        group: "Media",
        icon: "🎥",
        hint: "Insert a video"
      },
      {
        name: "Audio",
        execute: (editor) => {
          insertOrUpdateBlock(editor, {
            type: "audio",
          })
        },
        aliases: ["audio", "sound"],
        group: "Media",
        icon: "🎵",
        hint: "Insert audio"
      },
      {
        name: "File",
        execute: (editor) => {
          insertOrUpdateBlock(editor, {
            type: "file",
          })
        },
        aliases: ["file", "attachment"],
        group: "Media",
        icon: "📎",
        hint: "Insert a file"
      },
    ]
  })

  // Function to jump to a specific line (block)
  const jumpToLine = useCallback((lineNumber) => {
    if (editor && mounted) {
      try {
        const blocks = editor.document
        const targetBlock = blocks[lineNumber - 1]
        
        if (targetBlock) {
          // Focus the target block
          editor.focus()
          editor.setTextCursorPosition(targetBlock, 'start')
          toast.success(`Jumped to line ${lineNumber}`)
        }
      } catch (error) {
        console.error('Error jumping to line:', error)
        toast.error('Could not jump to line')
      }
    }
  }, [editor, mounted])

  useEffect(() => {
    setMounted(true)
    
    // Set initial theme
    const isDark = document.documentElement.classList.contains('dark')
    setTheme(isDark ? 'dark' : 'light')
    
    // Watch for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const isDark = document.documentElement.classList.contains('dark')
          setTheme(isDark ? 'dark' : 'light')
        }
      })
    })
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })
    
    return () => observer.disconnect()
  }, [])

  // Enhanced line tracking with cursor position updates
  useEffect(() => {
    if (editor && showLineNumbers && mounted) {
      const updateLinePosition = () => {
        try {
          const blocks = editor.document
          setTotalLines(blocks.length)
          
          // Get current block based on selection
          const currentBlock = editor.getTextCursorPosition().block
          
          if (currentBlock) {
            const blockIndex = blocks.findIndex(block => block.id === currentBlock.id)
            if (blockIndex >= 0) {
              setCurrentLine(blockIndex + 1)
            }
          }
        } catch (error) {
          console.error('Error updating line position:', error)
        }
      }

      // Update on selection change
      const handleSelectionChange = () => {
        setTimeout(updateLinePosition, 10) // Small delay to ensure selection is updated
      }

      // Keyboard shortcut for go-to-line (Ctrl+G)
      const handleKeyDown = (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'g') {
          event.preventDefault()
          const line = prompt(`Go to line (1-${totalLines}):`)
          if (line && !isNaN(line) && line >= 1 && line <= totalLines) {
            jumpToLine(parseInt(line))
          }
        }
      }

      // Listen to cursor/selection changes
      editor._tiptapEditor.on('selectionUpdate', handleSelectionChange)
      editor._tiptapEditor.on('transaction', handleSelectionChange)
      
      // Add keyboard shortcut
      document.addEventListener('keydown', handleKeyDown)
      
      // Initial update
      updateLinePosition()
      
      return () => {
        if (editor._tiptapEditor) {
          editor._tiptapEditor.off('selectionUpdate', handleSelectionChange)
          editor._tiptapEditor.off('transaction', handleSelectionChange)
        }
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [editor, showLineNumbers, mounted, totalLines, jumpToLine])

  const handleChange = useCallback(async () => {
    if (onChange && editor && mounted) {
      try {
        // Get the current blocks from the editor
        const blocks = editor.document
        onChange(blocks)
        
        // Update total lines count for line numbers
        if (showLineNumbers) {
          setTotalLines(blocks.length)
        }
      } catch (error) {
        console.error('Error handling editor change:', error)
      }
    }
  }, [editor, onChange, mounted, showLineNumbers])

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result.split(',')[1])
      reader.onerror = error => reject(error)
    })
  }

  if (!mounted || !editor) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="block-editor-container h-full">
      <div className="max-w-4xl mx-auto px-8 py-8">
        <div className="relative">
          {/* Line Numbers Sidebar */}
          {showLineNumbers && (
            <div className="absolute left-0 top-0 bottom-0 w-12 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col items-center py-4 text-xs text-gray-500 dark:text-gray-400 font-mono z-10">
              <div className="flex-1 flex flex-col justify-start gap-2">
                {Array.from({ length: Math.max(totalLines, 1) }, (_, i) => (
                  <div
                    key={i + 1}
                    onClick={() => jumpToLine(i + 1)}
                    className={`w-8 h-6 flex items-center justify-center rounded cursor-pointer transition-all duration-200 ${
                      i + 1 === currentLine
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold ring-1 ring-blue-300 dark:ring-blue-600 shadow-sm'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                    title={`Jump to line ${i + 1}`}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
              
              {/* Current line indicator */}
              <div className="mt-2 pt-2 border-t border-gray-300 dark:border-gray-600 text-center">
                <div className="text-xs text-gray-600 dark:text-gray-300 font-semibold">
                  {currentLine}/{totalLines}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Line
                </div>
              </div>
            </div>
          )}
          
          <div className={`transition-all duration-200 ${showLineNumbers ? 'ml-12' : ''}`}>
            <BlockNoteView
              editor={editor}
              editable={editable}
              onChange={handleChange}
              theme={theme}
              className="block-editor min-h-[500px]"
              formattingToolbar={true}
              slashMenu={true}
              sideMenu={true}
              filePanel={true}
              linkToolbar={true}
              tableHandles={true}
            />
          </div>
          
          {/* Additional UI elements can be added here */}
          <div className="mt-4 text-xs text-muted-foreground text-center">
            💡 Pro tip: Type &quot;/&quot; for slash commands, use toolbar for formatting, and drag blocks to reorder
            {showLineNumbers && (
              <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md">
                📍 Line numbers enabled - click to jump to line, or press Ctrl+G
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
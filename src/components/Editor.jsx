import { useCallback, useEffect, useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
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
  editable = true
}) {
  const [mounted, setMounted] = useState(false)
  const [theme, setTheme] = useState('light')
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

  const handleChange = useCallback(async () => {
    if (onChange && editor && mounted) {
      try {
        // Get the current blocks from the editor
        const blocks = editor.document
        onChange(blocks)
      } catch (error) {
        console.error('Error handling editor change:', error)
      }
    }
  }, [editor, onChange, mounted])

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
          
          {/* Additional UI elements can be added here */}
          <div className="mt-4 text-xs text-muted-foreground text-center">
            💡 Pro tip: Type &quot;/&quot; for slash commands, use toolbar for formatting, and drag blocks to reorder
          </div>
        </div>
      </div>
    </div>
  )
}
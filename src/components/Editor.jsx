import { useCallback, useEffect, useState } from 'react'
import { BlockNoteView, useCreateBlockNote } from '@blocknote/react'
import '@blocknote/core/fonts/inter.css'
import '@blocknote/react/style.css'

export default function Editor({ 
  content, 
  onChange, 
  editable = true,
  placeholder = "Start writing..."
}) {
  const [mounted, setMounted] = useState(false)

  const editor = useCreateBlockNote({
    initialContent: content && Array.isArray(content) ? content : undefined,
    uploadFile: async (file) => {
      // TODO: Implement file upload to Convex storage
      return `data:${file.type};base64,${await fileToBase64(file)}`
    },
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleChange = useCallback(async () => {
    if (onChange && editor && mounted) {
      try {
        // Get the current blocks from the editor
        const blocks = editor.topLevelBlocks
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="block-editor-container h-full">
      <div className="max-w-4xl mx-auto px-8 py-8">
        <BlockNoteView
          editor={editor}
          editable={editable}
          onChange={handleChange}
          theme="light"
          className="block-editor min-h-[500px]"
        />
      </div>
    </div>
  )
}
import { useCallback, useEffect, useState } from 'react'
import { BlockNoteView, useCreateBlockNote } from '@blocknote/react'
import '@blocknote/core/fonts/inter.css'
import '@blocknote/react/style.css'

export default function Editor({ 
  content, 
  onChange, 
  editable = true
}) {
  const [initialContent, setInitialContent] = useState(null)

  const editor = useCreateBlockNote({
    initialContent: initialContent || undefined,
    uploadFile: async (file) => {
      // TODO: Implement file upload to Convex storage
      return `data:${file.type};base64,${await fileToBase64(file)}`
    },
  })

  useEffect(() => {
    if (content && content !== initialContent) {
      setInitialContent(content)
      if (editor && Array.isArray(content)) {
        editor.replaceBlocks(editor.document, content)
      }
    }
  }, [content, initialContent, editor])

  const handleChange = useCallback(() => {
    if (onChange && editor) {
      const blocks = editor.document
      onChange(blocks)
    }
  }, [editor, onChange])

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result.split(',')[1])
      reader.onerror = error => reject(error)
    })
  }

  return (
    <div className="block-editor-container">
      <BlockNoteView
        editor={editor}
        editable={editable}
        onChange={handleChange}
        theme="light"
        className="block-editor"
      />
    </div>
  )
}
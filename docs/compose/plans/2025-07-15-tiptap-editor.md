# Tiptap Rich Text Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Tiptap rich text editor to post creation/editing and comment forms, with HTML rendering on detail pages.

**Architecture:** Create a reusable `RichTextEditor` component with toolbar, integrate into PostFormPage and FormComentario, render HTML in PostDetailPage and ListaComentarios.

**Tech Stack:** Tiptap, React, Next.js, Tailwind CSS

---

## File Structure

```
src/
├── components/
│   └── rich-text/
│       ├── RichTextEditor.tsx    # Main editor component
│       ├── MenuBar.tsx           # Toolbar with formatting buttons
│       └── extensions.ts         # Tiptap extension config
├── lib/
│   └── html.ts                   # HTML strip utility
├── modules/
│   └── posts/
│       ├── pages/
│       │   ├── PostFormPage.tsx  # Modified: use RichTextEditor
│       │   └── PostDetailPage.tsx # Modified: render HTML
│       └── components/
│           ├── FormComentario.tsx # Modified: use RichTextEditor
│           └── ListaComentarios.tsx # Modified: render HTML
```

---

### Task 1: Install Tiptap Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install Tiptap core and extensions**

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/pm @tiptap/extension-link @tiptap/extension-image @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-cell @tiptap/extension-table-header @tiptap/extension-task-list @tiptap/extension-task-item @tiptap/extension-placeholder @tiptap/extension-underline @tiptap/extension-text-align @tiptap/extension-color @tiptap/extension-text-style
```

- [ ] **Step 2: Verify installation**

```bash
npm ls @tiptap/react
```

Expected: package listed without errors

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install tiptap dependencies"
```

---

### Task 2: Create Extensions Config

**Files:**
- Create: `src/components/rich-text/extensions.ts`

- [ ] **Step 1: Create extensions configuration**

```typescript
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'

export const defaultExtensions = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
  }),
  Link.configure({
    openOnClick: false,
    HTMLAttributes: { class: 'text-blue-500 hover:underline cursor-pointer' },
  }),
  Image.configure({
    HTMLAttributes: { class: 'max-w-full h-auto rounded-lg my-2' },
  }),
  Table.configure({ resizable: true }),
  TableRow,
  TableCell,
  TableHeader,
  TaskList,
  TaskItem.configure({ nested: true }),
  Placeholder.configure({
    placeholder: 'Escreva algo...',
  }),
  Underline,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  TextStyle,
  Color,
]
```

- [ ] **Step 2: Commit**

```bash
git add src/components/rich-text/extensions.ts
git commit -m "feat: add tiptap extensions config"
```

---

### Task 3: Create MenuBar Component

**Files:**
- Create: `src/components/rich-text/MenuBar.tsx`

- [ ] **Step 1: Create MenuBar component**

```tsx
'use client'

import { type Editor } from '@tiptap/react'

interface Props {
  editor: Editor | null
}

function MenuButton({
  onClick,
  isActive = false,
  disabled = false,
  children,
}: {
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="p-1.5 rounded transition-colors text-sm"
      style={{
        backgroundColor: isActive ? 'var(--btn-primary-bg)' : 'transparent',
        color: isActive ? 'var(--btn-primary-text)' : 'var(--text-secondary)',
      }}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="w-px h-6 mx-1" style={{ backgroundColor: 'var(--border-color)' }} />
}

export default function MenuBar({ editor }: Props) {
  if (!editor) return null

  const addImage = () => {
    const url = prompt('URL da imagem:')
    if (url) editor.chain().focus().setImage({ src: url }).run()
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href
    const url = prompt('URL do link:', previousUrl)
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  return (
    <div
      className="flex flex-wrap items-center gap-0.5 p-2 rounded-t-lg border-b"
      style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--input-border)' }}
    >
      <MenuButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
      >
        <strong>B</strong>
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
      >
        <em>I</em>
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
      >
        <span className="underline">U</span>
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
      >
        <span className="line-through">S</span>
      </MenuButton>

      <Divider />

      <MenuButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
      >
        H2
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
      >
        H3
      </MenuButton>

      <Divider />

      <MenuButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
      >
        • Lista
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
      >
        1. Lista
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        isActive={editor.isActive('taskList')}
      >
        ☑ Tarefa
      </MenuButton>

      <Divider />

      <MenuButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
      >
        " Citação
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        isActive={editor.isActive('codeBlock')}
      >
        {'</>'} Código
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        ─ Linha
      </MenuButton>

      <Divider />

      <MenuButton onClick={setLink} isActive={editor.isActive('link')}>
        🔗 Link
      </MenuButton>
      <MenuButton onClick={addImage}>
        🖼 Imagem
      </MenuButton>

      <Divider />

      <MenuButton
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        isActive={editor.isActive({ textAlign: 'left' })}
      >
        ≡
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        isActive={editor.isActive({ textAlign: 'center' })}
      >
        ≡̄
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        isActive={editor.isActive({ textAlign: 'right' })}
      >
        ≡̄
      </MenuButton>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/rich-text/MenuBar.tsx
git commit -m "feat: add rich text menu bar component"
```

---

### Task 4: Create RichTextEditor Component

**Files:**
- Create: `src/components/rich-text/RichTextEditor.tsx`

- [ ] **Step 1: Create RichTextEditor component**

```tsx
'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import MenuBar from './MenuBar'
import { defaultExtensions } from './extensions'

interface Props {
  content: string
  onChange: (html: string) => void
  placeholder?: string
}

export default function RichTextEditor({ content, onChange, placeholder }: Props) {
  const editor = useEditor({
    extensions: defaultExtensions,
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[120px] p-3 focus:outline-none',
        style: 'color: var(--text-primary)',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: '1px solid var(--input-border)', backgroundColor: 'var(--input-bg)' }}
    >
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}
```

- [ ] **Step 2: Add basic prose styles to globals.css**

Read `src/app/globals.css` and add at the end:

```css
/* Rich text editor prose styles */
.prose h2 { font-size: 1.25rem; font-weight: 600; margin: 1rem 0 0.5rem; }
.prose h3 { font-size: 1.1rem; font-weight: 600; margin: 0.75rem 0 0.5rem; }
.prose p { margin: 0.5rem 0; }
.prose ul { list-style: disc; padding-left: 1.5rem; margin: 0.5rem 0; }
.prose ol { list-style: decimal; padding-left: 1.5rem; margin: 0.5rem 0; }
.prose li { margin: 0.25rem 0; }
.prose blockquote { border-left: 3px solid var(--border-color); padding-left: 1rem; margin: 0.5rem 0; color: var(--text-secondary); }
.prose pre { background: var(--bg-tertiary); padding: 0.75rem 1rem; border-radius: 0.5rem; overflow-x: auto; margin: 0.5rem 0; }
.prose code { font-size: 0.875rem; }
.prose :not(pre) > code { background: var(--bg-tertiary); padding: 0.15rem 0.35rem; border-radius: 0.25rem; }
.prose img { max-width: 100%; height: auto; border-radius: 0.5rem; margin: 0.75rem 0; }
.prose a { color: #3b82f6; text-decoration: underline; }
.prose table { border-collapse: collapse; width: 100%; margin: 0.5rem 0; }
.prose th, .prose td { border: 1px solid var(--border-color); padding: 0.5rem; text-align: left; }
.prose th { background: var(--bg-tertiary); font-weight: 600; }
.prose hr { border: none; border-top: 1px solid var(--border-color); margin: 1rem 0; }
.prose ul[data-type="taskList"] { list-style: none; padding-left: 0; }
.prose ul[data-type="taskList"] li { display: flex; align-items: center; gap: 0.5rem; }
.prose ul[data-type="taskList"] li input[type="checkbox"] { width: 1rem; height: 1rem; }
```

- [ ] **Step 3: Commit**

```bash
git add src/components/rich-text/RichTextEditor.tsx src/app/globals.css
git commit -m "feat: add rich text editor component"
```

---

### Task 5: Create HTML Strip Utility

**Files:**
- Create: `src/lib/html.ts`

- [ ] **Step 1: Create HTML utility**

```typescript
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

export function truncateHtml(html: string, maxLength: number): string {
  const text = stripHtml(html)
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/html.ts
git commit -m "feat: add html strip utility"
```

---

### Task 6: Update PostFormPage

**Files:**
- Modify: `src/modules/posts/pages/PostFormPage.tsx`

- [ ] **Step 1: Replace textarea with RichTextEditor**

Change the content field from:

```tsx
<div className="flex flex-col gap-1">
  <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>Conteúdo</label>
  <textarea
    name="conteudo"
    placeholder="Digite o conteúdo"
    value={conteudo}
    onChange={(e) => setConteudo(e.target.value)}
    rows={5}
    className="rounded-lg px-4 py-2 text-sm focus:outline-none resize-none transition-colors"
    style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
  />
</div>
```

To:

```tsx
<div className="flex flex-col gap-1">
  <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>Conteúdo</label>
  <RichTextEditor content={conteudo} onChange={setConteudo} />
</div>
```

Add import at top:

```tsx
import dynamic from 'next/dynamic'

const RichTextEditor = dynamic(() => import('@/components/rich-text/RichTextEditor'), { ssr: false })
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/posts/pages/PostFormPage.tsx
git commit -m "feat: integrate tiptap editor in post form"
```

---

### Task 7: Update FormComentario

**Files:**
- Modify: `src/modules/posts/components/FormComentario.tsx`

- [ ] **Step 1: Replace textarea with RichTextEditor**

Change from:

```tsx
<textarea
  value={texto}
  onChange={(e) => setTexto(e.target.value)}
  placeholder="Escreva um comentário..."
  rows={2}
  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none resize-none transition-colors"
  style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
/>
```

To:

```tsx
<RichTextEditor content={texto} onChange={setTexto} placeholder="Escreva um comentário..." />
```

Add import at top:

```tsx
import dynamic from 'next/dynamic'

const RichTextEditor = dynamic(() => import('@/components/rich-text/RichTextEditor'), { ssr: false })
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/posts/components/FormComentario.tsx
git commit -m "feat: integrate tiptap editor in comment form"
```

---

### Task 8: Update PostDetailPage to Render HTML

**Files:**
- Modify: `src/modules/posts/pages/PostDetailPage.tsx`

- [ ] **Step 1: Render content as HTML**

Change:

```tsx
<p className="leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>{post.conteudo}</p>
```

To:

```tsx
<div
  className="prose prose-sm max-w-none mb-6"
  style={{ color: 'var(--text-secondary)' }}
  dangerouslySetInnerHTML={{ __html: post.conteudo }}
/>
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/posts/pages/PostDetailPage.tsx
git commit -m "feat: render post content as HTML"
```

---

### Task 9: Update ListaComentarios to Render HTML

**Files:**
- Modify: `src/modules/posts/components/ListaComentarios.tsx`

- [ ] **Step 1: Render comment text as HTML**

Change:

```tsx
<p className="text-sm mt-2" style={{ color: 'var(--text-primary)' }}>{comentario.texto}</p>
```

To:

```tsx
<div
  className="prose prose-sm max-w-none mt-2 text-sm"
  style={{ color: 'var(--text-primary)' }}
  dangerouslySetInnerHTML={{ __html: comentario.texto }}
/>
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/posts/components/ListaComentarios.tsx
git commit -m "feat: render comments as HTML"
```

---

### Task 10: Update PostListPage to Strip HTML

**Files:**
- Modify: `src/modules/posts/pages/PostListPage.tsx`

- [ ] **Step 1: Import strip utility and use it**

Add import:

```tsx
import { truncateHtml } from '@/lib/html'
```

Change:

```tsx
<p className="text-sm mb-4 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{post.conteudo}</p>
```

To:

```tsx
<p className="text-sm mb-4 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{truncateHtml(post.conteudo, 150)}</p>
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/posts/pages/PostListPage.tsx
git commit -m "feat: strip HTML in post list view"
```

---

### Task 11: Update PostDetailPage to Strip HTML for Meta

**Files:**
- Modify: `src/modules/posts/pages/PostDetailPage.tsx`

- [ ] **Step 1: Import strip utility for potential meta descriptions**

Add import:

```tsx
import { stripHtml } from '@/lib/html'
```

This ensures the utility is available if needed for meta tags or other plain text contexts.

- [ ] **Step 2: Commit**

```bash
git add src/modules/posts/pages/PostDetailPage.tsx
git commit -m "chore: add html strip import to post detail"
```

---

## Verification

After completing all tasks:

1. **Type check:**
```bash
npx tsc --noEmit
```

2. **Run dev server:**
```bash
npm run dev
```

3. **Manual test:**
- Create a new post with formatted content (bold, lists, links)
- Verify editor displays correctly
- Verify post renders HTML on detail page
- Verify list shows plain text excerpt
- Create a comment with formatting
- Verify comment renders correctly

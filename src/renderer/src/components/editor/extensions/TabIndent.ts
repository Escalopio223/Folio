import { Extension } from '@tiptap/core'

export const TabIndent = Extension.create({
  name: 'tabIndent',

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        // Inserta 2 espacios de sangría editorial sin perder foco ni romper el DOM
        return this.editor.commands.insertContent('  ')
      }
    }
  }
})

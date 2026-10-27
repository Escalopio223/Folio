import { Node, mergeAttributes, nodeInputRule } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    sceneBreak: {
      setSceneBreak: () => ReturnType
    }
  }
}

export const SceneBreak = Node.create({
  name: 'sceneBreak',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,

  parseHTML() {
    return [
      { tag: 'div[data-type="scene-break"]' },
      { tag: 'hr.scene-break' },
      { tag: 'hr' }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'scene-break',
        class: 'scene-break'
      }),
      '* * *'
    ]
  },

  addCommands() {
    return {
      setSceneBreak:
        () =>
        ({ chain }) => {
          return chain().insertContent({ type: this.name }).run()
        }
    }
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: /^(?:---|—-|___\s|\*\*\*\s)$/,
        type: this.type
      })
    ]
  }
})

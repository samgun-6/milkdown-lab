import {
  Ctx,
  defaultValueCtx,
  editorCtx,
  editorViewCtx,
  getDoc,
  parserCtx,
  schemaCtx,
  serializerCtx,
  ThemeColor,
  ThemeScrollbar,
} from '@milkdown/core'
import { Slice } from '@milkdown/prose/model'
import { EditorView } from '@milkdown/prose/view'
import { ThemeUtils } from '@milkdown/utils'
import { CodemirrorEditor } from './codemirror'

const updateContent = (content: string) => {
  return (ctx: Ctx) => {
    const view = ctx.get(editorViewCtx)
    const parser = ctx.get(parserCtx)
    const doc = parser(content)
    if (!doc) return
    const { state } = view
    const tr = state.tr.replace(0, state.doc.content.size, new Slice(doc.content, 0, 0))
    tr.setMeta('sync', true)
    view.dispatch(tr)
  }
}

const codemirrorView = (utils: ThemeUtils, ctx: Ctx) => {
  const splitEditor = document.createElement('div')
  splitEditor.classList.add('milkdown-split-editor')

  const defaultValue = ctx.get(defaultValueCtx)
  const schema = ctx.get(schemaCtx)
  const parser = ctx.get(parserCtx)

  const serializer = ctx.get(serializerCtx)
  const doc = getDoc(defaultValue, parser, schema)
  const content = doc ? serializer(doc) : ''

  const codemirror = new CodemirrorEditor(splitEditor, content)
  codemirror.onChange = (content: string) => {
    const editor = ctx.get(editorCtx)
    editor.action(updateContent(content))
  }

  utils.themeManager.onFlush(() => {
    const style = utils.getStyle(({ css }) => {
      return css`
        background: ${utils.themeManager.get(ThemeColor, ['background'])};
        color: ${utils.themeManager.get(ThemeColor, ['solid'])};
        &.hidden {
          display: none;
        }
        > .cm-editor {
          height: 100%;
        }
        .cm-scroller {
          ${utils.themeManager.get(ThemeScrollbar, ['y'])}
        }
      `
    })

    if (style) splitEditor.classList.add(style)
  })

  const onEditorInput = (_content: string) => {
    codemirror.setContent(_content)
  }

  return { splitEditor, onEditorInput }
}

export const initWrapper = (_ctx: Ctx, view: EditorView) => {
  let wrapper: HTMLDivElement | null = null
  wrapper = document.createElement('div')
  wrapper.classList.add('milkdown-two-columns-wrapper')

  const editorDOM = view.dom
  const milkdownDOM = editorDOM.parentElement
  const editorRoot = milkdownDOM?.parentElement as HTMLElement
  if (!milkdownDOM || !editorRoot) throw new Error('Missing root element')

  editorRoot.replaceChild(wrapper, milkdownDOM)
  wrapper.appendChild(milkdownDOM)
  return wrapper
}

export const initTwoColumns = (utils: ThemeUtils, view: EditorView, ctx: Ctx, wrapper: HTMLDivElement | null) => {
  if (!wrapper) throw new Error('Missing wrapper element')

  const { splitEditor, onEditorInput } = codemirrorView(utils, ctx)

  const editorDOM = view.dom as HTMLDivElement

  const { themeManager } = utils

  themeManager.onFlush(() => {
    const wrapperStyle = utils.getStyle(({ css }) => {
      return css`
        display: flex;
        height: 100%;
        &:has(.milkdown-two-columns.hidden) {
          > div {
            width: 100%;
          }
        }
        > div {
          width: 50%;
        }
      `
    })
    if (wrapperStyle) wrapper.classList.add(wrapperStyle)
  })

  const milkdownDOM = editorDOM.parentElement
  const editorRoot = milkdownDOM?.parentElement as HTMLElement
  if (!milkdownDOM) throw new Error('Missing root element')

  wrapper.append(splitEditor)

  const restoreDOM = () => {
    editorRoot.appendChild(milkdownDOM)
    wrapper.remove()
    splitEditor.remove()
    return milkdownDOM
  }

  return [splitEditor, restoreDOM, onEditorInput] as const
}

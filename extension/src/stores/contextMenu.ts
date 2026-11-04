import { ref } from 'vue'
import type { Topic, Work } from '@/api/types'

export type CardMenuTarget =
  | { kind: 'topic'; topic: Topic }
  | { kind: 'work'; work: Work }

export interface MenuContext {
  /** A card was under the pointer; otherwise this is the page background. */
  card: CardMenuTarget | null
  anchor: Element | null
  position: { X: number; Y: number }
  /** Focused input/textarea/contenteditable under the pointer, if any. */
  editable: HTMLElement | null
  hasSelection: boolean
  selectedText: string
  /** The <a href> that was right-clicked, if any. */
  link: { href: string; text: string } | null
}

/**
 * One shared context menu owns the whole document. Extension UI replaces the
 * browser menu everywhere — including on empty space — so it also has to offer
 * the text editing actions people expect (copy / paste / select all).
 */
export const menuContext = ref<MenuContext | null>(null)

export function openContextMenu(context: MenuContext): void {
  menuContext.value = context
}

export function closeContextMenu(): void {
  menuContext.value = null
}

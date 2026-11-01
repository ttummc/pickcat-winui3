/** True when the user has actually selected some text (not just a caret). */
export function hasTextSelection(): boolean {
  const selection = window.getSelection()
  return Boolean(selection && !selection.isCollapsed && selection.toString().trim().length > 0)
}

/** Inputs, textareas and contenteditable regions keep their native menu. */
export function isEditableTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null
  if (!element) return false
  const tag = element.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || element.isContentEditable === true
}

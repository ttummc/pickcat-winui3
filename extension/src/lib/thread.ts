/**
 * 评论区层级构建。
 *
 * 接口返回的是扁平列表，回复关系只体现在 replyToXxxNumber 上（children 恒为空），
 * 所以树必须由客户端自己拼。这里同时处理三种异常数据：
 * 父节点不存在（被分页截断或已删除）、环状引用、层级过深。
 */

export interface ThreadNode<T> {
  item: T
  depth: number
  parent: T | null
  children: ThreadNode<T>[]
}

/** 一行渲染数据：要么是一条回复，要么是「展开 N 条」的折叠行。 */
export type ThreadRow<T> =
  | { kind: 'item'; item: T; depth: number; parent: T | null; hasMore: boolean; moreCount: number }
  | { kind: 'more'; key: string; depth: number; count: number }

export function buildThread<T>(
  items: T[],
  getKey: (item: T) => string,
  getParentKey: (item: T) => string | null | undefined,
  maxDepth = 3,
): ThreadNode<T>[] {
  const nodes = new Map<string, ThreadNode<T>>()
  const order: string[] = []

  for (const item of items) {
    const key = String(getKey(item))
    if (nodes.has(key)) continue
    nodes.set(key, { item, depth: 0, parent: null, children: [] })
    order.push(key)
  }

  const roots: ThreadNode<T>[] = []
  for (const key of order) {
    const node = nodes.get(key)!
    const parentKey = getParentKey(node.item)
    const parent = parentKey === null || parentKey === undefined ? undefined : nodes.get(String(parentKey))
    // 父节点缺失时按根节点处理，避免整条回复消失。
    if (!parent || parent === node) {
      roots.push(node)
      continue
    }
    nodes.get(String(parentKey))!.children.push(node)
  }

  // 环状引用保护：从根出发标记可达节点，不可达的补成根节点。
  const seen = new Set<ThreadNode<T>>()
  const walk = (node: ThreadNode<T>, depth: number, guard: number): void => {
    if (seen.has(node) || guard > 50) return
    seen.add(node)
    node.depth = Math.min(depth, maxDepth)
    for (const child of node.children) {
      child.parent = node.item
      walk(child, node.depth + 1, guard + 1)
    }
  }
  for (const root of roots) walk(root, 0, 0)
  for (const key of order) {
    const node = nodes.get(key)!
    if (!seen.has(node)) {
      node.parent = null
      roots.push(node)
      walk(node, 0, 0)
    }
  }

  return roots
}

/**
 * 把树摊平成渲染列表：超过阈值的子回复默认折叠，只保留前 keep 条。
 * @param expanded 已展开的父节点 key 集合
 */
export function flattenThread<T>(
  roots: ThreadNode<T>[],
  getKey: (item: T) => string,
  expanded: Set<string>,
  threshold = 3,
  keep = 2,
): ThreadRow<T>[] {
  const rows: ThreadRow<T>[] = []

  const emit = (node: ThreadNode<T>): void => {
    const key = String(getKey(node.item))
    const collapsed = node.children.length > threshold && !expanded.has(key)
    const visible = collapsed ? node.children.slice(0, keep) : node.children

    rows.push({
      kind: 'item',
      item: node.item,
      depth: node.depth,
      parent: node.parent,
      hasMore: collapsed,
      moreCount: node.children.length - visible.length,
    })

    for (const child of visible) emit(child)

    if (collapsed) {
      rows.push({ kind: 'more', key, depth: node.depth + 1, count: node.children.length - keep })
    }
  }

  for (const root of roots) emit(root)
  return rows
}

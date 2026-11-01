import type { Topic, Work } from '@/api/types'
import type { CardMenuTarget } from './contextMenu'

/**
 * Cards register what they represent under a DOM key, so the shell's single
 * right-click handler can resolve the target without poking private properties
 * into elements (which breaks when Vue re-creates a node).
 */
const registry = new Map<string, CardMenuTarget>()

export function registerCard(key: string, target: CardMenuTarget): void {
  registry.set(key, target)
}

export function unregisterCard(key: string): void {
  registry.delete(key)
}

export function resolveCard(key: string | null | undefined): CardMenuTarget | null {
  if (!key) return null
  return registry.get(key) ?? null
}

export function topicCardKey(id: string): string {
  return `topic:${id}`
}

export function workCardKey(id: string): string {
  return `work:${id}`
}

export type { Topic, Work }

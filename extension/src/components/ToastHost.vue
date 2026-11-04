<script setup lang="ts">
import { uiState, dismiss } from '@/stores/ui'

/**
 * Toast host.
 *
 * Built on the library's own InfoBar: `CornerRadius` handles the surface, and
 * Title/Message sit in the same grid row (the Content slot is a *side* column,
 * not a second row, so it squeezed the title into two lines - don't use it here).
 */
</script>

<template>
  <TransitionGroup name="pc-toast" tag="div" class="pc-toast-stack">
    <InfoBar
      v-for="message in uiState.messages"
      :key="message.id"
      IsOpen="True"
      :Message="message.message ? `${message.title} · ${message.message}` : message.title"
      :Severity="message.severity"
      :IsClosable="True"
      :CornerRadius="8"
      :Width="480"
      :MinWidth="420"
      class="pc-toast"
      @CloseButtonClick="dismiss(message.id)"
    />
  </TransitionGroup>
</template>

<style>
.pc-toast-stack {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  max-height: calc(100vh - 60px);
  overflow: hidden;
  pointer-events: none;
}

.pc-toast-stack > * {
  pointer-events: auto;
}

/* The <section> is only a wrapper; the visible surface is the rounded inner root.
   Painting the section instead left square corners and let page content show
   through the translucent severity brush. */
.pc-toast-stack .win-infobar {
  background: transparent;
  border: none;
  box-shadow: none;
}

/* --card-bg is a translucent white in this library, so using it made the toast
   see-through. Paint an opaque surface that follows the active theme. */
.pc-toast-stack .win-infobar-content-root {
  background: var(--pc-toast-bg, #2b2b2b) !important;
  box-shadow: 0 10px 28px rgb(0 0 0 / 44%), 0 2px 6px rgb(0 0 0 / 26%);
  border-radius: 8px;
}

:root,
html.theme-dark {
  --pc-toast-bg: #2b2b2b;
}

html.theme-light {
  --pc-toast-bg: #f9f9fb;
}

/* Titles are short labels; never let the grid squeeze them onto two lines. */
.pc-toast-stack .win-infobar-panel {
  min-width: 0;
}

/* One line when it fits, otherwise wrap - the bar has an explicit width so the
   message column is wide enough for the common cases. */
/* The control's scoped rules cap the message block below its column width and
   win on specificity, so these need !important. */
.pc-toast-stack .win-infobar-message {
  width: 100% !important;
  max-width: none !important;
  font-size: 13px !important;
  line-height: 18px !important;
  overflow-wrap: anywhere;
}

.pc-toast-detail {
  font-size: 13px;
  line-height: 18px;
  color: var(--text-secondary);
  overflow-wrap: anywhere;
}

/* enter / leave / reorder */
.pc-toast-enter-active,
.pc-toast-leave-active,
.pc-toast-move {
  transition:
    opacity 0.18s var(--fast-out-slow-in, cubic-bezier(0, 0, 0, 1)),
    transform 0.18s var(--fast-out-slow-in, cubic-bezier(0, 0, 0, 1));
}

.pc-toast-enter-from,
.pc-toast-leave-to {
  opacity: 0;
  transform: translateY(14px) scale(0.98);
}

.pc-toast-leave-active {
  position: absolute;
}

@media (prefers-reduced-motion: reduce) {
  .pc-toast-enter-active,
  .pc-toast-leave-active,
  .pc-toast-move {
    transition: none;
  }
}
</style>

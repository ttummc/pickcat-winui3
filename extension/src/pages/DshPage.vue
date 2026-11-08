<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import {
  checkDsh,
  createChat,
  deleteChat,
  dshState,
  saveKey,
  selectChat,
  sendPrompt,
  cancelDshTask,
} from '@/stores/dsh'
import EmptyState from '@/components/EmptyState.vue'

/**
 * 「DSH 定制」 — a conversation surface over the bundled kernel. Each conversation
 * owns a workspace folder the kernel runs inside, mirroring the DSH app itself.
 */
const input = ref('')
const keyInput = ref('')
const savingKey = ref(false)
const keyPanelOpen = ref(false)
const thread = ref<HTMLElement | null>(null)

const canSend = computed(
  () => dshState.ready && dshState.hasKey && !dshState.running && input.value.trim().length > 0,
)

const needsSetup = computed(
  () => dshState.ready && !dshState.hasKey && dshState.chats.length === 0,
)

/** The key editor is reachable at any time, not only before the first chat. */
const keyPanelVisible = computed(() => needsSetup.value || keyPanelOpen.value)

const showKeyHint = computed(() => dshState.ready && !dshState.hasKey && dshState.chats.length > 0)

const activeChat = computed(
  () => dshState.chats.find(c => c.id === dshState.activeId) ?? null,
)

async function submit(): Promise<void> {
  if (!canSend.value) return
  const text = input.value.trim()
  input.value = ''
  await sendPrompt(text)
  await scrollToBottom()
}

async function scrollToBottom(): Promise<void> {
  await nextTick()
  if (thread.value) thread.value.scrollTop = thread.value.scrollHeight
}

async function submitKey(): Promise<void> {
  const key = keyInput.value.trim()
  if (!key) return
  savingKey.value = true
  try {
    await saveKey(key)
    keyInput.value = ''
    keyPanelOpen.value = false
  } finally {
    savingKey.value = false
  }
}

async function clearKey(): Promise<void> {
  savingKey.value = true
  try {
    await saveKey('')
    keyInput.value = ''
  } finally {
    savingKey.value = false
  }
}

function onKeydown(event: KeyboardEvent): void {
  // Enter sends, Shift+Enter breaks the line — the same as the DSH app.
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    void submit()
  }
}

watch(
  () => dshState.messages.length,
  () => void scrollToBottom(),
)

onMounted(async () => {
  await checkDsh()
  await scrollToBottom()
})
</script>

<template>
  <div class="pc-page">
    <div v-if="dshState.checking" class="pc-dsh-center">
      <EmptyState glyph="&#xE895;" title="正在检测内核" description="正在连接桌面宿主。" />
    </div>

    <div v-else-if="!dshState.available" class="pc-dsh-center">
      <EmptyState
        glyph="&#xE7BA;"
        title="未检测到桌面版"
        description="DSH 定制需要桌面版提供的内核与本机桥接；浏览器扩展模式不支持。"
      />
    </div>

    <div v-else-if="!dshState.ready" class="pc-dsh-center">
      <EmptyState
        glyph="&#xEA39;"
        title="内核不可用"
        :description="dshState.failure || '未找到 DSH 内核，请重新安装桌面版。'"
      />
    </div>

    <div v-else class="pc-dsh">
      <aside class="pc-dsh-rail">
        <button class="pc-dsh-new" type="button" @click="createChat()">＋ 新对话</button>
        <ul class="pc-dsh-list">
          <li
            v-for="chat in dshState.chats"
            :key="chat.id"
            class="pc-dsh-item"
            :class="{ 'pc-dsh-item--active': chat.id === dshState.activeId }"
            @click="selectChat(chat.id)"
          >
            <span class="pc-dsh-item-title">{{ chat.title }}</span>
            <button class="pc-dsh-del" type="button" title="删除对话" @click.stop="deleteChat(chat.id)">
              ✕
            </button>
          </li>
        </ul>
        <p v-if="!dshState.chats.length" class="pc-dsh-empty">还没有对话</p>
      </aside>

      <section class="pc-dsh-main">
        <header class="pc-dsh-head">
          <div>
            <h1 class="pc-dsh-title">{{ activeChat?.title ?? '新对话' }}</h1>
            <p v-if="activeChat" class="pc-dsh-path" :title="activeChat.workspace">
              {{ activeChat.workspace }}
            </p>
          </div>
          <div class="pc-dsh-head-actions">
            <span v-if="dshState.running" class="pc-dsh-running">执行中…</span>
            <button class="pc-dsh-keybtn" type="button" @click="keyPanelOpen = !keyPanelOpen">
              {{ dshState.hasKey ? '密钥' : '配置密钥' }}
            </button>
          </div>
        </header>

        <p v-if="showKeyHint" class="pc-dsh-banner">
          尚未配置模型密钥，发送会失败。请先在上方「配置模型密钥」中保存。
        </p>

        <div v-if="keyPanelVisible" class="pc-dsh-setup">
          <h2>配置模型密钥</h2>
          <p>
            内核需要 DeepSeek API 密钥才能工作。密钥保存在本机
            <code>%APPDATA%\PickCat\api-key.txt</code>，仅用于内核进程的环境变量，
            不会写入日志或上传。
          </p>
          <div class="pc-dsh-keyrow">
            <input
              v-model="keyInput"
              class="pc-dsh-input"
              type="password"
              placeholder="sk-…"
              autocomplete="off"
              @keydown.enter="submitKey()"
            />
            <Button
              Style="AccentButtonStyle"
              :IsEnabled="!savingKey && keyInput.trim().length > 0"
              @Click="submitKey()"
            >
              <span class="pc-btn-content">{{ savingKey ? '保存中…' : '保存' }}</span>
            </Button>
            <Button v-if="dshState.hasKey" @Click="clearKey()">
              <span class="pc-btn-content">清除</span>
            </Button>
            <Button v-if="!needsSetup" @Click="keyPanelOpen = false">
              <span class="pc-btn-content">关闭</span>
            </Button>
          </div>
          <p class="pc-dsh-hint">
            获取地址：<a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noreferrer">
              platform.deepseek.com/api_keys
            </a>
          </p>
        </div>

        <template v-else>
          <div ref="thread" class="pc-dsh-thread">
            <p v-if="!dshState.messages.length" class="pc-dsh-hint pc-dsh-hint--center">
              描述你想要的功能，例如「在帖子页加一个收藏按钮」。
            </p>

            <div
              v-for="(message, index) in dshState.messages"
              :key="index"
              class="pc-dsh-msg"
              :class="`pc-dsh-msg--${message.role}`"
            >
              <div class="pc-dsh-bubble" :class="{ 'pc-dsh-bubble--failed': message.failed }">
                <ul v-if="message.steps?.length" class="pc-dsh-steps">
                  <li
                    v-for="(step, stepIndex) in message.steps"
                    :key="stepIndex"
                    class="pc-dsh-step"
                    :class="`pc-dsh-step--${step.kind}`"
                  >
                    <span class="pc-dsh-step-tag">
                      {{ step.kind === 'tool' ? step.tool : '思考' }}
                    </span>
                    <span class="pc-dsh-step-detail">{{ step.detail }}</span>
                    <span v-if="step.status === 'running'" class="pc-dsh-step-state">运行中</span>
                    <details v-if="step.result" class="pc-dsh-step-out">
                      <summary>输出</summary>
                      <pre>{{ step.result }}</pre>
                    </details>
                  </li>
                </ul>
                <pre v-if="message.text">{{ message.text }}</pre>
                <span v-if="message.usage" class="pc-dsh-usage">{{ message.usage }}</span>
              </div>
            </div>

            <div v-if="dshState.running" class="pc-dsh-msg pc-dsh-msg--assistant">
              <div class="pc-dsh-bubble">
                <pre v-if="dshState.liveText" class="pc-dsh-live">{{ dshState.liveText }}</pre>
                <p v-else class="pc-dsh-thinking">
                  {{ dshState.thinking || '正在处理…' }}
                </p>
              </div>
            </div>
          </div>

          <div class="pc-dsh-composer">
            <textarea
              v-model="input"
              class="pc-dsh-textarea"
              rows="2"
              placeholder="描述你想要的功能…（Enter 发送，Shift+Enter 换行）"
              :disabled="dshState.running"
              @keydown="onKeydown"
            />
            <div class="pc-dsh-actions">
              <span class="pc-dsh-hint">
                {{ dshState.chats.length ? '每个对话独立工作区' : '' }}
              </span>
              <div class="pc-row">
                <Button v-if="dshState.running" @Click="cancelDshTask()">
                  <span class="pc-btn-content">停止</span>
                </Button>
                <Button Style="AccentButtonStyle" :IsEnabled="canSend" @Click="submit()">
                  <span class="pc-btn-content">发送</span>
                </Button>
              </div>
            </div>
          </div>
        </template>
      </section>
    </div>
  </div>
</template>

<style>
.pc-dsh-center {
  padding: 40px 24px;
}

.pc-dsh {
  display: grid;
  grid-template-columns: minmax(0, 248px) minmax(0, 1fr);
  height: 100%;
  min-height: 0;
  width: 100%;
}

/* 窄窗口：侧栏收窄，保证对话区可用 */
@media (max-width: 900px) {
  .pc-dsh {
    grid-template-columns: minmax(0, 190px) minmax(0, 1fr);
  }
  .pc-dsh-main {
    padding: 12px 12px;
  }
  .pc-dsh-item {
    font-size: 12px;
  }
}

@media (max-width: 720px) {
  .pc-dsh {
    grid-template-columns: minmax(0, 132px) minmax(0, 1fr);
  }
  .pc-dsh-new {
    font-size: 12px;
    padding: 0 4px;
  }
  .pc-dsh-actions {
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
  }
  .pc-dsh-actions .pc-row {
    justify-content: flex-end;
  }
}

/* ---------- 左侧会话列表 ---------- */
.pc-dsh-rail {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  padding: 12px 10px;
  border-right: 1px solid color-mix(in srgb, var(--text-primary) 8%, transparent);
  min-height: 0;
}

.pc-dsh-new {
  width: 100%;
  height: 32px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--text-primary) 12%, transparent);
  background: color-mix(in srgb, var(--text-primary) 4%, transparent);
  color: var(--text-primary);
  font: inherit;
  font-size: 12.5px;
  cursor: pointer;
  transition: background 120ms ease;
}

.pc-dsh-new:hover {
  background: color-mix(in srgb, var(--text-primary) 9%, transparent);
}

.pc-dsh-list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pc-dsh-item {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  flex: 0 0 auto;
  overflow: hidden;
  padding: 0 8px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 12.5px;
}

.pc-dsh-item:hover {
  background: color-mix(in srgb, var(--text-primary) 6%, transparent);
}

.pc-dsh-item--active {
  background: color-mix(in srgb, var(--pc-accent, #ff6b60) 14%, transparent);
  color: var(--text-primary);
}

.pc-dsh-item-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-dsh-del {
  border: 0;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  font-size: 11px;
  opacity: 0;
}

.pc-dsh-item:hover .pc-dsh-del,
.pc-dsh-item--active .pc-dsh-del {
  opacity: 1;
}

.pc-dsh-empty {
  color: var(--text-tertiary);
  font-size: 12px;
  text-align: center;
  margin: 12px 0;
}

/* ---------- 右侧对话 ---------- */
.pc-dsh-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  padding: 14px 18px;
  gap: 10px;
  overflow: hidden;
}

.pc-dsh-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
}

.pc-dsh-head > div {
  min-width: 0;
  flex: 1;
}

.pc-dsh-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-dsh-path {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--text-tertiary);
  font-family: 'Cascadia Code', Consolas, monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-dsh-banner {
  margin: 0;
  padding: 7px 10px;
  border-radius: 6px;
  background: color-mix(in srgb, #d9a441 16%, transparent);
  color: var(--text-primary);
  font-size: 12px;
}

.pc-dsh-head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

.pc-dsh-keybtn {
  height: 26px;
  padding: 0 10px;
  border-radius: 5px;
  border: 1px solid color-mix(in srgb, var(--text-primary) 12%, transparent);
  background: color-mix(in srgb, var(--text-primary) 4%, transparent);
  color: var(--text-secondary);
  font: inherit;
  font-size: 11.5px;
  cursor: pointer;
}

.pc-dsh-keybtn:hover {
  color: var(--text-primary);
}

.pc-dsh-running {
  font-size: 12px;
  color: var(--pc-accent, #ff6b60);
}

.pc-dsh-thread {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 4px 2px;
  min-height: 0;
}

.pc-dsh-msg {
  display: flex;
}

.pc-dsh-msg--user {
  justify-content: flex-end;
}

.pc-dsh-bubble {
  max-width: 82%;
  padding: 9px 12px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--text-primary) 6%, transparent);
  color: var(--text-primary);
  font-size: 13px;
  line-height: 20px;
}

.pc-dsh-msg--user .pc-dsh-bubble {
  background: color-mix(in srgb, var(--pc-accent, #ff6b60) 20%, transparent);
}

.pc-dsh-bubble--failed {
  background: color-mix(in srgb, #d9534f 18%, transparent);
}

.pc-dsh-bubble pre {
  margin: 0;
  font: inherit;
  white-space: pre-wrap;
  word-break: break-word;
}

.pc-dsh-steps {
  list-style: none;
  margin: 0 0 8px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pc-dsh-step {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px;
  font-size: 11.5px;
  color: var(--text-secondary);
  padding: 4px 7px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--text-primary) 6%, transparent);
}

.pc-dsh-step-tag {
  font-family: 'Cascadia Code', Consolas, monospace;
  color: var(--pc-accent, #ff6b60);
}

.pc-dsh-step--thinking .pc-dsh-step-tag {
  color: var(--text-tertiary);
}

.pc-dsh-step-detail {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: 'Cascadia Code', Consolas, monospace;
}

.pc-dsh-step-state {
  color: var(--text-tertiary);
}

.pc-dsh-step-out {
  width: 100%;
  font-size: 11px;
}

.pc-dsh-step-out summary {
  cursor: pointer;
  color: var(--text-tertiary);
}

.pc-dsh-step-out pre {
  margin: 4px 0 0;
  max-height: 160px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: 'Cascadia Code', Consolas, monospace;
}

.pc-dsh-usage {
  display: block;
  margin-top: 6px;
  font-size: 10.5px;
  color: var(--text-tertiary);
}

.pc-dsh-live {
  margin: 0;
  font: inherit;
  white-space: pre-wrap;
  word-break: break-word;
}

.pc-dsh-thinking {
  margin: 0;
  color: var(--text-secondary);
  font-size: 12.5px;
  white-space: pre-wrap;
}

/* ---------- 输入区 ---------- */
.pc-dsh-composer {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 1px solid color-mix(in srgb, var(--text-primary) 8%, transparent);
  padding-top: 10px;
}

.pc-dsh-textarea {
  width: 100%;
  resize: none;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--text-primary) 14%, transparent);
  background: color-mix(in srgb, var(--text-primary) 4%, transparent);
  color: var(--text-primary);
  font: inherit;
  font-size: 13px;
  line-height: 20px;
  padding: 9px 11px;
}

.pc-dsh-textarea:focus {
  outline: none;
  border-color: var(--pc-accent, #ff6b60);
}

.pc-dsh-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pc-dsh-hint {
  margin: 0;
  font-size: 11.5px;
  color: var(--text-tertiary);
}

.pc-dsh-hint--center {
  text-align: center;
  margin: auto;
}

.pc-dsh-hint a {
  color: var(--pc-accent, #ff6b60);
}

/* ---------- 首次配置 ---------- */
.pc-dsh-setup {
  margin: auto;
  max-width: 520px;
  text-align: left;
}

.pc-dsh-setup h2 {
  margin: 0 0 8px;
  font-size: 15px;
  color: var(--text-primary);
}

.pc-dsh-setup p {
  margin: 0 0 12px;
  font-size: 12.5px;
  line-height: 20px;
  color: var(--text-secondary);
}

.pc-dsh-setup code {
  font-family: 'Cascadia Code', Consolas, monospace;
  font-size: 11.5px;
  background: color-mix(in srgb, var(--text-primary) 8%, transparent);
  padding: 1px 4px;
  border-radius: 3px;
}

.pc-dsh-keyrow {
  display: flex;
  gap: 8px;
  align-items: center;
}

.pc-dsh-input {
  flex: 1;
  height: 32px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--text-primary) 14%, transparent);
  background: color-mix(in srgb, var(--text-primary) 4%, transparent);
  color: var(--text-primary);
  font: inherit;
  font-size: 13px;
  padding: 0 10px;
}

.pc-dsh-input:focus {
  outline: none;
  border-color: var(--pc-accent, #ff6b60);
}
</style>

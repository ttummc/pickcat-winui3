<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { checkDsh, runDshTask, cancelDshTask, dshState } from '@/stores/dsh'
import EmptyState from '@/components/EmptyState.vue'

/**
 * 「DSH 定制」 — describe a feature in Chinese, the desktop host runs the DSH
 * kernel and streams its events back.
 */
const prompt = ref('')

const examples = [
  '给帖子详情页加一个“收藏到我的合集”按钮',
  '在设置页增加一个“图片代理”开关，默认关闭',
  '给作品详情页加一行显示作品来源 ID',
]

const canSubmit = computed(
  () => dshState.ready && !dshState.running && prompt.value.trim().length > 0,
)

/** Human-readable one-line summary of a kernel event. */
function describe(event: Record<string, unknown>): string {
  const type = String(event.type ?? '')
  if (type === 'session') return `会话 ${String(event.sessionId ?? '')}`
  if (type === 'status') {
    const phase = String(event.phase ?? '')
    const turn = event.turn ?? ''
    const step = event.step ?? ''
    if (phase === 'turn_start') return `第 ${turn} 轮开始`
    if (phase === 'step_start') return `第 ${turn} 轮 第 ${step} 步开始`
    if (phase === 'step_end') return `第 ${turn} 轮 第 ${step} 步结束`
    if (phase === 'turn_end') {
      const reason = event.reason as { kind?: string; error?: { message?: string } } | undefined
      if (reason?.kind === 'error') return `第 ${turn} 轮失败：${reason.error?.message ?? ''}`
      return `第 ${turn} 轮结束`
    }
    return phase
  }
  if (type === 'final') return `最终输出 ${String(event.text ?? '').slice(0, 80)}`
  if (type === 'log') return String(event.text ?? '')
  if (type === 'error') return String(event.text ?? '')
  return type
}

async function submit(): Promise<void> {
  if (!canSubmit.value) return
  await runDshTask(prompt.value.trim())
}

onMounted(() => {
  void checkDsh()
})
</script>

<template>
  <div class="pc-page">
    <div class="pc-page-scroll">
      <header class="pc-page-header">
        <div>
          <h1 class="pc-page-title">DSH 定制</h1>
          <p class="pc-page-subtitle">描述你想要的功能，由内置的 DSH 内核生成并应用。</p>
        </div>
      </header>

      <EmptyState
        v-if="dshState.checking"
        glyph="&#xE895;"
        title="正在检测内核"
        description="正在连接桌面宿主。"
      />

      <EmptyState
        v-else-if="!dshState.available"
        glyph="&#xE7BA;"
        title="未检测到桌面版"
        description="DSH 定制需要桌面版提供的内核与本机桥接；浏览器扩展模式不支持。"
      />

      <EmptyState
        v-else-if="!dshState.ready"
        glyph="&#xEA39;"
        title="内核不可用"
        :description="dshState.failure || '未找到 DSH 内核，请重新安装桌面版。'"
      />

      <template v-else>
        <section class="pc-dsh-status">
          <span class="pc-dsh-dot" />
          <span>内核就绪</span>
          <span v-if="dshState.kernel" class="pc-muted">
            {{ dshState.kernel.path }}
          </span>
        </section>

        <section class="pc-card pc-dsh-form">
          <label class="pc-field-label">需求描述</label>
          <textarea
            v-model="prompt"
            class="pc-dsh-input"
            rows="4"
            placeholder="例如：在帖子详情页加一个按钮，把当前帖子加入我的合集"
            :disabled="dshState.running"
          />

          <div class="pc-dsh-examples">
            <button
              v-for="example in examples"
              :key="example"
              class="pc-tag"
              type="button"
              :disabled="dshState.running"
              @click="prompt = example"
            >
              {{ example }}
            </button>
          </div>

          <div class="pc-row" style="margin-top: 12px">
            <Button Style="AccentButtonStyle" :IsEnabled="canSubmit" @Click="submit">
              <span class="pc-btn-content">{{ dshState.running ? '执行中…' : '开始生成' }}</span>
            </Button>
            <Button v-if="dshState.running" @Click="cancelDshTask">
              <span class="pc-btn-content">取消</span>
            </Button>
          </div>
        </section>

        <section v-if="dshState.events.length || dshState.running" class="pc-card pc-dsh-log">
          <h3 class="pc-rail-title">执行日志</h3>
          <ol class="pc-dsh-events">
            <li v-for="(event, index) in dshState.events" :key="index" class="pc-dsh-event">
              {{ describe(event) }}
            </li>
          </ol>
        </section>

        <section v-if="dshState.finalText || dshState.failed" class="pc-card pc-dsh-result">
          <h3 class="pc-rail-title">{{ dshState.failed ? '执行失败' : '生成结果' }}</h3>
          <pre class="pc-dsh-output">{{ dshState.finalText || dshState.failure }}</pre>
        </section>
      </template>
    </div>
  </div>
</template>

<style>
.pc-dsh-status {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12.5px;
  margin-bottom: 14px;
  color: var(--text-secondary);
}

.pc-dsh-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4bd07a;
}

.pc-dsh-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
}

.pc-dsh-input {
  width: 100%;
  resize: vertical;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--text-primary) 14%, transparent);
  background: color-mix(in srgb, var(--text-primary) 4%, transparent);
  color: var(--text-primary);
  font: inherit;
  font-size: 13.5px;
  line-height: 20px;
  padding: 10px 12px;
}

.pc-dsh-input:focus {
  outline: none;
  border-color: var(--pc-accent, #ff6b60);
}

.pc-dsh-examples {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pc-dsh-log,
.pc-dsh-result {
  margin-bottom: 14px;
}

.pc-dsh-events {
  margin: 0;
  padding-left: 18px;
  max-height: 320px;
  overflow-y: auto;
  font-size: 12.5px;
  line-height: 20px;
  color: var(--text-secondary);
}

.pc-dsh-output {
  margin: 0;
  padding: 10px 12px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--text-primary) 5%, transparent);
  font-family: 'Cascadia Code', Consolas, monospace;
  font-size: 12.5px;
  line-height: 19px;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 360px;
  overflow: auto;
}
</style>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

/**
 * Landing page built with the same WinUI 3 control library as the extension, so
 * the site and the product look like one thing.
 */
const sections = [
  { tag: 'overview', label: '概览', glyph: '\uE80F' },
  { tag: 'features', label: '功能', glyph: '\uE8A5' },
  { tag: 'screens', label: '界面', glyph: '\uE7F4' },
  { tag: 'install', label: '安装', glyph: '\uE896' },
  { tag: 'faq', label: '常见问题', glyph: '\uE897' },
] as const

const section = ref<string>('overview')
const scrollRef = ref<HTMLElement | null>(null)

function go(tag: string): void {
  section.value = tag
  scrollRef.value?.scrollTo({ top: 0, behavior: 'smooth' })
}

const RELEASE =
  'https://github.com/ttummc/pickcat-winui3/releases/latest/download/PickCat-WinUI3-extension.zip'
const REPO = 'https://github.com/ttummc/pickcat-winui3'

const version = ref('v1.0.0')
const size = ref('1.6 MB')
const sha = ref('')

onMounted(async () => {
  try {
    const res = await fetch('https://api.github.com/repos/ttummc/pickcat-winui3/releases/latest', {
      headers: { Accept: 'application/vnd.github+json' },
    })
    if (!res.ok) return
    const data = (await res.json()) as {
      tag_name?: string
      assets?: { name: string; size?: number; digest?: string }[]
    }
    if (data.tag_name) version.value = data.tag_name
    const asset = (data.assets ?? []).find((a) => a.name === 'PickCat-WinUI3-extension.zip')
    if (asset?.size) size.value = `${(asset.size / 1024 / 1024).toFixed(2)} MB`
    if (asset?.digest) sha.value = String(asset.digest).replace('sha256:', '')
  } catch {
    /* static fallbacks are fine */
  }
})

const features = [
  { glyph: '\uE7F4', title: '真·WinUI 3 控件', text: 'TitleBar、NavigationView、SelectorBar、SettingsCard、InfoBar 等 18 种控件，不是仿制品。' },
  { glyph: '\uE8A7', title: '页面过渡', text: '进入下一层从右滑入、返回反向退出、同级淡入；列表逐条上浮，按压有反馈。' },
  { glyph: '\uE8C8', title: '右键菜单全接管', text: '卡片操作、复制选中文字、打开选中链接、页面操作 —— 空白处也有菜单。' },
  { glyph: '\uE90A', title: '登录走官方页面', text: '登录表单完整保留原站页面，滑块验证在官方页面完成，我们不做任何改动。' },
  { glyph: '\uE793', title: '主题与强调色', text: '浅色 / 深色 / 跟随系统，四套强调色，标题栏与界面同步。' },
  { glyph: '\uE72E', title: '不收集数据', text: '所有请求都发往 pickcat.dao3.fun，本地只存两项界面偏好。' },
]

const shots = [
  { file: 'home', title: '首页', desc: '推荐 / 最新信息流，卡片逐条入场' },
  { file: 'forum', title: '论坛', desc: '分类、标签与活跃度' },
  { file: 'topic', title: '帖子详情', desc: '正文、楼层、点赞与举报' },
  { file: 'works', title: '作品', desc: '精选轮播 + 发现' },
  { file: 'work', title: '作品详情', desc: '点赞、收藏、评论互动' },
  { file: 'profile', title: '个人主页', desc: '左卡片 + 右侧内容，贡献热力图' },
  { file: 'search', title: '搜索', desc: '用户与作品' },
  { file: 'settings', title: '设置', desc: '主题、强调色、账户' },
]

const shotIndex = ref(0)
const currentShot = computed(() => shots[shotIndex.value])

const steps = [
  { title: '下载并解压到固定目录', body: '解压到长期保留的位置，比如 C:\\Users\\你的用户名\\PickCatWinUI3。不要放在「下载」或临时目录 —— 扩展会一直读取这些文件。' },
  { title: '打开扩展页，开启开发者模式', body: '地址栏输入 chrome://extensions（Edge 用 edge://extensions），打开右上角的「开发者模式」。' },
  { title: '点「加载已解压的扩展程序」', body: '开启开发者模式后左上角会出现三个按钮，点第一个。' },
  { title: '选择解压出来的文件夹', body: '选到第 1 步那个文件夹（里面应能看到 manifest.json），确定。' },
  { title: '打开 pickcat.dao3.fun', body: '扩展列表出现「PickCat WinUI 3」即成功，刷新页面就能看到新界面。' },
]

const faq = [
  { q: '装完没有任何变化？', a: '确认扩展已启用、当前标签页确实是 pickcat.dao3.fun，并刷新页面。都不行就移除扩展重新加载一次。' },
  { q: '怎么卸载、恢复原站？', a: '打开 chrome://extensions，找到 PickCat WinUI 3，点「移除」。原站界面立刻恢复。' },
  { q: '需要登录吗？', a: '浏览不需要。发帖、通知、个人图盘需要先登录 —— 点登录会打开官方登录页的新标签页，在那里完成滑块验证即可。' },
  { q: '会上传我的账号信息吗？', a: '不会。扩展只在你已登录的页面里调用官方接口，自身不保存、不转发任何数据。' },
  { q: '有些页面提示「尚未重建」？', a: '注册、找回密码、圈子、创作、入站考试、审核等页面还没重写，会给出「在原站打开」按钮。' },
  { q: '支持 Firefox 或 Safari 吗？', a: '暂不支持，目前只有 Chromium 扩展（Chrome、Edge 等）。' },
]

function openInNewTab(url: string): void {
  window.open(url, '_blank', 'noopener')
}
</script>

<template>
  <div class="pc-site">
    <header class="pc-topbar">
      <img class="pc-topbar-icon" :src="`./store/icon-128.png`" alt="" />
      <b class="pc-topbar-name">PickCat WinUI 3</b>

      <nav class="pc-topbar-nav">
        <button
          v-for="item in sections"
          :key="item.tag"
          type="button"
          class="pc-topbar-link"
          :class="{ 'pc-topbar-link--on': section === item.tag }"
          @click="go(item.tag)"
        >
          {{ item.label }}
        </button>
      </nav>

      <Button Style="AccentButtonStyle" @Click="openInNewTab(RELEASE)">
        <span class="pc-btn-content"><FontIcon Glyph="&#xE896;" /> 下载</span>
      </Button>
    </header>

    <div class="pc-site-body">
        <div class="pc-site-scroll" ref="scrollRef">
        <!-- overview -->
        <section v-if="section === 'overview'" class="pc-section">
          <h1 class="pc-h1">PickCat WinUI 3 版</h1>
          <p class="pc-lead">
            用真实的 WinUI 3 控件把 PickCat 社区整个重写了一遍 —— 不是换一层皮，
            而是把原站界面丢掉，按系统应用的逻辑重新做。
          </p>

          <div class="pc-chips">
            <span class="pc-chip">最新版本 <b>{{ version }}</b></span>
            <span class="pc-chip">压缩包 <b>{{ size }}</b></span>
            <span class="pc-chip"><b>14</b> 个页面</span>
            <span class="pc-chip">GPL-3.0</span>
            <span class="pc-chip">非官方</span>
          </div>

          <div class="pc-row">
            <Button Style="AccentButtonStyle" @Click="openInNewTab(RELEASE)">
              <span class="pc-btn-content">
                <FontIcon Glyph="&#xE896;" /> 下载扩展包
              </span>
            </Button>
            <Button @Click="openInNewTab(REPO)">
              <span class="pc-btn-content">
                <FontIcon Glyph="&#xE8A7;" /> 查看源码
              </span>
            </Button>
          </div>

          <div style="margin-top: 16px">
            <InfoBar
              IsOpen="True"
              Title="非官方项目"
              Message="与 PickCat 官方无关。只在 pickcat.dao3.fun 生效，不收集任何数据。"
              Severity="Informational"
              :IsClosable="false"
            />
          </div>

          <div class="pc-hero-shot">
            <img :src="`./promo/pickcat-promo.png`" alt="PickCat WinUI 3 界面" />
          </div>
        </section>

        <!-- features -->
        <section v-else-if="section === 'features'" class="pc-section">
          <h2 class="pc-h2">它和原站有什么不同</h2>
          <p class="pc-sub">不是套一层 CSS，而是让真正的 WinUI 控件承担交互。</p>
          <div class="pc-grid">
            <div v-for="f in features" :key="f.title" class="pc-feature">
              <span class="g">{{ f.glyph }}</span>
              <span>
                <b>{{ f.title }}</b>
                <span>{{ f.text }}</span>
              </span>
            </div>
          </div>
        </section>

        <!-- screenshots -->
        <section v-else-if="section === 'screens'" class="pc-section">
          <h2 class="pc-h2">界面</h2>
          <p class="pc-sub">当前版本的实际渲染截图，点缩略图切换。</p>

          <div class="pc-viewer">
            <img :src="`./screenshots/site/${currentShot.file}.png`" :alt="currentShot.title" />
            <div class="pc-viewer-bar">
              <span class="pc-viewer-caption">
                <b>{{ currentShot.title }}</b> · {{ currentShot.desc }}
              </span>
              <PipsPager
                v-model:SelectedPageIndex="shotIndex"
                :NumberOfPages="shots.length"
                PreviousButtonVisibility="Visible"
                NextButtonVisibility="Visible"
                :MaxVisiblePips="6"
              />
            </div>
          </div>

          <div class="pc-thumbs">
            <button
              v-for="(shot, index) in shots"
              :key="shot.file"
              class="pc-thumb"
              :class="{ 'pc-thumb--on': index === shotIndex }"
              type="button"
              :title="shot.title"
              @click="shotIndex = index"
            >
              <img :src="`./screenshots/site/${shot.file}.png`" :alt="shot.title" loading="lazy" />
            </button>
          </div>
        </section>

        <!-- install -->
        <section v-else-if="section === 'install'" class="pc-section">
          <h2 class="pc-h2">安装</h2>
          <p class="pc-sub">不需要命令行，大约 1 分钟。</p>

          <div class="pc-row" style="margin-bottom: 14px">
            <Button Style="AccentButtonStyle" @Click="openInNewTab(RELEASE)">
              <span class="pc-btn-content">
                <FontIcon Glyph="&#xE896;" /> 下载 {{ version }}
              </span>
            </Button>
          </div>

          <ol class="pc-steps">
            <li v-for="step in steps" :key="step.title" class="pc-step">
              <b>{{ step.title }}</b>
              <p>{{ step.body }}</p>
            </li>
          </ol>

          <div style="margin-top: 14px">
            <InfoBar
              IsOpen="True"
              Title="不要放在 C:\Program Files"
              Message="那是受保护目录，Chrome 会报 rules.json: Internal error while parsing rules。放在自己的用户文件夹里就好。"
              Severity="Warning"
              :IsClosable="false"
            />
          </div>
        </section>

        <!-- faq -->
        <section v-else class="pc-section">
          <h2 class="pc-h2">常见问题</h2>
          <p class="pc-sub">点开看答案。</p>

          <div class="pc-faq">
            <Expander
              v-for="(item, index) in faq"
              :key="item.q"
              :Header="item.q"
              :IsExpanded="index === 0"
            >
              <p style="margin: 0">{{ item.a }}</p>
            </Expander>
          </div>

          <div style="margin-top: 16px">
            <InfoBar
              IsOpen="True"
              Title="文件校验"
              :Message="sha ? `当前 Release 的 SHA-256：${sha}` : 'SHA-256 见 Release 页面的 SHA256SUMS.txt'"
              Severity="Success"
              :IsClosable="false"
            />
          </div>
        </section>

        <footer class="pc-footer">
          <span>GPL-3.0 开源 · 非官方作品，与 PickCat 官方无关</span>
          <span>
            <a :href="REPO" target="_blank" rel="noopener">源码</a> ·
            <a :href="`${REPO}/releases`" target="_blank" rel="noopener">版本历史</a> ·
            <a :href="`${REPO}/blob/main/PRIVACY.md`" target="_blank" rel="noopener">隐私</a>
          </span>
          </footer>
        </div>
    </div>
  </div>
</template>

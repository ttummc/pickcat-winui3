import { connectBrowser, connectWs, sleep } from './cdp.mjs'

const EXT = 'C:\\Users\\tjh54\\Desktop\\PickCatButWinUI3OnWeb\\extension\\dist'
const OTHER = '01a0faca-3c45-7654-bea1-4147d7af5165'
const TOPIC = '01a13aa9-f1d1-7698-9cc7-3ef02c726284'
const WORK = '01a16c71-7fd6-75ae-9fa2-d0af927a3176'

const browser = await connectBrowser()
try {
  await browser.send('Extensions.loadUnpacked', { path: EXT })
} catch (err) {
  console.log('loadUnpacked:', err.message)
}
await sleep(1500)

const created = await browser.send('Target.createTarget', { url: `https://pickcat.dao3.fun/#/profile/${OTHER}` })
await sleep(9000)

const list = await (await fetch('http://127.0.0.1:9333/json/list')).json()
const cdp = await connectWs(list.find((t) => t.id === created.targetId).webSocketDebuggerUrl)
const errors = []
cdp.on('Runtime.exceptionThrown', (p) =>
  errors.push(String(p.exceptionDetails.exception?.description ?? '').split('\n')[0]),
)
await cdp.send('Runtime.enable')

const ev = async (expr) => (await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true })).result.value

/** What the address bar says vs what is actually rendered. */
const state = () =>
  ev(`JSON.stringify({
    hash: location.hash,
    root: !!document.getElementById('pickcat-root'),
    title: document.querySelector('#pickcat-root .pc-page-title')?.textContent?.trim() ?? null,
    who: document.querySelector('#pickcat-root .pc-profile-name')?.textContent?.trim() ?? null,
    cards: document.querySelectorAll('#pickcat-root .pc-card').length
  })`)

async function clickNav(label) {
  return ev(`(() => {
    const nodes = [...document.querySelectorAll('#pickcat-root [class*="navigation-view-item"], #pickcat-root [role="option"]')];
    const t = nodes.find(e => e.textContent.trim().startsWith(${JSON.stringify(label)}));
    if (!t) return 'not found (' + nodes.length + ' nodes)';
    t.click();
    return 'clicked';
  })()`)
}

console.log('start   :', await state())
console.log('click 我的主页:', await clickNav('我的主页'))
await sleep(2500)
console.log('after   :', await state())

await ev(`location.hash = '#/forum/post/${TOPIC}'`)
await sleep(3000)
console.log('\ntopic   :', await state())
console.log('click 论坛:', await clickNav('论坛'))
await sleep(2500)
console.log('after   :', await state())

await ev(`location.hash = '#/works/${WORK}'`)
await sleep(3000)
console.log('\nwork    :', await state())
console.log('click 作品:', await clickNav('作品'))
await sleep(2500)
console.log('after   :', await state())

await ev(`location.hash = '#/search?q=BOX'`)
await sleep(4000)
console.log('\nsearch  :', await state())
await ev(`location.hash = '#/search?q=%E7%81%B5%E5%B2%9B'`)
await sleep(4000)
console.log('query→灵岛:', await state())

console.log('\nerrors:', errors.slice(0, 3))
cdp.close()
browser.close()

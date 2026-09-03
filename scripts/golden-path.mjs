/**
 * End-to-end walk of the golden path, asserted rather than eyeballed. It is not part of CI — CI has no browser — but it is the
 * fastest way to confirm the demo still works after a change.
 *
 *   npm run dev                       # in one terminal
 *   npx playwright install chromium   # once
 *   npm run verify:golden             # in another
 *
 * Set PW_CHROMIUM to point at an existing Chromium if you have one.
 */
import { chromium } from 'playwright'

const OUT = process.argv[2] ?? '.'
await (await import('node:fs/promises')).mkdir(OUT, { recursive: true })
const browser = await chromium.launch(
  process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
)
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()) })

const step = async (name, fn) => {
  try { await fn(); console.log('  ok   ' + name) }
  catch (e) { console.log('  FAIL ' + name + ' :: ' + String(e).split('\n')[0]); throw e }
}

// 1. Login
await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' })
await step('sign in', async () => {
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL('**/dashboard')
})

// 2. The leadership huddle
await step('open the huddle', async () => {
  await page.goto('http://localhost:3000/huddle', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /Start the leadership huddle/ }).click()
  await page.waitForTimeout(600)
})

// 3. Attendance is by department, each spoken for by its head
await step('every department is listed with its head', async () => {
  const text = await page.locator('main').innerText()
  for (const department of ['Engineering', 'Product', 'Marketing', 'Sales']) {
    if (!text.includes(department)) throw new Error('missing department: ' + department)
  }
  if (!/4 \/ 4 present/.test(text)) throw new Error('expected 4 / 4 present, got ' + text.match(/\d+ \/ \d+ present/))
})

await step('mark Sales absent', async () => {
  await page.locator('button', { hasText: 'Sales' }).first().click()
  await page.waitForTimeout(300)
  const text = await page.locator('main').innerText()
  if (!/3 \/ 4 present/.test(text)) throw new Error('expected 3 / 4 present, got ' + text.match(/\d+ \/ \d+ present/))
})
await page.screenshot({ path: `${OUT}/gp-1-attendance.png` })

// 4. Start
await step('start the review', async () => {
  await page.getByRole('button', { name: 'Start huddle', exact: true }).click()
  await page.waitForTimeout(700)
})

// 5. Engineering leads, with blockers and backlog
await step('Engineering is reviewed first, blockers then backlog', async () => {
  const text = await page.locator('main').innerText()
  if (!text.includes('Engineering')) throw new Error('not reviewing Engineering')
  if (!/\d+ things? to discuss/.test(text)) throw new Error('no discussion headline')
  if (!/\d+ blocked · \d+ in backlog · \d+ items in total/.test(text)) throw new Error('no agenda breakdown')
})
await page.screenshot({ path: `${OUT}/gp-2-engineering.png` })

await step('backlog is capped, with the rest one click away', async () => {
  const more = page.getByRole('button', { name: /Show \d+ more backlog item/ })
  if ((await more.count()) === 0) throw new Error('backlog was not capped')
  await more.first().click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: 'Show fewer' }).click()
  await page.waitForTimeout(200)
})

// 6. Payment API is blocked and selected
await step('Payment API shows blocked and names what it waits for', async () => {
  await page.locator('div[role="button"]', { hasText: 'Payment API' }).first().click()
  await page.waitForTimeout(400)
  const panel = await page.locator('aside').last().innerText()
  if (!/Payment API/.test(panel)) throw new Error('discussion panel not on Payment API')
  if (!/Waiting for ENG-120/.test(panel)) throw new Error('no ENG-120 waiting reason: ' + panel.slice(0, 300))
})

// 7. Record why + decision
await step('record why and decision', async () => {
  const panel = page.locator('aside').last()
  await panel.getByPlaceholder('Waiting for Finance credentials.').fill('Provider has not issued production credentials yet.')
  await panel.getByPlaceholder('Finance will provide credentials today.').fill('Finance confirmed issuance today; Karthik to chase.')
  await panel.getByPlaceholder('Finance will provide credentials today.').blur()
  await page.waitForTimeout(400)
})

// 8. Create an action
await step('create an action', async () => {
  const panel = page.locator('aside').last()
  await panel.getByPlaceholder('Follow up with Finance at 2pm').fill('Follow up with Finance at 2pm')
  await panel.getByRole('button', { name: 'Add', exact: true }).click()
  await page.waitForTimeout(400)
})
await page.screenshot({ path: `${OUT}/gp-3-discussion.png` })

// 9. THE MOMENT: mark the blocker Done, watch the cascade
await step('open ENG-120 from the dependency panel', async () => {
  const panel = page.locator('aside').last()
  await panel.locator('button', { hasText: 'ENG-120' }).first().click()
  await page.waitForTimeout(700)
})

await step('set ENG-120 to Done', async () => {
  const drawer = page.locator('[data-slot="sheet-content"]')
  await drawer.getByRole('button', { name: /^Status:/ }).click()
  await page.waitForTimeout(300)
  await page.locator('[data-slot="command-item"]', { hasText: 'Done' }).first().click()
  await page.waitForTimeout(600)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)
})

await step('ENG-124 is now unblocked, in place', async () => {
  const body = await page.locator('main').innerText()
  if (/Waiting for ENG-120/.test(body)) throw new Error('ENG-124 still waiting on ENG-120')
  if (!/Unblocked/.test(body)) throw new Error('no Unblocked state after resolving ENG-120')
})
await page.screenshot({ path: `${OUT}/gp-4-unblocked.png` })

// 10. Walk the remaining departments and finish
await step('walk the remaining departments to the summary', async () => {
  for (let index = 0; index < 4; index += 1) {
    const finish = page.getByRole('button', { name: /Finish/ })
    if ((await finish.count()) > 0) {
      await finish.click()
      break
    }
    await page.getByRole('button', { name: /^Next/ }).click()
    await page.waitForTimeout(500)
  }
  await page.waitForTimeout(700)
  const text = await page.locator('main').innerText()
  if (!/Leadership Huddle/.test(text)) throw new Error('not on the summary')
  // Case-insensitive: these headings are uppercased in CSS, so innerText
  // returns them shouting.
  if (!/actions/i.test(text)) throw new Error('summary has no actions section')
  if (!/follow up with finance/i.test(text)) throw new Error('the action created earlier is missing from the summary')
  if (!/decisions/i.test(text)) throw new Error('summary has no decisions section')
})
await page.screenshot({ path: `${OUT}/gp-5-summary.png` })

console.log(errors.length ? '\nERRORS:\n' + errors.slice(0, 8).join('\n') : '\nno console errors')
await browser.close()

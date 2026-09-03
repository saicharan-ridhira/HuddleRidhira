/**
 * End-to-end walk of the golden path (PRD §53), asserted rather than
 * eyeballed. It is not part of CI — CI has no browser — but it is the
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

// 2. Engineering huddle
await step('open huddle', async () => {
  await page.goto('http://localhost:3000/departments/engineering/huddle', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /Start Engineering huddle/ }).click()
  await page.waitForTimeout(500)
})

// 3. Attendance: mark Karthik absent
await step('mark Karthik absent', async () => {
  await page.getByRole('button', { name: /Karthik Iyer/ }).click()
  await page.waitForTimeout(300)
  const text = await page.locator('text=/\\d+ \\/ \\d+ present/').first().innerText()
  if (!text.includes('9 / 10')) throw new Error('expected 9 / 10 present, got ' + text)
})
await page.screenshot({ path: `${OUT}/gp-1-attendance.png` })

// 4. Start
await step('start huddle', async () => {
  await page.getByRole('button', { name: 'Start huddle', exact: true }).click()
  await page.waitForTimeout(600)
})

// 5. Sai: 3 things to discuss
await step('Sai shows 3 things to discuss', async () => {
  const heading = await page.locator('h3', { hasText: 'to discuss' }).first().innerText()
  if (!heading.startsWith('3 things')) throw new Error('expected "3 things to discuss", got: ' + heading)
  const total = await page.locator('text=/\\d+ items in total/').first().innerText()
  if (!total.startsWith('23 ')) throw new Error('expected 23 items in total, got ' + total)
})
await page.screenshot({ path: `${OUT}/gp-2-sai.png` })

// 6. Show all expander
await step('show all 23 expands', async () => {
  await page.getByRole('button', { name: /Show all 23 item/ }).click()
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: 'Show fewer' }).click()
  await page.waitForTimeout(300)
})

// 7. Payment API is blocked and selected
await step('Payment API shows blocked + waiting reason', async () => {
  const panel = page.locator('aside').last()
  const txt = await panel.innerText()
  if (!/Payment API/.test(txt)) throw new Error('discussion panel not showing Payment API: ' + txt.slice(0, 200))
  if (!/Waiting for ENG-120/.test(txt)) throw new Error('no ENG-120 waiting reason: ' + txt.slice(0, 300))
})

// 8. Record why + decision
await step('record why and decision', async () => {
  const panel = page.locator('aside').last()
  await panel.getByPlaceholder('Waiting for Finance credentials.').fill('Provider has not issued production credentials yet.')
  await panel.getByPlaceholder('Finance will provide credentials today.').fill('Finance confirmed issuance today; Karthik to chase.')
  await panel.getByPlaceholder('Finance will provide credentials today.').blur()
  await page.waitForTimeout(400)
})

// 9. Create an action
await step('create action', async () => {
  const panel = page.locator('aside').last()
  await panel.getByPlaceholder('Follow up with Finance at 2pm').fill('Follow up with Finance at 2pm')
  await panel.getByRole('button', { name: 'Add', exact: true }).click()
  await page.waitForTimeout(400)
})
await page.screenshot({ path: `${OUT}/gp-3-discussion.png` })

// 10. THE MOMENT: set ENG-120 to Done from inside the huddle, watch ENG-124 unblock
await step('open ENG-120 via dependency panel', async () => {
  const panel = page.locator('aside').last()
  await panel.locator('button', { hasText: 'ENG-120' }).first().click()
  await page.waitForTimeout(700)
})

await step('set ENG-120 Done in the drawer', async () => {
  const drawer = page.locator('[data-slot="sheet-content"]')
  await drawer.getByRole('button', { name: /^Status:/ }).click()
  await page.waitForTimeout(300)
  await page.getByRole('option', { name: 'Done' }).click().catch(async () => {
    await page.locator('[data-slot="command-item"]', { hasText: 'Done' }).first().click()
  })
  await page.waitForTimeout(600)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)
})

await step('ENG-124 is now unblocked in the huddle', async () => {
  const body = await page.locator('main').innerText()
  if (/Waiting for ENG-120/.test(body)) throw new Error('ENG-124 still shows as waiting for ENG-120')
  if (!/Unblocked/.test(body)) throw new Error('no Unblocked state shown after resolving ENG-120')
})
await page.screenshot({ path: `${OUT}/gp-4-unblocked.png` })

console.log(errors.length ? '\nERRORS:\n' + errors.slice(0, 8).join('\n') : '\nno console errors')
await browser.close()

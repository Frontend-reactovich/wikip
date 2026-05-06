import { expect, test } from '@playwright/test'

test('статья A -> сосед -> B -> назад', async ({ page }) => {
  await page.goto('/wiki/p471913')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Машинное обучение',
  )

  const neighborLinks = page.locator('.wiki-html a[data-in-cluster="true"]')
  const count = await neighborLinks.count()
  let clicked = false
  for (let i = 0; i < count; i++) {
    const link = neighborLinks.nth(i)
    const href = (await link.getAttribute('href')) ?? ''
    if (href.includes('Машинное_обучение')) continue
    await link.click()
    clicked = true
    break
  }
  expect(clicked).toBeTruthy()

  await expect(page).toHaveURL(/\/wiki\/p\d+$/)
  await expect(page.getByRole('heading', { level: 1 })).not.toHaveText(
    'Машинное обучение',
  )

  await page.getByRole('button', { name: 'Назад' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Машинное обучение',
  )
})

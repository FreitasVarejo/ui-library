// Screenshots da vitrine: cada item, em cada tema, claro e escuro, em largura
// desktop e celular. Também confere o que só um navegador mostra (foco do
// diálogo, Sheet no celular, barra lateral recolhida, estouro horizontal,
// erros de console). Saída: .screenshots/ (no .gitignore).
//
//   npm run screenshots
//   npm run screenshots -- --consumer /caminho/do/projeto   (também fotografa
//   um projeto consumidor, ex.: o que o `KEEP=1 scripts/consume.sh` deixou)
import { spawn } from "node:child_process"
import { mkdirSync, readdirSync, rmSync } from "node:fs"
import { join, resolve } from "node:path"
import { chromium } from "playwright"
import { createServer } from "vite"

const root = resolve(import.meta.dirname, "..")
const out = join(root, ".screenshots")
const brands = readdirSync(join(root, "brands"))
  .filter((file) => file.endsWith(".json"))
  .map((file) => file.replace(/\.json$/, ""))
const modes = ["light", "dark"]
const viewports = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 390, height: 844 },
]

const consumerArg = process.argv.indexOf("--consumer")
const consumer = consumerArg > -1 ? process.argv[consumerArg + 1] : undefined

rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })

const failures = []
const check = (ok, message) => {
  if (!ok) failures.push(message)
}

const server = await createServer({
  root,
  logLevel: "error",
  server: { port: 0, host: "127.0.0.1" },
})
await server.listen()
const base = `http://127.0.0.1:${server.httpServer.address().port}/`

const browser = await chromium.launch()
const files = []

async function open(context, label, query) {
  const page = await context.newPage()
  page.on("console", (message) => {
    if (message.type() === "error")
      failures.push(`${label}: console: ${message.text()}`)
  })
  page.on("pageerror", (error) => failures.push(`${label}: ${error.message}`))
  await page.goto(`${base}?${new URLSearchParams(query)}`)
  await page.evaluate(() => document.fonts.ready)
  return page
}

async function shot(page, name, options = {}) {
  const file = join(out, `${name}.png`)
  await page.screenshot({ path: file, ...options })
  files.push(file)
}

async function noOverflow(page, label) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  )
  check(overflow <= 0, `${label}: rolagem horizontal de ${overflow}px`)
}

for (const brand of brands) {
  for (const mode of modes) {
    for (const viewport of viewports) {
      const tag = `${brand}-${mode}-${viewport.name}`
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        locale: "pt-BR",
        reducedMotion: "reduce",
      })
      const common = { brand, mode }

      // app-shell em tela cheia
      let page = await open(context, `${tag} app-shell`, {
        ...common,
        preview: "app-shell",
        path: "/library",
      })
      await shot(page, `${tag}--app-shell`)
      await noOverflow(page, `${tag} app-shell`)
      check(
        (await page.evaluate(() => document.documentElement.dataset.brand)) ===
          brand,
        `${tag}: data-brand não aplicado`
      )

      if (viewport.name === "desktop") {
        await page.keyboard.press("Control+b")
        await page.waitForSelector(
          '[data-slot="sidebar"][data-state="collapsed"]'
        )
        await page.waitForTimeout(500)
        await shot(page, `${tag}--app-shell-collapsed`)
        await page.keyboard.press("Control+b")
        await page.waitForSelector(
          '[data-slot="sidebar"][data-state="expanded"]'
        )
      } else {
        check(
          (await page
            .locator('[data-slot="sidebar"][data-mobile="true"]')
            .count()) === 0,
          `${tag}: Sheet aberto sem clicar`
        )
        await page
          .getByRole("button", { name: "Alternar barra lateral" })
          .click()
        await page.waitForSelector('[data-slot="sidebar"][data-mobile="true"]')
        await page.waitForTimeout(300)
        await shot(page, `${tag}--app-shell-sheet`)
        await page.keyboard.press("Escape")
        await page.waitForSelector(
          '[data-slot="sidebar"][data-mobile="true"]',
          {
            state: "detached",
          }
        )
      }
      await page.getByRole("button", { name: "Menu do usuário" }).click()
      await page.getByRole("menuitem", { name: "Sair" }).waitFor()
      await page.waitForTimeout(200)
      await shot(page, `${tag}--app-shell-user-menu`)
      await page.close()

      // vitrine: estados, feedback, tema
      page = await open(context, `${tag} states`, { ...common, item: "states" })
      check(
        (await page.locator('[role="status"][aria-busy="true"]').count()) === 4,
        `${tag}: esperava 4 regiões de carregamento`
      )
      check(
        (await page.locator('[role="alert"]').count()) >= 2,
        `${tag}: esperava erros anunciados`
      )
      await noOverflow(page, `${tag} states`)
      await shot(page, `${tag}--states`, { fullPage: true })
      await page.close()

      page = await open(context, `${tag} theme`, { ...common, item: "theme" })
      await noOverflow(page, `${tag} theme`)
      await shot(page, `${tag}--theme`, { fullPage: true })
      await page.close()

      page = await open(context, `${tag} feedback`, {
        ...common,
        item: "feedback",
      })
      await noOverflow(page, `${tag} feedback`)
      await page.getByRole("button", { name: "Sucesso" }).click()
      await page.getByRole("button", { name: "Erro", exact: true }).click()
      await page.getByRole("button", { name: "Com desfazer" }).click()
      await page.getByText("Documento arquivado").waitFor()
      await page.waitForTimeout(600)
      await shot(page, `${tag}--feedback-toasts`)

      await page.getByRole("button", { name: "Excluir (componente)" }).click()
      const cancel = page.getByRole("button", { name: "Cancelar" })
      await cancel.waitFor()
      await page.waitForTimeout(250)
      check(
        await cancel.evaluate((element) => element === document.activeElement),
        `${tag}: foco inicial do diálogo não está em Cancelar`
      )
      const confirmClass = await page
        .getByRole("button", { name: "Excluir", exact: true })
        .getAttribute("class")
      check(
        confirmClass?.includes("text-destructive"),
        `${tag}: botão de confirmar sem o token destructive`
      )
      await shot(page, `${tag}--feedback-confirm`)
      await page.keyboard.press("Escape")
      await page.close()
      await context.close()
    }
  }
}

// troca de tema em tempo de execução, na mesma página (sem recarregar)
{
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  })
  const page = await open(context, "troca ao vivo", { item: "theme" })
  const before = await page.evaluate(() =>
    getComputedStyle(document.documentElement)
      .getPropertyValue("--radius")
      .trim()
  )
  await page.locator("select").selectOption("editorial")
  const after = await page.evaluate(() =>
    getComputedStyle(document.documentElement)
      .getPropertyValue("--radius")
      .trim()
  )
  check(
    before === "0.625rem" && after === "0rem",
    `troca ao vivo: --radius ${before} -> ${after}`
  )
  await context.close()
}

if (consumer) {
  const dev = spawn(
    "npx",
    ["vite", "--host", "127.0.0.1", "--port", "5399", "--strictPort"],
    {
      cwd: consumer,
      stdio: "ignore",
    }
  )
  try {
    await new Promise((resolveWait) => setTimeout(resolveWait, 4000))
    for (const mode of modes) {
      for (const viewport of viewports) {
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
        })
        const page = await context.newPage()
        await page.emulateMedia({ colorScheme: mode })
        await page.addInitScript(
          (value) => localStorage.setItem("theme", value),
          mode
        )
        await page.goto("http://127.0.0.1:5399/")
        await page.waitForTimeout(800)
        await shot(page, `consumidor-${mode}-${viewport.name}`, {
          fullPage: true,
        })
        await context.close()
      }
    }
  } finally {
    dev.kill()
  }
}

await browser.close()
await server.close()

console.log(`${files.length} screenshots em ${out}`)
for (const file of files) console.log(file)
if (failures.length > 0) {
  console.error(`\n${failures.length} problema(s):`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}
console.log("conferências do navegador: ok")

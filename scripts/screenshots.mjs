// Screenshots da vitrine: cada item, em cada tema, claro e escuro, em largura
// desktop e celular. Também confere o que só um navegador mostra (foco do
// diálogo, Sheet no celular, barra lateral recolhida, estouro horizontal,
// erros de console, paleta de comandos que abre com o atalho e foca a busca,
// fila de envios e log que segue o fim). Saída: .screenshots/ (no .gitignore).
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
      // paleta de comandos no cabeçalho: abre com o atalho e foca a busca
      check(
        (await page.getByRole("dialog").count()) === 0,
        `${tag}: paleta aberta sem acionar`
      )
      await page.keyboard.press("Control+k")
      await page.getByRole("dialog").waitFor()
      await page.waitForTimeout(250)
      check(
        await page
          .getByRole("combobox")
          .evaluate((element) => element === document.activeElement),
        `${tag}: a paleta não focou o campo de busca ao abrir`
      )
      await noOverflow(page, `${tag} app-shell com a paleta`)
      await shot(page, `${tag}--app-shell-palette`)
      await page.keyboard.press("Escape")
      await page.getByRole("dialog").waitFor({ state: "detached" })
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
      // foco (Tab): contorno sólido de 2px na cor --ring; desabilitado sem
      // opacidade, com o par de tokens --disabled/--disabled-foreground
      const resolve = (name, property) =>
        page.evaluate(
          ([token, prop]) => {
            const probe = document.createElement("span")
            probe.style[prop] = `var(--${token})`
            document.body.append(probe)
            const value = getComputedStyle(probe)[prop]
            probe.remove()
            return value
          },
          [name, property]
        )
      const defaultButton = page
        .getByRole("button", { name: "default", exact: true })
        .first()
      let focused = false
      for (let step = 0; step < 40 && !focused; step++) {
        await page.keyboard.press("Tab")
        focused = await defaultButton.evaluate(
          (element) => element === document.activeElement
        )
      }
      check(focused, `${tag}: o teclado (Tab) não chegou ao botão`)
      // o botão tem `transition-all`: espera o contorno chegar ao valor final
      await page.waitForTimeout(400)
      const outline = await defaultButton.evaluate((element) => {
        const style = getComputedStyle(element)
        return {
          style: style.outlineStyle,
          width: style.outlineWidth,
          offset: style.outlineOffset,
          color: style.outlineColor,
        }
      })
      check(
        outline.style === "solid" &&
          outline.width === "2px" &&
          outline.offset === "2px" &&
          outline.color === (await resolve("ring", "color")),
        `${tag}: foco sem contorno sólido de 2px em --ring (${JSON.stringify(outline)})`
      )
      await shot(page, `${tag}--theme-focus`, { fullPage: true })
      const off = page
        .getByRole("button", { name: "default", exact: true })
        .nth(1)
      const disabledStyle = await off.evaluate((element) => {
        const style = getComputedStyle(element)
        return {
          opacity: style.opacity,
          background: style.backgroundColor,
          color: style.color,
        }
      })
      check(
        disabledStyle.opacity === "1" &&
          disabledStyle.background ===
            (await resolve("disabled", "backgroundColor")) &&
          disabledStyle.color ===
            (await resolve("disabled-foreground", "color")),
        `${tag}: botão desabilitado fora do par de tokens (${JSON.stringify(disabledStyle)})`
      )
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

      // botão destrutivo suave em hover: fundo --destructive-soft-hover e
      // borda vermelha de 1px (só onde há hover)
      const softButton = page.getByRole("button", {
        name: "Excluir (componente)",
      })
      await softButton.hover()
      await page.waitForTimeout(400)
      const soft = await softButton.evaluate((element) => {
        const style = getComputedStyle(element)
        return {
          border: style.borderTopColor,
          width: style.borderTopWidth,
          background: style.backgroundColor,
        }
      })
      check(
        soft.width === "1px" &&
          soft.border === (await resolve("destructive", "color")) &&
          soft.background ===
            (await resolve("destructive-soft-hover", "backgroundColor")),
        `${tag}: destrutivo suave em hover sem borda e fundo do tema (${JSON.stringify(soft)})`
      )
      await shot(page, `${tag}--feedback-soft-hover`)
      await page.mouse.move(0, 0)
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
        confirmClass?.includes("bg-destructive") &&
          confirmClass.includes("text-destructive-foreground"),
        `${tag}: botão de confirmar sem os tokens destructive`
      )
      await shot(page, `${tag}--feedback-confirm`)
      await page.keyboard.press("Escape")
      await page.close()

      // data-table: facetas com contagem, seleção com barra de lote, modo server
      page = await open(context, `${tag} data-table`, {
        ...common,
        item: "data-table",
      })
      await noOverflow(page, `${tag} data-table`)
      const clientTable = page.locator('[data-slot="data-table"]').first()
      check(
        (await clientTable.getByRole("row").count()) === 11,
        `${tag}: modo client esperava cabeçalho + 10 linhas`
      )
      await shot(page, `${tag}--data-table`, { fullPage: true })
      await clientTable.getByRole("button", { name: /^Tipo\s*\d*$/ }).click()
      await page.getByRole("menuitemcheckbox", { name: /PDF/ }).click()
      check(
        (
          await page
            .getByRole("menuitemcheckbox", { name: /PDF/ })
            .textContent()
        )?.match(/\d+/) !== null,
        `${tag}: faceta sem contagem`
      )
      await page.waitForTimeout(200)
      await shot(page, `${tag}--data-table-facet`)
      await page.keyboard.press("Escape")
      await clientTable.getByRole("checkbox").nth(1).click()
      await clientTable.getByRole("checkbox").nth(2).click()
      await clientTable.getByRole("region", { name: "Ações em lote" }).waitFor()
      await shot(page, `${tag}--data-table-bulk`)
      await clientTable.getByRole("button", { name: "Excluir" }).click()
      const bulkCancel = page.getByRole("button", { name: "Cancelar" })
      await bulkCancel.waitFor()
      await page.waitForTimeout(250)
      check(
        await bulkCancel.evaluate((el) => el === document.activeElement),
        `${tag}: foco da confirmação em lote não está em Cancelar`
      )
      await page.keyboard.press("Escape")
      await noOverflow(page, `${tag} data-table com barra`)
      await page.close()

      // search-results: destaque com <mark>, filtros em Sheet no celular
      page = await open(context, `${tag} search-results`, {
        ...common,
        item: "search-results",
      })
      await page
        .getByText(/resultados? para/)
        .first()
        .waitFor()
      await noOverflow(page, `${tag} search-results`)
      check(
        (await page.locator("mark").count()) >= 2,
        `${tag}: busca sem trecho destacado`
      )
      const liveSearch = page.locator('[data-slot="search-results"]').first()
      const sideFilters = page
        .getByRole("complementary", { name: "Filtros" })
        .first()
      if (viewport.name === "mobile") {
        check(
          !(await sideFilters.isVisible()),
          `${tag}: filtros laterais visíveis no celular`
        )
        await liveSearch.getByRole("button", { name: /^Filtros/ }).click()
        await page.getByRole("dialog").waitFor()
        await page.waitForTimeout(350)
        await shot(page, `${tag}--search-results-filters-sheet`)
        await page.getByRole("checkbox", { name: /DOCX/ }).click()
        await page.keyboard.press("Escape")
        await page.getByRole("dialog").waitFor({ state: "detached" })
        await noOverflow(page, `${tag} search-results após o Sheet`)
      } else {
        check(
          await sideFilters.isVisible(),
          `${tag}: filtros laterais ausentes no desktop`
        )
        check(
          (await liveSearch
            .getByRole("button", { name: /^Filtros/ })
            .count()) === 0,
          `${tag}: botão de filtros visível no desktop`
        )
      }
      await shot(page, `${tag}--search-results`, { fullPage: true })
      await page.close()

      // detail-page: painel lateral desce no celular; destrutiva confirma
      page = await open(context, `${tag} detail-page`, {
        ...common,
        item: "detail-page",
      })
      await noOverflow(page, `${tag} detail-page`)
      const content = page.getByText("O prazo de vigência").first()
      const asideBox = await page
        .getByRole("complementary", { name: "Detalhes" })
        .first()
        .boundingBox()
      const contentBox = await content.boundingBox()
      if (viewport.name === "mobile")
        check(
          asideBox.y > contentBox.y + contentBox.height,
          `${tag}: painel lateral não desceu para baixo do conteúdo`
        )
      else
        check(
          asideBox.x > contentBox.x + contentBox.width,
          `${tag}: painel lateral não ficou ao lado do conteúdo`
        )
      await shot(page, `${tag}--detail-page`, { fullPage: true })
      await page.getByRole("button", { name: "Mais ações" }).first().click()
      await page.getByRole("menuitem", { name: "Excluir documento" }).click()
      const detailCancel = page.getByRole("button", { name: "Cancelar" })
      await detailCancel.waitFor()
      await page.waitForTimeout(250)
      check(
        await detailCancel.evaluate((el) => el === document.activeElement),
        `${tag}: foco da confirmação não está em Cancelar`
      )
      await shot(page, `${tag}--detail-page-confirm`)
      await page.close()

      // entity-form: erro por campo, erro geral e aviso no Sheet
      page = await open(context, `${tag} entity-form`, {
        ...common,
        item: "entity-form",
      })
      await noOverflow(page, `${tag} entity-form`)
      await page.getByRole("button", { name: "Salvar" }).first().click()
      await page
        .getByText("O título precisa de ao menos 3 caracteres.")
        .waitFor()
      check(
        (await page.locator('[data-slot="field-error"]').count()) >= 2,
        `${tag}: esperava erro em mais de um campo`
      )
      check(
        await page
          .getByLabel("Título")
          .first()
          .evaluate((el) => el === document.activeElement),
        `${tag}: foco não foi para o primeiro campo inválido`
      )
      await shot(page, `${tag}--entity-form-errors`, { fullPage: true })
      await page.getByRole("button", { name: "Erro geral" }).click()
      await page.getByLabel("Título").first().fill("Contrato")
      await page.getByLabel("E-mail do autor").first().fill("ana@exemplo.com")
      await page.getByRole("combobox", { name: "Tipo" }).click()
      await page.getByRole("option", { name: "PDF" }).click()
      await page.getByRole("button", { name: "Salvar" }).first().click()
      await page.getByRole("button", { name: "Salvando…" }).waitFor()
      await page.getByText("O servidor não respondeu.").waitFor()
      await shot(page, `${tag}--entity-form-general-error`, { fullPage: true })
      await page.getByRole("button", { name: "Novo documento" }).click()
      await page.getByRole("dialog").waitFor()
      await page.getByRole("dialog").getByLabel("Título").fill("Rascunho")
      await page.keyboard.press("Escape")
      await page.getByRole("alertdialog").waitFor()
      await page.waitForTimeout(300)
      check(
        await page.locator('[data-slot="sheet-content"]').first().isVisible(),
        `${tag}: o Sheet fechou apesar das alterações`
      )
      await shot(page, `${tag}--entity-form-sheet-discard`)
      await page.close()

      // file-upload: validação por arquivo, fila com limite, erro, cancelar
      page = await open(context, `${tag} file-upload`, {
        ...common,
        item: "file-upload",
      })
      await noOverflow(page, `${tag} file-upload`)
      const upload = page.locator('[data-slot="file-upload"]').first()
      const fileInput = upload.locator('input[type="file"]')
      let reached = false
      for (let step = 0; step < 40 && !reached; step++) {
        await page.keyboard.press("Tab")
        reached = await fileInput.evaluate(
          (element) => element === document.activeElement
        )
      }
      check(reached, `${tag}: o teclado (Tab) não chega ao campo de arquivo`)
      const bytes = (kb) => Buffer.alloc(kb * 1024, "x")
      await fileInput.setInputFiles([
        {
          name: "contrato.pdf",
          mimeType: "application/pdf",
          buffer: bytes(120),
        },
        {
          name: "ata-erro.pdf",
          mimeType: "application/pdf",
          buffer: bytes(80),
        },
        {
          name: "manual.docx",
          mimeType: "application/octet-stream",
          buffer: bytes(300),
        },
        { name: "planta.png", mimeType: "image/png", buffer: bytes(50) },
        {
          name: "instalador.exe",
          mimeType: "application/octet-stream",
          buffer: bytes(10),
        },
        {
          name: "video-grande.pdf",
          mimeType: "application/pdf",
          buffer: bytes(3 * 1024),
        },
      ])
      await upload
        .getByText("Tipo não aceito. Use: .pdf, .docx, .png.")
        .waitFor()
      await upload.getByText(/O máximo é 2 MB|o máximo é 2 MB/).waitFor()
      check(
        (await upload.getByRole("listitem").count()) === 6,
        `${tag}: esperava 6 itens na fila`
      )
      await upload.getByRole("progressbar").first().waitFor()
      check(
        (await upload.getByRole("progressbar").count()) === 2,
        `${tag}: esperava 2 envios simultâneos (limite 2)`
      )
      check(
        (await upload.getByText("Aguardando", { exact: true }).count()) === 2,
        `${tag}: esperava 2 arquivos aguardando`
      )
      await page.waitForTimeout(500)
      await shot(page, `${tag}--file-upload-uploading`, { fullPage: true })
      await upload
        .getByText("O servidor recusou o arquivo.")
        .waitFor({ timeout: 15000 })
      await upload
        .getByRole("button", { name: "Tentar de novo ata-erro.pdf" })
        .waitFor()
      await upload
        .locator('[data-status="done"]')
        .nth(2)
        .waitFor({ timeout: 20000 })
      await noOverflow(page, `${tag} file-upload com a fila`)
      await shot(page, `${tag}--file-upload-done`, { fullPage: true })
      await upload
        .getByRole("button", { name: "Tentar de novo ata-erro.pdf" })
        .click()
      await upload
        .getByRole("button", { name: "Cancelar o envio de ata-erro.pdf" })
        .click()
      await upload.locator('[data-status="cancelled"]').waitFor()
      await shot(page, `${tag}--file-upload-cancelled`, { fullPage: true })
      await page.close()

      // jobs-panel: filtro com contagem, log que segue o fim, rolar para cima
      page = await open(context, `${tag} jobs-panel`, {
        ...common,
        item: "jobs-panel",
      })
      await noOverflow(page, `${tag} jobs-panel`)
      const panel = page.locator('[data-slot="jobs-panel"]').first()
      const rows = panel.locator('[data-slot="job-row"]')
      check((await rows.count()) === 6, `${tag}: esperava 6 jobs`)
      await panel.getByRole("button", { name: /^Falhou\s*1$/ }).click()
      check(
        (await rows.count()) === 1,
        `${tag}: o filtro Falhou devia deixar 1 job`
      )
      await panel.getByRole("button", { name: /^Todos\s*6$/ }).click()
      await shot(page, `${tag}--jobs-panel`, { fullPage: true })
      await panel.getByRole("button", { name: "Ver log" }).first().click()
      const log = panel.getByRole("region", { name: /^Log do job/ }).first()
      await log.waitFor()
      const atEnd = () =>
        log.evaluate(
          (element) =>
            element.scrollHeight - element.scrollTop - element.clientHeight <= 8
        )
      check(await atEnd(), `${tag}: o log não abriu no fim`)
      await noOverflow(page, `${tag} jobs-panel com o log`)
      await shot(page, `${tag}--jobs-panel-log`, { fullPage: true })
      await log.evaluate((element) => {
        element.scrollTop = 0
        element.dispatchEvent(new Event("scroll"))
      })
      await page.getByRole("button", { name: "Simular andamento" }).click()
      await page.waitForTimeout(2200)
      check(
        (await log.evaluate((element) => element.scrollTop)) === 0,
        `${tag}: o log foi puxado para o fim depois de a pessoa rolar para cima`
      )
      await panel.getByRole("button", { name: "Ir para o fim" }).click()
      await page.waitForTimeout(100)
      check(await atEnd(), `${tag}: "Ir para o fim" não levou ao fim do log`)
      await page.close()

      // command-palette: atalho, foco, filtro, carregando, erro, resultado, teclado
      page = await open(context, `${tag} command-palette`, {
        ...common,
        item: "command-palette",
      })
      await noOverflow(page, `${tag} command-palette`)
      check(
        (await page.getByRole("dialog").count()) === 0,
        `${tag}: paleta aberta sem acionar`
      )
      await page.keyboard.press("Control+k")
      const palette = page.getByRole("dialog")
      await palette.waitFor()
      await page.waitForTimeout(250)
      const searchField = page.getByRole("combobox")
      check(
        await searchField.evaluate(
          (element) => element === document.activeElement
        ),
        `${tag}: a paleta não focou o campo de busca ao abrir`
      )
      await noOverflow(page, `${tag} command-palette aberta`)
      await shot(page, `${tag}--command-palette`)
      await page.keyboard.type("lento")
      await palette.getByText("Buscando…").waitFor()
      await shot(page, `${tag}--command-palette-loading`)
      await searchField.fill("falha")
      await palette.getByText("Não foi possível buscar agora.").waitFor()
      await searchField.fill("zeppelin")
      await palette.getByText("Nada encontrado.").waitFor()
      await shot(page, `${tag}--command-palette-empty`)
      await searchField.fill("ata")
      await palette.getByText("Resultados", { exact: true }).waitFor()
      check(
        (await palette.getByRole("option").count()) >= 1,
        `${tag}: busca assíncrona sem resultado`
      )
      await shot(page, `${tag}--command-palette-results`)
      await page.keyboard.press("ArrowDown")
      await page.keyboard.press("Enter")
      await palette.waitFor({ state: "detached" })
      await page.getByText(/Último comando: /).waitFor()
      // pelo gatilho, e Esc fecha
      await page.getByRole("button", { name: "Buscar" }).click()
      await palette.waitFor()
      await page.keyboard.press("Escape")
      await palette.waitFor({ state: "detached" })
      await page.close()

      // sheet: foco ao abrir no título e de volta ao botão ao fechar; pilha
      // (só a de cima responde ao Esc e tem o backGuard); sem onOpenChange não fecha
      page = await open(context, `${tag} sheet`, { ...common, item: "sheet" })
      await noOverflow(page, `${tag} sheet`)
      const sheets = page.getByRole("dialog")
      check((await sheets.count()) === 0, `${tag}: sheet aberta sem acionar`)
      const closeCall = page.getByRole("button", { name: "Fechar a chamada" })
      await closeCall.click()
      await sheets.waitFor()
      check(
        await sheets
          .getByRole("heading", { name: "Fechar a chamada?" })
          .evaluate((element) => element === document.activeElement),
        `${tag}: a sheet não focou o título ao abrir`
      )
      await shot(page, `${tag}--sheet`)
      await page.keyboard.press("Escape")
      await sheets.waitFor({ state: "detached" })
      check(
        await closeCall.evaluate(
          (element) => element === document.activeElement
        ),
        `${tag}: o foco não voltou ao botão que abriu a sheet`
      )
      await page.getByRole("button", { name: "Abrir a folha da aula" }).click()
      const lessonSheet = sheets.first()
      await lessonSheet.waitFor()
      const enlarge = lessonSheet.getByRole("button", {
        name: "Ampliar a foto",
      })
      await enlarge.click()
      await page.waitForFunction(
        () => document.querySelectorAll('[role="dialog"]').length === 2
      )
      check(
        (await page.getByText("backGuards montados: 1").count()) === 1,
        `${tag}: o backGuard não está só na sheet de cima`
      )
      await shot(page, `${tag}--sheet-stack`)
      await page.keyboard.press("Escape")
      await page.waitForFunction(
        () => document.querySelectorAll('[role="dialog"]').length === 1
      )
      check(
        await enlarge.evaluate((element) => element === document.activeElement),
        `${tag}: o foco não voltou à miniatura que abriu a sheet de cima`
      )
      await page.keyboard.press("Escape")
      await sheets.waitFor({ state: "detached" })
      await page.getByRole("button", { name: "Fazer a pergunta" }).click()
      await sheets.waitFor()
      await shot(page, `${tag}--sheet-locked`)
      await page.keyboard.press("Escape")
      await page.waitForTimeout(300)
      check(
        (await sheets.count()) === 1,
        `${tag}: a sheet sem onOpenChange fechou com o Esc`
      )
      await page.getByRole("button", { name: "Responder" }).click()
      await sheets.waitFor({ state: "detached" })
      await noOverflow(page, `${tag} sheet após fechar`)
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

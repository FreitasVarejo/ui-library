// Pré-carga (node --import) que serve este repo como se fosse
// github.com/FreitasVarejo/ui, sem push. Cobre o que o CLI do shadcn lê de um
// registry no modo GitHub anônimo:
//   - resolução de ref: `git ls-remote https://github.com/FreitasVarejo/ui.git`
//     (o consume.sh redireciona a URL para o repo local com GIT_CONFIG_*);
//   - leitura de arquivo: fetch de
//     https://raw.githubusercontent.com/FreitasVarejo/ui/<sha>/<caminho>,
//     que aqui sai da árvore de trabalho em FAKE_GITHUB_ROOT (inclui o que
//     ainda não foi commitado).
// Qualquer outro fetch passa para o fetch real.
import { readFile } from "node:fs/promises"
import { join, normalize } from "node:path"

const root = process.env.FAKE_GITHUB_ROOT
const prefix = "https://raw.githubusercontent.com/FreitasVarejo/ui/"

if (root) {
  const realFetch = globalThis.fetch
  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : (input.url ?? String(input))
    if (!url.startsWith(prefix)) return realFetch(input, init)
    const [, ...segments] = url.slice(prefix.length).split("/")
    const path = normalize(decodeURIComponent(segments.join("/")))
    if (path.startsWith("..")) return new Response("not found", { status: 404 })
    try {
      const body = await readFile(join(root, path))
      return new Response(body, { status: 200 })
    } catch {
      return new Response("not found", { status: 404 })
    }
  }
}

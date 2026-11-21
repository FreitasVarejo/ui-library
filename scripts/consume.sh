#!/usr/bin/env bash
# Teste de consumo: instala este repo, sem push, num projeto Vite novo.
#
#   scripts/consume.sh            roda tudo e apaga o diretório temporário
#   KEEP=1 scripts/consume.sh     mantém o projeto e imprime o caminho
#
# O CLI do shadcn lê um registry GitHub resolvendo a ref com `git ls-remote
# https://github.com/FreitasVarejo/ui.git` e buscando os arquivos em
# raw.githubusercontent.com. Aqui os dois são desviados para este checkout
# (GIT_CONFIG_* e scripts/fake-github.mjs): é o mesmo caminho de código do CLI,
# com os endereços `FreitasVarejo/ui/<item>` de verdade, lendo a árvore de
# trabalho. Precisa de rede para o npm (scaffold do Vite e dependências).
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SHADCN="$REPO/node_modules/.bin/shadcn"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/ui-consume.XXXXXX")"
LOG="$WORK/consume.log"

cleanup() {
  if [[ -n "${KEEP:-}" ]]; then
    echo "projeto mantido em $WORK/app"
  else
    rm -rf "$WORK"
  fi
}
trap cleanup EXIT

export FAKE_GITHUB_ROOT="$REPO"
export NODE_OPTIONS="--import $REPO/scripts/fake-github.mjs ${NODE_OPTIONS:-}"
export GIT_CONFIG_COUNT=1
export GIT_CONFIG_KEY_0="url.$REPO.insteadOf"
export GIT_CONFIG_VALUE_0="https://github.com/FreitasVarejo/ui.git"
export CI=1

step() { printf '\n== %s\n' "$*"; }
# stdin fechado: se o CLI pedir confirmação, o passo falha em vez de travar.
run() { timeout 300 "$@" </dev/null >>"$LOG" 2>&1 || { tail -40 "$LOG"; echo "FALHOU: $*"; exit 1; }; }
expect() { # arquivo, texto
  grep -qF -- "$2" "$1" || { echo "FALHOU: '$2' não está em $1"; exit 1; }
}
expect_not() { # arquivo, texto
  if grep -qF -- "$2" "$1"; then echo "FALHOU: '$2' não deveria estar em $1"; exit 1; fi
}

step "registry GitHub: validate e list"
run "$SHADCN" registry validate FreitasVarejo/ui
LIST="$(cd "$WORK" && timeout 120 "$SHADCN" list FreitasVarejo/ui </dev/null)"
for item in agent-kit app-shell command-palette data-table detail-page entity-form feedback file-upload jobs-panel search-results states theme-default theme-editorial; do
  grep -q "$item" <<<"$LIST" || { echo "FALHOU: list não mostra $item"; echo "$LIST"; exit 1; }
done
echo "list mostra os itens do registry"

step "projeto Vite do zero com Base UI"
cd "$WORK"
run "$SHADCN" init -t vite -b base -p nova -n app -y --no-monorepo --no-rtl
cd app
expect components.json '"style": "base-nova"'

BLOCKS=(app-shell states feedback data-table search-results detail-page entity-form file-upload jobs-panel command-palette)
OWN_DIRS='(states|feedback|app-shell|data-table|search-results|detail-page|entity-form|file-upload|jobs-panel|command-palette)'

# O CLI do shadcn tem um defeito conhecido: o mesmo arquivo do shadcn (ex.:
# ui/alert-dialog.tsx) sai com ou sem "use client" conforme a posição no lote,
# e o CLI pergunta "overwrite?" por uma diferença que não existe. Sem TTY isso
# sai 0 sem instalar o resto. Por isso o teste olha o plano (--dry-run): nenhum
# arquivo NOSSO pode aparecer como "overwrite"; só então instala com --overwrite.
install() { # itens deste registry
  local args=() item
  for item in "$@"; do args+=("FreitasVarejo/ui/$item"); done
  local plan
  plan="$(timeout 120 "$SHADCN" add "${args[@]}" -y --dry-run </dev/null 2>&1)" || {
    echo "$plan"; echo "FALHOU: dry-run de $*"; exit 1
  }
  if grep -E "~ src/components/$OWN_DIRS/|~ src/lib/icons" <<<"$plan"; then
    echo "FALHOU: o plano sobrescreveria arquivo deste registry (acima) ao instalar $*"
    exit 1
  fi
  run "$SHADCN" add "${args[@]}" -y --overwrite
}

step "tema default, agent-kit e blocos independentes"
run "$SHADCN" add FreitasVarejo/ui/theme-default -y
run "$SHADCN" add FreitasVarejo/ui/agent-kit -y
install app-shell states feedback
test -f .claude/rules/ui-library.md
test -f src/components/app-shell/app-shell.tsx
test -f src/components/states/loading-state.tsx
test -f src/components/feedback/confirm-destructive.tsx
expect src/lib/icons.ts 'lucide-react'
expect src/index.css '--primary: oklch(0.511 0.23 276.966)'
expect src/index.css '--radius: 0.625rem'
expect src/index.css '--spacing: 0.25rem'
expect src/index.css "--font-sans: 'Inter Variable', sans-serif"
expect src/index.css '@import "@fontsource-variable/inter"'
expect src/index.css '--shadow-sm: 0 1px 3px 0'
expect src/index.css '--sidebar-primary:'
expect src/index.css '--chart-5:'
expect package.json '"@fontsource-variable/inter"'

step "dependência entre itens: o projeto já tem states e feedback"
# Os blocos de dados dependem de FreitasVarejo/ui/states e /feedback. Com os dois
# já instalados e iguais, o CLI não pergunta nada e instala só o que falta.
cp src/components/states/empty-state.tsx "$WORK/empty-state.before"
install data-table jobs-panel
test -f src/components/data-table/data-table.tsx
test -f src/components/jobs-panel/jobs-panel.tsx
cmp -s src/components/states/empty-state.tsx "$WORK/empty-state.before"

step "dependência entre itens: o projeto ainda não tem states nem feedback"
rm -rf src/components/states src/components/feedback src/components/data-table src/components/jobs-panel
install search-results detail-page entity-form jobs-panel
test -f src/components/states/empty-state.tsx
test -f src/components/feedback/confirm-destructive.tsx
test -f src/components/search-results/search-results.tsx
test -f src/components/detail-page/detail-page.tsx
test -f src/components/entity-form/entity-form.tsx
test -f src/components/jobs-panel/jobs-panel.tsx
install data-table
test -f src/components/data-table/data-table.tsx
expect package.json '"@tanstack/react-table"'
expect package.json '"react-hook-form"'
expect package.json '"@hookform/resolvers"'
expect package.json '"zod"'

step "blocos sem dependência entre itens: file-upload e command-palette"
# Só dependem de componentes do shadcn (progress, command, dialog); o `command`
# traz o cmdk.
install file-upload command-palette
test -f src/components/file-upload/file-upload.tsx
test -f src/components/file-upload/use-upload-queue.ts
test -f src/components/command-palette/command-palette.tsx
test -f src/components/ui/progress.tsx
test -f src/components/ui/command.tsx
test -f src/components/ui/dialog.tsx
expect package.json '"cmdk"'

step "página com os blocos: typecheck e build"
cp "$REPO/scripts/consume/App.tsx.template" src/App.tsx
run npx tsc -b
run npm run build
echo "typecheck e build com theme-default: ok"

step "trocar a identidade: theme-editorial por cima"
run "$SHADCN" add FreitasVarejo/ui/theme-editorial -y --overwrite
expect src/lib/icons.ts '@phosphor-icons/react'
expect_not src/lib/icons.ts 'lucide-react'
expect src/index.css '--primary: oklch(0.455 0.171 13.697)'
expect src/index.css '--radius: 0rem'
expect src/index.css '--spacing: 0.22rem'
expect src/index.css "--font-heading: 'Fraunces Variable', serif"
expect src/index.css '--shadow-sm: 0 0 #0000'
expect src/index.css '@import "@fontsource-variable/fraunces"'
expect package.json '"@phosphor-icons/react"'
expect_not src/index.css '--primary: oklch(0.511 0.23 276.966)'
run npx tsc -b
run npm run build
echo "typecheck e build com theme-editorial: ok"

step "reinstalar todos os blocos sobre o tema novo: nenhum arquivo nosso é sobrescrito"
install "${BLOCKS[@]}"
expect src/lib/icons.ts '@phosphor-icons/react'
run npx tsc -b
run npm run build
echo "ok"

step "states divergente no consumidor: o CLI pergunta; sem TTY sai 0 sem instalar o resto"
# Comportamento do CLI do shadcn que o AGENTS.md registra: arquivo existente e
# diferente gera o prompt "already exists. Overwrite?"; com stdin fechado o
# processo termina com código 0 antes de gravar os arquivos do item. Se este
# passo falhar, o CLI mudou: revise a regra no AGENTS.md.
echo "// editado pelo consumidor" >>src/components/states/empty-state.tsx
rm src/components/data-table/index.ts
set +e
timeout 120 "$SHADCN" add FreitasVarejo/ui/data-table -y </dev/null >>"$LOG" 2>&1
code=$?
set -e
test "$code" -eq 0
test ! -f src/components/data-table/index.ts || { echo "FALHOU: o CLI instalou apesar do arquivo divergente"; exit 1; }
expect src/components/states/empty-state.tsx "editado pelo consumidor"
# --dry-run mostra o que mudaria sem gravar; --overwrite resolve de propósito.
PLAN="$("$SHADCN" add FreitasVarejo/ui/data-table -y --dry-run </dev/null 2>&1)"
grep -qE "~ src/components/states/empty-state.tsx" <<<"$PLAN" || { echo "$PLAN"; echo "FALHOU: o plano não aponta o states divergente"; exit 1; }
test ! -f src/components/data-table/index.ts
run "$SHADCN" add FreitasVarejo/ui/data-table -y --overwrite
test -f src/components/data-table/index.ts
expect_not src/components/states/empty-state.tsx "editado pelo consumidor"
run npx tsc -b
echo "ok"

step "consumo ok"

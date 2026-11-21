# Biblioteca de UI

Antes de escrever componente ou seção de tela, procure o que já existe:

1. Registry `FreitasVarejo/ui` (blocos e temas): `npx shadcn@latest list FreitasVarejo/ui`.
   Detalhe de um item: `npx shadcn@latest view FreitasVarejo/ui/<item>`.
   Instalar: `npx shadcn@latest add FreitasVarejo/ui/<item>`.
2. Componentes do shadcn: `npx shadcn@latest search @shadcn -q <termo>`, depois
   `npx shadcn@latest add <nome>`.
3. Só escreva do zero o que nenhum dos dois cobre, compondo componentes do shadcn.

Regras:

- Cor, raio, sombra e espaçamento só por token do tema (`bg-primary`,
  `rounded-lg`, `shadow-sm`, `p-4`, `var(--border)`). Nunca valor cru (hex,
  rgb, oklch, px ou rem soltos).
- Ícone só de `@/lib/icons` (`Icons.search`, `Icons.empty`...). Não importe
  `lucide-react` nem outro pacote de ícones em código de tela.
- Um único destaque animado por página.
- Os blocos trazem texto padrão em pt-BR e aceitam todo texto por prop; o
  idioma é do projeto.

Instalar sem terminal interativo:

- Arquivo já existente e diferente faz o CLI perguntar "overwrite?"; sem TTY ele
  sai 0 sem criar os arquivos do item. Antes: `npx shadcn@latest add <item>
  --dry-run` lista o que seria criado e o que seria sobrescrito, e `--diff
  <arquivo>` mostra a diferença. Só use `--overwrite` depois de olhar.
- Depois do `add`, confira que os arquivos do item existem.

Identidade visual:

- Os blocos usam `@/lib/icons`, que o tema instala: instale um `theme-<nome>`
  antes do primeiro bloco.
- Trocar a identidade é instalar outro tema por cima:
  `npx shadcn@latest add FreitasVarejo/ui/theme-<nome> --overwrite`.
- Criar uma identidade nova é gerar o `theme-<nome>` no repositório da
  biblioteca (`github.com/FreitasVarejo/ui`, veja o `AGENTS.md` dele).

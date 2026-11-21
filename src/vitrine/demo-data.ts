// Dados de mentira do indexador de conteúdo, só para a vitrine.

export type DocStatus = "indexado" | "processando" | "falhou"
export type DocType = "PDF" | "DOCX" | "Planilha" | "Imagem" | "E-mail"

export interface DemoDocument {
  id: string
  title: string
  type: DocType
  status: DocStatus
  author: string
  pages: number
  updated: string
  tags: string[]
  snippet: string
}

const TITLES: Array<[string, DocType, string]> = [
  [
    "Contrato de prestação de serviço",
    "PDF",
    "O prazo de vigência do contrato é de doze meses, renovável por igual período.",
  ],
  [
    "Ata da reunião de março",
    "DOCX",
    "Decidiu-se priorizar a migração do acervo antes do fim do trimestre.",
  ],
  [
    "Manual do usuário",
    "PDF",
    "Para indexar um documento, escolha o arquivo e aguarde a conclusão do processamento.",
  ],
  [
    "Orçamento anual",
    "Planilha",
    "As despesas com infraestrutura somam quarenta por cento do orçamento previsto.",
  ],
  [
    "Política de retenção de dados",
    "PDF",
    "Documentos fiscais são mantidos por cinco anos; os demais, por dois.",
  ],
  [
    "Relatório de incidentes",
    "DOCX",
    "O incidente de janeiro afetou a busca por quatro horas, sem perda de dados.",
  ],
  [
    "Planta do escritório",
    "Imagem",
    "Planta baixa do segundo andar, com a sala de servidores ao fundo.",
  ],
  [
    "Proposta comercial",
    "PDF",
    "A proposta inclui implantação, treinamento e suporte durante o primeiro ano.",
  ],
  [
    "Nota fiscal 2041",
    "PDF",
    "Serviços de hospedagem referentes ao mês de abril.",
  ],
  [
    "Convite para a reunião geral",
    "E-mail",
    "Reunião geral na sexta-feira, às dez horas, na sala principal.",
  ],
  [
    "Plano de backup",
    "DOCX",
    "O backup completo roda aos domingos e o incremental, todas as noites.",
  ],
  [
    "Lista de fornecedores",
    "Planilha",
    "Fornecedores homologados, com contato e prazo médio de entrega.",
  ],
  [
    "Termo de confidencialidade",
    "PDF",
    "As partes se comprometem a não divulgar informações confidenciais.",
  ],
  [
    "Cronograma de implantação",
    "Planilha",
    "Fases de implantação com responsáveis e datas de entrega.",
  ],
  [
    "Diagrama da rede",
    "Imagem",
    "Topologia da rede interna, com os três segmentos e o roteador de borda.",
  ],
  [
    "Resposta ao edital",
    "PDF",
    "Atendemos a todos os requisitos técnicos do edital, exceto o item 7.2.",
  ],
  [
    "Currículo da equipe",
    "DOCX",
    "Resumo profissional dos integrantes da equipe de desenvolvimento.",
  ],
  [
    "Registro de acessos",
    "Planilha",
    "Acessos ao sistema por usuário e por dia, no último trimestre.",
  ],
  [
    "Pauta da diretoria",
    "DOCX",
    "Itens da pauta: orçamento, contratações e revisão da política de dados.",
  ],
  [
    "Garantia do equipamento",
    "PDF",
    "A garantia cobre defeitos de fabricação por vinte e quatro meses.",
  ],
  [
    "Procedimento de restauração",
    "DOCX",
    "Passo a passo para restaurar o acervo a partir da cópia mais recente.",
  ],
  [
    "Fatura de energia",
    "PDF",
    "Consumo do mês de maio, com bandeira tarifária amarela.",
  ],
  [
    "Mensagem do suporte",
    "E-mail",
    "Recebemos o seu chamado e retornaremos em até um dia útil.",
  ],
  [
    "Inventário de ativos",
    "Planilha",
    "Servidores, switches e estações, com número de série e responsável.",
  ],
  [
    "Foto da fachada",
    "Imagem",
    "Fachada do prédio, fotografada na manhã da vistoria.",
  ],
  [
    "Acordo de nível de serviço",
    "PDF",
    "A disponibilidade mensal garantida é de noventa e nove vírgula nove por cento.",
  ],
  [
    "Relatório financeiro",
    "PDF",
    "A receita cresceu doze por cento em relação ao ano anterior.",
  ],
  [
    "Minuta do aditivo",
    "DOCX",
    "O aditivo altera a cláusula quarta e mantém as demais condições.",
  ],
  [
    "Planilha de horas",
    "Planilha",
    "Horas trabalhadas por projeto, conferidas pela coordenação.",
  ],
  [
    "Comunicado de manutenção",
    "E-mail",
    "A manutenção programada ocorrerá no sábado, das duas às seis.",
  ],
  [
    "Estatuto da associação",
    "PDF",
    "O estatuto define os órgãos de gestão e as regras de eleição.",
  ],
  [
    "Roteiro de testes",
    "DOCX",
    "Casos de teste de aceitação para a busca e para o envio de arquivos.",
  ],
  [
    "Mapa de processos",
    "Imagem",
    "Mapa dos processos de entrada, indexação e consulta de documentos.",
  ],
  [
    "Checklist de segurança",
    "DOCX",
    "Verificações trimestrais de acesso, cópia de segurança e atualização.",
  ],
  [
    "Previsão de demanda",
    "Planilha",
    "Projeção de volume de documentos para os próximos seis meses.",
  ],
  [
    "Resumo executivo",
    "PDF",
    "A plataforma reduz o tempo médio de busca de minutos para segundos.",
  ],
  [
    "Carta de apresentação",
    "DOCX",
    "Apresentamos a nossa empresa e os serviços de gestão documental.",
  ],
  [
    "Comprovante de pagamento",
    "PDF",
    "Pagamento confirmado em dez de abril, via transferência bancária.",
  ],
  [
    "Escala de plantão",
    "Planilha",
    "Escala de plantão de infraestrutura para o próximo mês.",
  ],
]

const AUTHORS = ["Ana Souza", "Bruno Lima", "Carla Dias", "Diego Rocha"]
const STATUSES: DocStatus[] = [
  "indexado",
  "indexado",
  "indexado",
  "processando",
  "indexado",
  "falhou",
]
const TAGS = ["jurídico", "financeiro", "operações", "rh", "infraestrutura"]

export const DOCUMENTS: DemoDocument[] = TITLES.map(
  ([title, type, snippet], index) => ({
    id: `doc-${String(index + 1).padStart(3, "0")}`,
    title,
    type,
    status: STATUSES[index % STATUSES.length],
    author: AUTHORS[index % AUTHORS.length],
    pages: ((index * 7) % 60) + 1,
    updated: new Date(Date.UTC(2026, 3, 1 + ((index * 3) % 60))).toISOString(),
    tags: [TAGS[index % TAGS.length], TAGS[(index + 2) % TAGS.length]],
    snippet,
  })
)

export const STATUS_LABEL: Record<DocStatus, string> = {
  indexado: "Indexado",
  processando: "Processando",
  falhou: "Falhou",
}

export const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
  timeZone: "UTC",
})

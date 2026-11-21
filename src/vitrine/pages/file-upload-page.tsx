import { FileUpload } from "@registry/file-upload/file-upload"
import type { UploadContext } from "@registry/file-upload/types"
import { Section, Specimen } from "../section"

/**
 * Envio de mentira: sobe de 10 em 10% a cada 350 ms. Arquivo com “erro” no
 * nome falha na metade. Respeita o `signal`, como um fetch de verdade.
 */
function fakeUpload(file: File, { onProgress, signal }: UploadContext) {
  return new Promise<{ name: string }>((resolve, reject) => {
    let percent = 0
    const timer = setInterval(() => {
      percent += 10
      onProgress(percent)
      if (file.name.includes("erro") && percent >= 50) {
        clearInterval(timer)
        reject(new Error("O servidor recusou o arquivo."))
      } else if (percent >= 100) {
        clearInterval(timer)
        resolve({ name: file.name })
      }
    }, 350)
    signal.addEventListener("abort", () => {
      clearInterval(timer)
      reject(new DOMException("Cancelado", "AbortError"))
    })
  })
}

export function FileUploadPage() {
  return (
    <div className="flex flex-col gap-8">
      <Section
        title="Envio ao vivo"
        description="Arraste arquivos ou clique (Tab até a zona e Enter também abre o seletor). Só PDF, DOCX e PNG até 2 MB; dois envios ao mesmo tempo. Um arquivo com “erro” no nome falha na metade, para ver o tentar de novo."
      >
        <FileUpload
          upload={fakeUpload}
          accept={[".pdf", ".docx", ".png"]}
          maxSize={2 * 1024 * 1024}
          concurrency={2}
        />
      </Section>

      <Section title="Variações">
        <div className="grid gap-4 md:grid-cols-2">
          <Specimen label="um arquivo por vez, qualquer tipo">
            <FileUpload upload={fakeUpload} multiple={false} concurrency={1} />
          </Specimen>
          <Specimen label="desabilitado">
            <FileUpload upload={fakeUpload} disabled />
          </Specimen>
        </div>
      </Section>
    </div>
  )
}

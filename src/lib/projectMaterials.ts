import type { ProjectMaterial, ProjectMaterialCategory } from './types.ts'

export const projectMaterialCategories: ReadonlyArray<{ value: ProjectMaterialCategory; label: string }> = [
  { value: 'questionario', label: 'Questionário' },
  { value: 'referencia', label: 'Referência' },
  { value: 'design', label: 'Design' },
  { value: 'arquivo', label: 'Arquivos e pastas' },
  { value: 'documento', label: 'Documento' },
  { value: 'entrega', label: 'Entrega' },
  { value: 'outro', label: 'Outro' },
]

export type ProjectMaterialInput = Pick<ProjectMaterial, 'projectId' | 'name' | 'category' | 'url' | 'notes'>

export function safeProjectMaterialUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim())
    // Não permitir javascript:, file:, data: ou credenciais embutidas em links.
    if (!['https:', 'http:'].includes(url.protocol) || !url.hostname || url.username || url.password) return null
    return url.href
  } catch {
    return null
  }
}

export function validateProjectMaterial(input: ProjectMaterialInput): string {
  if (!input.name.trim() || input.name.trim().length > 120) return 'Informe um nome com até 120 caracteres.'
  if (!projectMaterialCategories.some(category => category.value === input.category)) return 'Selecione uma categoria válida.'
  if (input.notes.length > 1000) return 'A observação deve ter no máximo 1000 caracteres.'
  if (!safeProjectMaterialUrl(input.url)) return 'Informe um link http:// ou https:// válido, sem credenciais.'
  return ''
}

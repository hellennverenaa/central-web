<script setup lang="ts">
import { ref } from 'vue'
import { Download, Upload, TestTube2, Trash2, ShieldAlert } from 'lucide-vue-next'
import { clearAll, exportWorkspace, importWorkspace, loadDemo, persistenceError, state } from '../lib/store'
const notice = ref('')
function loadSample() { if (!confirm('Substituir TODOS os dados locais, incluindo modelos, links e projetos, por dados fictícios? Exporte um backup antes de continuar.')) return; loadDemo(); notice.value = persistenceError.value || 'Dados fictícios carregados e salvos neste dispositivo.' }
function reset() { if (!confirm('Restaurar os modelos originais e apagar registros locais? Exporte um backup antes!')) return; clearAll(); notice.value = persistenceError.value || 'Registros removidos e modelos do planejamento restaurados.' }
async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const obj: unknown = JSON.parse(await file.text())
    if (!confirm('Importar este backup substituirá todos os dados atuais. Continuar?')) return
    importWorkspace(obj)
    notice.value = persistenceError.value || 'Backup importado e salvo neste dispositivo.'
  } catch (err) { notice.value = err instanceof Error ? err.message : 'Erro ao importar arquivo.' }
  finally { input.value = '' }
}
</script>
<template><div class="view-enter"><div class="page-intro"><div><p class="eyebrow"><span class="eyebrow-line"></span> CONFIGURAÇÃO DO PROTÓTIPO</p><h1>Dados & backup</h1><p class="page-subtitle">Controle de demonstração e exportação antes de migrarmos para o banco.</p></div></div>
  <div class="notice-box"><ShieldAlert :size="22"/><div><b>Esta versão é um protótipo local.</b><p>Os registros ficam no localStorage do navegador, sem login, criptografia em repouso ou sincronização. <strong>Não use dados reais de clientes, telefones ou informações financeiras sensíveis.</strong> Não publique esta versão como sistema de produção.</p></div></div>
  <div class="data-grid"><section class="surface data-card"><div class="data-icon"><Download :size="22"/></div><h2>Exportar backup</h2><p>Baixe os registros atuais em JSON. O arquivo não é criptografado: guarde em local protegido.</p><button class="btn btn-outline" @click="exportWorkspace"><Download :size="17"/> Baixar JSON</button></section>
  <section class="surface data-card"><div class="data-icon"><Upload :size="22"/></div><h2>Importar backup</h2><p>Restaure um JSON gerado pela própria central. A importação substitui os dados locais.</p><label class="btn btn-outline file-button"><Upload :size="17"/> Escolher arquivo<input type="file" accept="application/json,.json" @change="onFile" /></label></section>
  <section class="surface data-card"><div class="data-icon"><TestTube2 :size="22"/></div><h2>Dados demonstrativos</h2><p>Crie exemplos fictícios para explorar as telas sem cadastrar clientes de verdade.</p><button class="btn btn-outline" @click="loadSample"><TestTube2 :size="17"/> Carregar demo</button></section>
  <section class="surface data-card"><div class="data-icon danger-icon"><Trash2 :size="22"/></div><h2>Limpar tudo</h2><p>Apague registros e restaure os modelos de roteiro, catálogo e publicações da planilha. Faça backup antes.</p><button class="btn btn-outline destructive" @click="reset"><Trash2 :size="17"/> Restaurar modelos</button></section></div><p v-if="notice" class="inline-notice" role="status">{{ notice }}</p>
</div></template>

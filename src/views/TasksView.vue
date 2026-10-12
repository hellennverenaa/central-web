<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ArrowRight, CheckCircle2, ListTodo, Pencil, Plus, Trash2 } from 'lucide-vue-next'
import { state, addTask, persistenceError, removeItem, updateTask } from '../lib/store'
import type { Task } from '../lib/types'

const emit = defineEmits<{ openProject: [id: string] }>()
const editingId = ref<string | null>(null)
const showEdit = ref(false)
const error = ref('')
const feedback = ref('')
const createForm = reactive({ title: '', projectId: '' })
const editForm = reactive({ title: '', projectId: '' })
const pending = computed(() => state.tasks.filter(task => !task.done).length)
const complete = computed(() => state.tasks.length - pending.value)
function submit() {
  error.value = ''
  try {
    addTask(createForm.title, createForm.projectId || null)
    createForm.title = ''
    createForm.projectId = ''
    feedback.value = persistenceError.value || 'Tarefa criada e salva neste dispositivo.'
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Não foi possível criar a tarefa.' }
}
function edit(task: Task) { editingId.value = task.id; Object.assign(editForm, { title: task.title, projectId: task.projectId ?? '' }); error.value = ''; showEdit.value = true }
function saveEdit() {
  error.value = ''
  const task = state.tasks.find(item => item.id === editingId.value)
  if (!task) { error.value = 'A tarefa não foi encontrada.'; return }
  try {
    updateTask(task.id, { title: editForm.title, done: task.done, projectId: editForm.projectId || null })
    feedback.value = persistenceError.value || 'Tarefa atualizada e salva neste dispositivo.'
    showEdit.value = false
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Não foi possível salvar a tarefa.' }
}
function toggle(task: Task, done: boolean) {
  try { updateTask(task.id, { title: task.title, done, projectId: task.projectId }); feedback.value = persistenceError.value || 'Status da tarefa atualizado.' }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'Não foi possível atualizar a tarefa.' }
}
function drop(id: string) { if (confirm('Excluir esta tarefa?')) removeItem('tasks', id) }
</script>

<template>
  <div class="view-enter"><div class="page-intro"><div><p class="eyebrow"><span class="eyebrow-line"></span> ORGANIZAÇÃO</p><h1>Tarefas</h1><p class="page-subtitle">Organize ações pessoais ou vincule cada tarefa a um projeto.</p></div></div>
    <p v-if="feedback" class="inline-notice" role="status">{{ feedback }}</p>
    <div class="surface task-page"><form class="task-create task-create-linked" @submit.prevent="submit"><input v-model="createForm.title" maxlength="180" required placeholder="O que precisa ser feito?" aria-label="Nova tarefa"/><select v-model="createForm.projectId" aria-label="Projeto relacionado"><option value="">Tarefa pessoal, sem projeto</option><option v-for="project in state.projects" :key="project.id" :value="project.id">{{ project.name }}</option></select><button class="btn btn-dark" type="submit"><Plus :size="17"/> Adicionar</button></form>
      <p v-if="error && !showEdit" class="form-error" role="alert">{{ error }}</p><div class="task-stats"><ListTodo :size="16"/> {{ pending }} pendente(s) <span>·</span><CheckCircle2 :size="16"/> {{ complete }} concluída(s)</div>
      <div v-if="state.tasks.length" class="task-items"><div v-for="task in state.tasks" :key="task.id" class="task-item" :class="{ 'done-task': task.done }"><label><input :checked="task.done" type="checkbox" @change="toggle(task, ($event.target as HTMLInputElement).checked)"/><span>{{ task.title }}</span></label><button v-if="task.projectId && state.projects.some(project => project.id === task.projectId)" class="table-link task-project-link" @click="emit('openProject', task.projectId)">{{ state.projects.find(project => project.id === task.projectId)?.name }} <ArrowRight :size="13"/></button><span v-else class="item-counter">Pessoal</span><div class="row-actions"><button class="icon-button" :aria-label="`Editar ${task.title}`" @click="edit(task)"><Pencil :size="15"/></button><button class="icon-button danger" :aria-label="`Excluir ${task.title}`" @click="drop(task.id)"><Trash2 :size="16"/></button></div></div></div>
      <div v-else class="empty"><ListTodo :size="27"/><b>Você está com a agenda livre</b><p>Anote a próxima ação ou crie uma tarefa no detalhe de um projeto.</p></div>
    </div>
    <Teleport to="body"><div v-if="showEdit" class="modal-backdrop" @click.self="showEdit = false"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="task-edit-title"><div class="modal-head"><h2 id="task-edit-title">Editar tarefa</h2><button class="icon-button" aria-label="Fechar" @click="showEdit = false">✕</button></div><form @submit.prevent="saveEdit"><div class="field"><label for="task-edit-name">Tarefa *</label><input id="task-edit-name" v-model="editForm.title" required maxlength="180" autofocus/></div><div class="field"><label for="task-edit-project">Projeto relacionado</label><select id="task-edit-project" v-model="editForm.projectId"><option value="">Tarefa pessoal, sem projeto</option><option v-for="project in state.projects" :key="project.id" :value="project.id">{{ project.name }}</option></select></div><p v-if="error" class="form-error" role="alert">{{ error }}</p><div class="modal-actions"><button type="button" class="btn btn-outline" @click="showEdit = false">Cancelar</button><button class="btn btn-dark">Salvar alterações</button></div></form></div></div></Teleport>
  </div>
</template>

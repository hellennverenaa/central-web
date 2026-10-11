<script setup lang="ts">
import { ref } from 'vue'
import { Plus, Trash2, ListTodo, CheckCircle2 } from 'lucide-vue-next'
import { state, addTask, removeItem } from '../lib/store'
const title = ref('')
function submit() { if (!title.value.trim()) return; addTask(title.value.trim()); title.value = '' }
function drop(id: string) { if (confirm('Excluir esta tarefa?')) removeItem('tasks', id) }
</script>
<template><div class="view-enter"><div class="page-intro"><div><p class="eyebrow"><span class="eyebrow-line"></span> ORGANIZAÇÃO PESSOAL</p><h1>Minha rotina</h1><p class="page-subtitle">Tarefas pequenas para construir seu negócio sem sobrecarga.</p></div></div><div class="surface task-page"><form class="task-create" @submit.prevent="submit"><input v-model="title" maxlength="180" required placeholder="O que você precisa fazer agora?" aria-label="Nova tarefa"/><button class="btn btn-dark" type="submit"><Plus :size="17"/> Adicionar</button></form><div class="task-stats"><ListTodo :size="16"/> {{ state.tasks.filter(t=>!t.done).length }} pendente(s) <span>·</span><CheckCircle2 :size="16"/> {{ state.tasks.filter(t=>t.done).length }} concluída(s)</div><div v-if="state.tasks.length" class="task-items"><div v-for="task in state.tasks" :key="task.id" class="task-item" :class="{ 'done-task': task.done }"><label><input v-model="task.done" type="checkbox"/><span>{{ task.title }}</span></label><button class="icon-button danger" :aria-label="`Excluir ${task.title}`" @click="drop(task.id)"><Trash2 :size="16"/></button></div></div><div v-else class="empty"><ListTodo :size="27"/><b>Você está com a agenda livre</b><p>Anote a próxima ação para tirar seu estúdio do papel.</p></div></div></div></template>

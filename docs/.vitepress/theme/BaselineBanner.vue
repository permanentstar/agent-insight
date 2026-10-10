<script setup>
import { computed } from 'vue';
import { useData } from 'vitepress';
import registry from '../../../baselines.json';
import contract from '../../../book-contract.json';
const { frontmatter } = useData();
const rows = computed(() => (frontmatter.value.baselines ?? []).map(id => ({ id, ...registry.baselines[id] })));
</script>
<template>
  <aside class="baseline-banner" aria-label="文档核验范围与源码基线">
    <strong>{{ contract.statuses[frontmatter.status] }}</strong>
    <p>{{ frontmatter.verified_scope }}</p>
    <ul v-if="rows.length">
      <li v-for="row in rows" :key="row.id">
        <code>{{ row.id }}</code> · {{ row.role === 'current' ? '主干观察点' : '冻结历史' }} ·
        <a v-if="row.sha" :href="`${registry.repos[row.repo].url}/commit/${row.sha}`">{{ row.sha.slice(0, 12) }}</a>
        <span v-else>原始源码版本未确定</span>
        · {{ row.observed_at }}
      </li>
    </ul>
  </aside>
</template>

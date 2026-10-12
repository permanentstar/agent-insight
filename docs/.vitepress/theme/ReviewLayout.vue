<script setup>
import DefaultTheme from 'vitepress/theme';
import LocalReview from './LocalReview.vue';
</script>

<template>
  <DefaultTheme.Layout>
    <template #layout-bottom><LocalReview /></template>
  </DefaultTheme.Layout>
</template>

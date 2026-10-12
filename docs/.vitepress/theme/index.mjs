import DefaultTheme from 'vitepress/theme';
import { defineAsyncComponent } from 'vue';
import './style.css';
export default {
  extends: DefaultTheme,
  Layout: __LOCAL_REVIEW__
    ? defineAsyncComponent(() => import('./ReviewLayout.vue'))
    : DefaultTheme.Layout,
};

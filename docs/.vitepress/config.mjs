import { defineConfig } from 'vitepress';
import { readFileSync } from 'node:fs';
const catalog = JSON.parse(readFileSync(new URL('../../catalog.json', import.meta.url), 'utf8'));
export default defineConfig({
  lang: 'zh-CN', title: 'Agent Insight', description: 'Agent 架构、执行机制与设计取舍的源码研究',
  lastUpdated: false, cleanUrls: true,
  vite: { define: { __LOCAL_REVIEW__: JSON.stringify(process.env.AGENT_INSIGHT_REVIEW === '1') } },
  themeConfig: {
    nav: [{ text: '版本说明', link: '/guide/baselines' }, { text: '比较', link: '/comparisons/' }, { text: '分册', link: '/guide/map' }],
    sidebar: catalog.map(group => ({ text: group.title, collapsed: false, items: group.items.map(item => ({ text: item.title, link: item.path === 'index.md' ? '/' : '/' + item.path.replace(/\/index\.md$/, '/').replace(/\.md$/, '') })) })),
    outline: [2, 3],
    search: { provider: 'local', options: { miniSearch: { options: { tokenize: text => text.match(/[\p{Script=Han}]|[\p{L}\p{N}_-]+/gu) ?? [] } }, locales: { root: { translations: { button: { buttonText: '搜索', buttonAriaLabel: '搜索文档' }, modal: { noResultsText: '没有找到结果', resetButtonTitle: '清除', footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' } } } } } } },
    socialLinks: [{ icon: 'github', link: 'https://github.com/permanentstar/agent-insight' }],
    editLink: { pattern: 'https://github.com/permanentstar/agent-insight/edit/main/docs/:path', text: '在 GitHub 编辑' },
  },
});

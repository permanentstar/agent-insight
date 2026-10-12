<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useData, useRouter } from 'vitepress';
import { readingUrl, REVIEW_API, REVIEW_STATUS, REVIEW_TOKEN_HEADER } from '../../../scripts/review-contract.mjs';

const { frontmatter } = useData();
const router = useRouter();
const enabled = ref(true);
const opened = ref(false);
const ready = ref(false);
const saving = ref(false);
const error = ref('');
const notice = ref('');
const notes = ref([]);
const scope = ref('page');
const disposition = ref(REVIEW_STATUS.OPEN);
const selection = ref(null);
const draft = ref(null);
const comment = ref('');
const input = ref(null);
let token = '';
const pages = ref(new Map());
const pageId = computed(() => frontmatter.value.id);
const page = computed(() => pages.value.get(pageId.value));
const pageNotes = computed(() => notes.value.filter(note => note.pageId === pageId.value));
const openCount = computed(() => pageNotes.value.filter(note => note.status === REVIEW_STATUS.OPEN).length);
const visibleNotes = computed(() => notes.value.filter(note =>
  (scope.value === 'all' || note.pageId === pageId.value) &&
  (disposition.value === 'all' || note.status === disposition.value)
).slice().reverse());

const failures = {
  review_origin_rejected: '访问来源被拒绝，请使用本机审稿地址。',
  review_token_rejected: '审稿服务已重启，请刷新页面后继续。',
  stale_review_page: '章节内容已变化，请刷新页面并重新选文。',
  unknown_review_page: '当前页面不在书籍目录中。',
  empty_review_comment: '请填写批注意见。',
  invalid_review_store: '批注文件格式有误，原文件未被覆盖。',
  review_store_unreadable: '批注文件无法读取，请检查本地目录。',
};

async function request(path, method = 'GET', data) {
  const response = await fetch(REVIEW_API + path, {
    method, headers: { [REVIEW_TOKEN_HEADER]: token, ...(data ? { 'Content-Type': 'application/json' } : {}) },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(failures[result.reason] ?? `批注操作失败：${result.reason}`);
  return result;
}

async function refreshNotes() { notes.value = (await request('/annotations')).annotations; }

/** Capture only book text; toolbar and editor selections never become quotations. */
function captureSelection(event) {
  if (!enabled.value || !ready.value || event.target?.closest?.('.local-review')) return;
  const selected = window.getSelection();
  const doc = document.querySelector('.vp-doc');
  if (!selected?.rangeCount || selected.isCollapsed || !doc) { selection.value = null; return; }
  const range = selected.getRangeAt(0);
  if (!doc.contains(range.startContainer) || !doc.contains(range.endContainer)) { selection.value = null; return; }
  const quote = selected.toString().trim();
  if (!quote) { selection.value = null; return; }
  let anchor = '';
  for (const heading of doc.querySelectorAll('h1[id],h2[id],h3[id],h4[id]')) {
    if (heading.contains(range.startContainer) || (heading.compareDocumentPosition(range.startContainer) & Node.DOCUMENT_POSITION_FOLLOWING)) anchor = heading.id;
  }
  const rect = range.getBoundingClientRect();
  selection.value = {
    quote, anchor,
    top: Math.max(72, Math.min(rect.bottom + 8, window.innerHeight - 60)),
    left: Math.max(12, Math.min(rect.left, window.innerWidth - 150)),
  };
}

async function startDraft(selected = null) {
  if (!page.value || saving.value) return;
  draft.value = { ...page.value, quote: selected?.quote ?? '', anchor: selected?.anchor ?? decodeURIComponent(location.hash.slice(1)) };
  comment.value = '';
  error.value = '';
  notice.value = '';
  selection.value = null;
  window.getSelection()?.removeAllRanges();
  opened.value = true;
  await nextTick();
  input.value?.focus();
}

async function editNote(note) {
  if (saving.value) return;
  draft.value = { ...note };
  comment.value = note.comment;
  error.value = '';
  await nextTick();
  input.value?.focus();
}

async function saveDraft() {
  if (!draft.value || !comment.value.trim() || saving.value) return;
  saving.value = true;
  error.value = '';
  try {
    if (draft.value.id) await request('/annotations/' + draft.value.id, 'PATCH', { comment: comment.value });
    else await request('/annotations', 'POST', {
      pageId: draft.value.pageId, sourceHash: draft.value.sourceHash,
      quote: draft.value.quote, anchor: draft.value.anchor, comment: comment.value,
    });
    draft.value = null;
    comment.value = '';
    notice.value = '已保存到本地审稿文件';
    await refreshNotes();
  } catch (failure) { error.value = failure.message; }
  finally { saving.value = false; }
}

async function toggleStatus(note) {
  if (saving.value) return;
  saving.value = true;
  error.value = '';
  try {
    await request('/annotations/' + note.id, 'PATCH', { status: note.status === REVIEW_STATUS.OPEN ? REVIEW_STATUS.RESOLVED : REVIEW_STATUS.OPEN });
    await refreshNotes();
  } catch (failure) { error.value = failure.message; }
  finally { saving.value = false; }
}

/** Heading anchors survive edits better than DOM offsets; quotes remain in the record. */
async function locateNote(note) {
  await router.go(readingUrl(note.path, note.anchor));
  await nextTick();
  const heading = note.anchor && document.getElementById(note.anchor);
  heading?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  notice.value = '已定位到批注所在小节；原文摘录保留在批注卡片中。';
}

function cancelDraft() { draft.value = null; comment.value = ''; }
function keydown(event) {
  if (event.key === 'Escape') { selection.value = null; opened.value = false; }
}

watch(enabled, value => {
  localStorage.setItem('agent-insight-review-enabled', String(value));
  if (!value) { selection.value = null; opened.value = false; }
});
watch(pageId, () => { selection.value = null; });

onMounted(async () => {
  enabled.value = localStorage.getItem('agent-insight-review-enabled') !== 'false';
  document.addEventListener('mouseup', captureSelection);
  document.addEventListener('keyup', captureSelection);
  document.addEventListener('keydown', keydown);
  try {
    const session = await request('/session');
    token = session.token;
    pages.value = new Map(session.pages.map(item => [item.pageId, item]));
    await refreshNotes();
    ready.value = true;
  } catch { error.value = '审稿服务未就绪，请通过 npm run review 启动后刷新。'; }
});
onUnmounted(() => {
  document.removeEventListener('mouseup', captureSelection);
  document.removeEventListener('keyup', captureSelection);
  document.removeEventListener('keydown', keydown);
});
</script>

<template>
  <div class="local-review">
    <div class="review-toolbar">
      <label><input v-model="enabled" type="checkbox"> 审稿模式</label>
      <button v-if="enabled" type="button" @click="opened = !opened" :aria-expanded="opened">批注 {{ openCount }}</button>
    </div>
    <button v-if="selection && enabled" type="button" :disabled="saving" class="review-selection" :style="{ top: selection.top + 'px', left: selection.left + 'px' }" @click="startDraft(selection)">添加批注</button>
    <aside v-if="opened && enabled" class="review-panel" aria-label="本地审稿批注">
      <header><strong>本地审稿批注</strong><button type="button" aria-label="关闭批注面板" @click="opened = false">关闭</button></header>
      <p class="review-help">选中正文即可批注。意见仅保存到本机 .review/。</p>
      <p v-if="error" role="alert" class="review-error">{{ error }}</p>
      <p v-if="notice" role="status" class="review-notice">{{ notice }}</p>
      <button v-if="!draft" type="button" :disabled="saving || !ready || !page" @click="startDraft()">添加整章意见</button>
      <form v-if="draft" @submit.prevent="saveDraft" class="review-draft">
        <p><strong>{{ draft.title }}</strong></p>
        <blockquote v-if="draft.quote">{{ draft.quote }}</blockquote>
        <p v-else class="review-help">整章意见</p>
        <label for="review-comment">批注意见</label>
        <textarea id="review-comment" ref="input" v-model="comment" :disabled="saving" rows="5" placeholder="哪里有问题，希望怎样调整？" required />
        <div class="review-actions"><button type="submit" :disabled="saving || !comment.trim()">{{ saving ? '保存中…' : '保存批注' }}</button><button type="button" :disabled="saving" @click="cancelDraft">取消</button></div>
      </form>
      <div class="review-filters">
        <label>范围<select v-model="scope"><option value="page">当前章节</option><option value="all">全书</option></select></label>
        <label>状态<select v-model="disposition"><option :value="REVIEW_STATUS.OPEN">待处理</option><option :value="REVIEW_STATUS.RESOLVED">已处理</option><option value="all">全部</option></select></label>
      </div>
      <p v-if="!visibleNotes.length" class="review-help">此范围没有批注。</p>
      <article v-for="note in visibleNotes" :key="note.id" class="review-note">
        <p><strong>{{ note.title }}</strong><span class="review-status">{{ note.status === REVIEW_STATUS.OPEN ? '待处理' : '已处理' }}</span><span v-if="note.sourceHash !== pages.get(note.pageId)?.sourceHash" class="review-status">正文已变化</span></p>
        <blockquote v-if="note.quote">{{ note.quote }}</blockquote>
        <p class="review-comment">{{ note.comment }}</p>
        <div class="review-actions"><button type="button" @click="locateNote(note)">定位小节</button><button type="button" :disabled="saving" @click="editNote(note)">编辑</button><button type="button" :disabled="saving" @click="toggleStatus(note)">{{ note.status === REVIEW_STATUS.OPEN ? '标记已处理' : '恢复待处理' }}</button></div>
      </article>
    </aside>
  </div>
</template>

<style scoped>
.local-review { font-size: 14px; color: var(--vp-c-text-1); }
.review-toolbar { position: fixed; right: 18px; bottom: 18px; z-index: 50; display: flex; align-items: center; gap: 14px; padding: 10px 14px; border: 1px solid var(--vp-c-divider); border-radius: 10px; background: var(--vp-c-bg); box-shadow: 0 3px 18px #0002; }
button { padding: 5px 9px; border: 1px solid var(--vp-c-divider); border-radius: 6px; color: var(--vp-c-text-1); background: var(--vp-c-bg-soft); cursor: pointer; }
button:hover { border-color: var(--vp-c-brand-1); }
button:disabled { opacity: .5; cursor: default; }
label { display: flex; align-items: center; gap: 6px; }
input[type=checkbox] { accent-color: var(--vp-c-brand-1); }
.review-selection { position: fixed; z-index: 60; color: var(--vp-c-bg); background: var(--vp-c-text-1); box-shadow: 0 3px 10px #0003; }
.review-panel { position: fixed; z-index: 55; top: 76px; right: 16px; bottom: 76px; width: min(430px, calc(100vw - 32px)); overflow: auto; padding: 18px; border: 1px solid var(--vp-c-divider); border-radius: 10px; background: var(--vp-c-bg); box-shadow: 0 5px 26px #0003; }
header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
p { margin: 10px 0; line-height: 1.6; }
.review-help { color: var(--vp-c-text-2); font-size: 13px; }
.review-error { color: var(--vp-c-danger-1); }
.review-notice { color: var(--vp-c-brand-1); }
.review-draft, .review-note { margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--vp-c-divider); }
blockquote { margin: 10px 0; padding: 8px 10px; border-left: 3px solid var(--vp-c-brand-1); background: var(--vp-c-bg-soft); white-space: pre-wrap; overflow-wrap: anywhere; max-height: 180px; overflow: auto; }
textarea { width: 100%; margin: 8px 0; padding: 10px; border: 1px solid var(--vp-c-divider); border-radius: 6px; background: var(--vp-c-bg-soft); color: var(--vp-c-text-1); resize: vertical; font: inherit; }
.review-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.review-filters { display: flex; gap: 16px; margin-top: 20px; }
select { padding: 4px; background: var(--vp-c-bg-soft); color: var(--vp-c-text-1); border: 1px solid var(--vp-c-divider); border-radius: 4px; }
.review-status { margin-left: 8px; color: var(--vp-c-text-2); font-size: 12px; }
.review-comment { white-space: pre-wrap; overflow-wrap: anywhere; }
@media (max-width: 640px) { .review-toolbar { right: 10px; bottom: 10px; } .review-panel { top: 68px; right: 8px; bottom: 66px; width: calc(100vw - 16px); } }
</style>

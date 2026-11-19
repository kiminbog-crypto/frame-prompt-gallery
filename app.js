(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const gallery = $('#gallery');
  const viewer = $('#viewer');
  const stage = $('.viewer-main');
  const state = { entries: [], visible: [], index: 0 };

  const imageUrl = (path) => /^images\/[\w.-]+\.(png|jpe?g|webp|gif)$/i.test(path || '') ? path : '';
  const english = (entry) => entry.promptEn || entry.prompt || '';
  const korean = (entry) => entry.promptKo || '';
  const date = (entry) => entry.createdAt ? new Date(entry.createdAt).toLocaleDateString('ko-KR') : '';
  const el = (tag, className, value) => { const node = document.createElement(tag); if (className) node.className = className; if (value !== undefined) node.textContent = value; return node; };

  async function copy(value, button) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      button.textContent = '복사됨';
      window.setTimeout(() => { if (button.isConnected) button.textContent = '복사'; }, 1500);
    } catch { $('#status').textContent = '클립보드 복사에 실패했습니다.'; }
  }

  function promptRow(label, badge, value) {
    const row = el('div', 'prompt-row');
    const details = el('details');
    const summary = el('summary');
    summary.append(document.createTextNode(label + ' '), el('span', '', badge));
    const content = el('p', '', value || '등록된 프롬프트가 없습니다.');
    details.append(summary, content);
    const button = el('button', 'small-button', '복사');
    button.type = 'button'; button.disabled = !value; button.setAttribute('aria-label', `${label} 복사`);
    button.addEventListener('click', () => copy(value, button));
    row.append(details, button);
    return row;
  }

  function render() {
    const query = $('#searchInput').value.trim().toLocaleLowerCase();
    state.visible = state.entries.filter((entry) => [entry.title, english(entry), korean(entry), entry.note, ...(entry.tags || [])].join(' ').toLocaleLowerCase().includes(query));
    state.visible.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    gallery.replaceChildren();
    state.visible.forEach((entry, index) => {
      const card = el('article', 'card');
      const media = el('div', 'card-media');
      const img = el('img'); img.src = imageUrl(entry.image); img.alt = entry.title || '생성 이미지'; img.loading = 'lazy';
      const expand = el('button', 'expand-button', '크게 ⛶'); expand.type = 'button'; expand.setAttribute('aria-label', `${entry.title} 크게 보기`);
      expand.addEventListener('click', () => openViewer(index));
      img.addEventListener('click', () => openViewer(index)); img.style.cursor = 'zoom-in';
      media.append(img, expand);
      const body = el('div', 'card-body');
      body.append(el('h2', '', entry.title || '제목 없음'));
      const meta = el('p', 'card-meta', `${date(entry)}${entry.aspectRatio ? '  ◩ ' + entry.aspectRatio : ''}`);
      body.append(meta);
      const prompts = el('div', 'card-prompts');
      prompts.append(promptRow('영어 프롬프트', 'EN', english(entry)), promptRow('한글 프롬프트', 'KO', korean(entry)));
      body.append(prompts); card.append(media, body); gallery.append(card);
    });
    $('#count').textContent = `${state.visible.length} / ${state.entries.length}장`;
    $('#empty').hidden = state.visible.length > 0;
    $('#emptyTitle').textContent = query ? '검색 결과가 없습니다.' : '첫 이미지를 담아보세요.';
    $('#emptyCopy').textContent = query ? '다른 단어로 다시 검색해 보세요.' : '이 대화에서 이미지를 만든 뒤 “갤러리에 올려줘”라고 말해 주세요.';
    $('#emptyHow').hidden = Boolean(query);
  }

  function showViewerEntry() {
    const entry = state.visible[state.index];
    if (!entry) return;
    $('#viewerImage').src = imageUrl(entry.image);
    $('#viewerImage').alt = entry.title || '생성 이미지';
    $('#viewerTitle').textContent = entry.title || '제목 없음';
    $('#viewerMeta').textContent = `${date(entry)}${entry.aspectRatio ? '  ◩ ' + entry.aspectRatio : ''}  ·  ${state.index + 1} / ${state.visible.length}`;
    $('#viewerEn').textContent = english(entry) || '등록된 프롬프트가 없습니다.';
    $('#viewerKo').textContent = korean(entry) || '등록된 프롬프트가 없습니다.';
    $('#copyEn').disabled = !english(entry); $('#copyKo').disabled = !korean(entry);
    $('#copyEn').textContent = '복사'; $('#copyKo').textContent = '복사';
    $('#viewerTags').replaceChildren(...(entry.tags || []).map((tag) => el('span', '', tag)));
    $('#viewerNote').textContent = entry.note || '';
    $('#viewerNoteWrap').hidden = !entry.note;
    $('#originalLink').href = imageUrl(entry.image);
    stage.classList.remove('zoomed'); $('#fitButton').setAttribute('aria-pressed', 'false');
  }

  function openViewer(index) { state.index = index; showViewerEntry(); viewer.showModal(); }
  function move(delta) { if (!state.visible.length) return; state.index = (state.index + delta + state.visible.length) % state.visible.length; showViewerEntry(); }

  $('#howButton').addEventListener('click', () => $('#howDialog').showModal());
  $('#emptyHow').addEventListener('click', () => $('#howDialog').showModal());
  $('#searchInput').addEventListener('input', render);
  document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => $(`#${button.dataset.close}`).close()));
  $('#viewerClose').addEventListener('click', () => viewer.close());
  $('#prevButton').addEventListener('click', () => move(-1));
  $('#nextButton').addEventListener('click', () => move(1));
  $('#copyEn').addEventListener('click', (event) => copy(english(state.visible[state.index]), event.currentTarget));
  $('#copyKo').addEventListener('click', (event) => copy(korean(state.visible[state.index]), event.currentTarget));
  $('#panelToggle').addEventListener('click', () => {
    const hidden = viewer.classList.toggle('panel-hidden');
    $('#panelToggle').setAttribute('aria-pressed', String(!hidden));
    $('#panelToggle').setAttribute('aria-label', hidden ? '프롬프트 패널 보이기' : '프롬프트 패널 숨기기');
  });
  $('#fitButton').addEventListener('click', () => { const zoomed = stage.classList.toggle('zoomed'); $('#fitButton').setAttribute('aria-pressed', String(zoomed)); });
  document.addEventListener('keydown', (event) => { if (!viewer.open) return; if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); } if (event.key === 'ArrowRight') { event.preventDefault(); move(1); } });
  let touchX = null; stage.addEventListener('touchstart', (event) => { touchX = event.changedTouches[0].screenX; }, { passive: true });
  stage.addEventListener('touchend', (event) => { if (touchX === null) return; const dx = event.changedTouches[0].screenX - touchX; if (Math.abs(dx) > 55) move(dx < 0 ? 1 : -1); touchX = null; }, { passive: true });

  fetch(`data/entries.json?v=${Date.now()}`, { cache: 'no-store' })
    .then((response) => { if (!response.ok) throw new Error('목록을 불러올 수 없습니다.'); return response.json(); })
    .then((entries) => { if (!Array.isArray(entries)) throw new Error('목록 형식이 올바르지 않습니다.'); state.entries = entries; render(); })
    .catch((error) => { $('#status').textContent = error.message; });
})();

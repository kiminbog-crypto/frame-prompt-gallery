(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const els = {
    gallery: $('#gallery'), empty: $('#empty'), status: $('#status'), total: $('#totalCount'),
    entry: $('#entryDialog'), settings: $('#settingsDialog'), detail: $('#detailDialog'),
    form: $('#entryForm'), image: $('#imageInput'), preview: $('#uploadPreview'), hint: $('#uploadHint')
  };
  const state = { entries: [], repo: localStorage.getItem('frame.repo') || '', token: '', selected: null };
  $('#year').textContent = new Date().getFullYear();
  $('#repoInput').value = state.repo ? `https://github.com/${state.repo}` : '';

  function message(value) { els.status.textContent = value; $('#entryStatus').textContent = value; $('#settingsStatus').textContent = value; }
  function parseRepo(input) {
    const value = input.trim().replace(/\/$/, '').replace(/\.git$/, '');
    const match = value.match(/^(?:https:\/\/github\.com\/)?([\w.-]+)\/([\w.-]+)$/i);
    if (!match || match[1] === '.' || match[2] === '.') throw new Error('GitHub 저장소 주소를 확인해 주세요.');
    return `${match[1]}/${match[2]}`;
  }
  function apiPath(path) { return `https://api.github.com/repos/${state.repo}/${path}`; }
  async function github(path, options = {}) {
    const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...options.headers };
    if (state.token) headers.Authorization = `Bearer ${state.token}`;
    const response = await fetch(apiPath(path), { ...options, headers, cache: 'no-store' });
    if (!response.ok) {
      let detail = '';
      try { detail = (await response.json()).message || ''; } catch {}
      throw new Error(response.status === 401 ? '토큰이 유효하지 않습니다.' : response.status === 403 ? '저장소 쓰기 권한 또는 API 사용 한도를 확인해 주세요.' : response.status === 404 ? '저장소를 찾을 수 없습니다. 주소와 접근 권한을 확인해 주세요.' : `GitHub 오류 ${response.status}: ${detail}`);
    }
    return response.json();
  }
  function base64(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return btoa(binary);
  }
  function decode64(input) {
    const binary = atob(input.replace(/\s/g, ''));
    return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
  }
  async function content(path) {
    const file = await github(`contents/${path}?ref=${encodeURIComponent('main')}`);
    return { sha: file.sha, value: decode64(file.content) };
  }
  async function write(path, bytes, text) {
    let sha;
    try { sha = (await github(`contents/${path}`)).sha; }
    catch (error) { if (!error.message.includes('찾을 수 없습니다')) throw error; }
    return github(`contents/${path}`, {
      method: 'PUT',
      body: JSON.stringify({ message: text, content: base64(bytes), ...(sha ? { sha } : {}) }),
      headers: { 'Content-Type': 'application/json' }
    });
  }
  async function loadEntries() {
    try {
      let data;
      if (state.repo) {
        const file = await github('contents/data/entries.json');
        data = JSON.parse(decode64(file.content));
      } else {
        const response = await fetch(`data/entries.json?v=${Date.now()}`, { cache: 'no-store' });
        if (!response.ok) throw new Error('목록을 불러올 수 없습니다.');
        data = await response.json();
      }
      if (!Array.isArray(data)) throw new Error('목록 파일의 형식이 올바르지 않습니다.');
      state.entries = data;
      render();
    } catch (error) { message(error.message); }
  }
  function imageUrl(path) {
    if (!/^images\/[\w.-]+\.(png|jpe?g|webp|gif)$/i.test(path)) return '';
    return state.repo ? `https://raw.githubusercontent.com/${state.repo}/main/${path}` : path;
  }
  function render() {
    const search = $('#searchInput').value.trim().toLocaleLowerCase();
    const sort = $('#sortSelect').value;
    const entries = state.entries.filter((entry) => [entry.title, entry.prompt, entry.note, ...(entry.tags || [])].join(' ').toLocaleLowerCase().includes(search));
    entries.sort((a, b) => sort === 'title' ? String(a.title).localeCompare(String(b.title), 'ko') : sort === 'oldest' ? String(a.createdAt).localeCompare(String(b.createdAt)) : String(b.createdAt).localeCompare(String(a.createdAt)));
    els.gallery.replaceChildren();
    for (const entry of entries) {
      const article = document.createElement('article');
      article.className = 'card';
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'card-button';
      button.setAttribute('aria-label', `${entry.title} 자세히 보기`);
      const picture = document.createElement('span'); picture.className = 'card-image';
      const img = document.createElement('img'); img.src = imageUrl(entry.image); img.alt = entry.title; img.loading = 'lazy';
      picture.append(img);
      const title = document.createElement('span'); title.className = 'card-title'; title.textContent = entry.title;
      const meta = document.createElement('span'); meta.className = 'card-meta';
      meta.textContent = `${new Date(entry.createdAt).toLocaleDateString('ko-KR')} · ${(entry.tags || []).slice(0, 2).join(' · ') || '이미지'}`;
      button.append(picture, title, meta); button.addEventListener('click', () => showDetail(entry)); article.append(button); els.gallery.append(article);
    }
    els.total.textContent = String(state.entries.length).padStart(2, '0');
    els.empty.hidden = entries.length > 0;
    if (!entries.length) {
      $('#emptyTitle').textContent = search ? '검색 결과가 없습니다.' : '첫 이미지를 담아보세요.';
      $('#emptyCopy').textContent = search ? '다른 단어로 다시 검색해 보세요.' : '이미지와 프롬프트를 등록하면 이곳에 함께 표시됩니다.';
      $('#emptyAdd').hidden = Boolean(search);
    }
  }
  function showDetail(entry) {
    $('#detailImage').src = imageUrl(entry.image); $('#detailImage').alt = entry.title;
    $('#detailDate').textContent = new Date(entry.createdAt).toLocaleDateString('ko-KR');
    $('#detailTitle').textContent = entry.title;
    $('#detailPrompt').textContent = entry.prompt;
    $('#detailNote').textContent = entry.note || '';
    $('#detailNoteWrap').hidden = !entry.note;
    $('#detailTags').replaceChildren(...(entry.tags || []).map((tag) => { const el = document.createElement('span'); el.textContent = tag; return el; }));
    $('#detailOriginal').href = imageUrl(entry.image);
    state.selected = entry;
    els.detail.showModal();
  }
  function openEntry() {
    if (!state.repo || !state.token) { els.settings.showModal(); message('먼저 GitHub 저장소와 쓰기 토큰을 연결해 주세요.'); return; }
    els.entry.showModal();
  }

  $('#addButton').addEventListener('click', openEntry);
  $('#emptyAdd').addEventListener('click', openEntry);
  $('#settingsButton').addEventListener('click', () => els.settings.showModal());
  $('#searchInput').addEventListener('input', render);
  $('#sortSelect').addEventListener('change', render);
  document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => $(`#${button.dataset.close}`).close()));
  for (const dialog of [els.entry, els.settings, els.detail]) dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });

  $('#settingsForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = event.submitter; button.disabled = true;
    const oldRepo = state.repo; const oldToken = state.token;
    try {
      state.repo = parseRepo($('#repoInput').value);
      state.token = $('#tokenInput').value.trim();
      if (!state.token) throw new Error('게시하려면 토큰을 입력해 주세요.');
      const repo = await github('');
      if (!repo.permissions?.push) throw new Error('이 저장소에 쓰기 권한이 없습니다.');
      if (repo.default_branch !== 'main') throw new Error('이 앱은 main 브랜치를 사용합니다. 저장소 기본 브랜치를 main으로 설정해 주세요.');
      if (repo.private) throw new Error('GitHub Pages 공개 갤러리에는 공개 저장소를 사용해 주세요.');
      await github('contents/data/entries.json');
      localStorage.setItem('frame.repo', state.repo);
      $('#tokenInput').value = '';
      els.settings.close();
      await loadEntries();
      message(`${state.repo} 저장소가 연결되었습니다. 현재 탭에서 게시할 수 있습니다.`);
    } catch (error) { state.repo = oldRepo; state.token = oldToken; message(error.message); }
    finally { button.disabled = false; }
  });
  $('#disconnectButton').addEventListener('click', () => {
    state.repo = ''; state.token = ''; localStorage.removeItem('frame.repo');
    $('#repoInput').value = ''; $('#tokenInput').value = ''; els.settings.close();
    loadEntries(); message('GitHub 연결을 해제했습니다.');
  });

  function previewFile(file) {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) { message('PNG, JPG, WEBP, GIF 이미지만 등록할 수 있습니다.'); return; }
    if (file.size > 10 * 1024 * 1024) { message('이미지는 10MB 이하로 선택해 주세요.'); return; }
    if (els.preview.dataset.url) URL.revokeObjectURL(els.preview.dataset.url);
    els.preview.dataset.url = URL.createObjectURL(file);
    els.preview.src = els.preview.dataset.url; els.preview.hidden = false; els.hint.hidden = true;
  }
  els.image.addEventListener('change', () => previewFile(els.image.files[0]));
  const zone = $('#uploadZone');
  zone.addEventListener('dragover', (event) => { event.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', (event) => {
    event.preventDefault(); zone.classList.remove('dragover');
    const file = event.dataTransfer.files[0]; if (!file) return;
    const transfer = new DataTransfer(); transfer.items.add(file); els.image.files = transfer.files; previewFile(file);
  });
  els.form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!els.form.reportValidity()) return;
    const file = els.image.files[0];
    if (!file || !['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type) || file.size > 10 * 1024 * 1024) { message('10MB 이하의 PNG, JPG, WEBP, GIF 이미지를 선택해 주세요.'); return; }
    if (!state.repo || !state.token) { els.entry.close(); els.settings.showModal(); return; }
    const submit = $('#submitEntry'); submit.disabled = true; submit.textContent = '업로드 중…';
    try {
      const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' }[file.type];
      const id = crypto.randomUUID(); const path = `images/${id}.${ext}`;
      const data = new FormData(els.form);
      const entry = { id, title: String(data.get('title')).trim(), prompt: String(data.get('prompt')).trim(), note: String(data.get('note')).trim(), tags: String(data.get('tags')).split(',').map((tag) => tag.trim()).filter(Boolean), image: path, createdAt: new Date().toISOString() };
      if (!entry.title || !entry.prompt) throw new Error('제목과 프롬프트를 입력해 주세요.');
      message('이미지를 GitHub에 올리고 있습니다…');
      await write(path, new Uint8Array(await file.arrayBuffer()), `Add image: ${entry.title}`);
      message('프롬프트 목록을 갱신하고 있습니다…');
      let saved = false;
      for (let attempt = 0; attempt < 3 && !saved; attempt++) {
        const current = await github('contents/data/entries.json');
        const entries = JSON.parse(decode64(current.content));
        if (!Array.isArray(entries)) throw new Error('목록 파일 형식이 올바르지 않습니다.');
        entries.unshift(entry);
        const response = await fetch(apiPath('contents/data/entries.json'), {
          method: 'PUT',
          headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', Authorization: `Bearer ${state.token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: `Add prompt: ${entry.title}`, content: base64(new TextEncoder().encode(JSON.stringify(entries, null, 2) + '\n')), sha: current.sha })
        });
        if (response.ok) saved = true;
        else if (response.status !== 409) throw new Error(`목록 갱신 실패 (${response.status}). 이미지 파일 ${path}는 저장되었습니다.`);
      }
      if (!saved) throw new Error(`동시 수정으로 목록 갱신에 실패했습니다. 이미지 파일 ${path}는 저장되었습니다.`);
      state.entries.unshift(entry); render(); els.entry.close(); els.form.reset();
      if (els.preview.dataset.url) URL.revokeObjectURL(els.preview.dataset.url);
      els.preview.hidden = true; els.hint.hidden = false;
      message('게시했습니다. GitHub Pages에 표시되기까지 잠시 걸릴 수 있습니다.');
    } catch (error) { message(error.message); }
    finally { submit.disabled = false; submit.textContent = 'GitHub에 게시'; }
  });
  $('#copyButton').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(state.selected.prompt); $('#copyButton').textContent = '복사됨'; setTimeout(() => { $('#copyButton').textContent = '복사하기'; }, 1600); }
    catch { message('클립보드 접근이 차단되었습니다.'); }
  });
  loadEntries();
})();

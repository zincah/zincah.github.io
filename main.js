/* =============================================
   MY DESKTOP.exe — main.js
   ============================================= */

/* =============================================
   BOOT SEQUENCE
   ============================================= */
const BOOT_STEPS = [
  { label: '✓ fonts loaded',           pct: 28 },
  { label: '✓ stickers ready',         pct: 55 },
  { label: '✓ windows initialized',    pct: 80 },
  { label: '○ launching portfolio...', pct: 100 },
];

const BLOCK_TOTAL = 20;

function updateBootProgress(pct) {
  const bar      = document.getElementById('boot-bar');
  const pctEl    = document.getElementById('boot-percent');
  const blocksEl = document.getElementById('boot-pct-blocks');
  if (bar)      bar.style.width   = pct + '%';
  if (pctEl)    pctEl.textContent  = pct + '%';
  if (blocksEl) {
    const filled = Math.round((pct / 100) * BLOCK_TOTAL);
    blocksEl.textContent =
      '█'.repeat(filled) + '░'.repeat(BLOCK_TOTAL - filled);
  }
}

function typeText(el, text, speed, onDone) {
  let i = 0;
  el.textContent = '';
  const cursor = document.createElement('span');
  cursor.className = 'boot-cursor';
  el.appendChild(cursor);

  function tick() {
    el.insertBefore(document.createTextNode(text[i++]), cursor);
    if (i < text.length) {
      setTimeout(tick, speed);
    } else {
      cursor.remove();
      if (onDone) onDone();
    }
  }
  tick();
}

function smoothProgress(from, to, duration, onDone) {
  const start = performance.now();
  function frame(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    updateBootProgress(Math.round(from + (to - from) * eased));
    if (t < 1) requestAnimationFrame(frame);
    else if (onDone) onDone();
  }
  requestAnimationFrame(frame);
}

function runBoot() {
  const screen    = document.getElementById('boot-screen');
  const desktop   = document.getElementById('desktop');
  const list      = document.getElementById('boot-checklist');
  const completeEl = document.getElementById('boot-complete');

  list.innerHTML = '';
  updateBootProgress(0);

  let currentPct = 0;
  let stepIndex  = 0;

  /* 초기 로딩 느낌 0→8% */
  setTimeout(() => {
    smoothProgress(0, 8, 300, runNextStep);
  }, 600);

  function runNextStep() {
    if (stepIndex >= BOOT_STEPS.length) {
      /* 완료 */
      setTimeout(() => {
        if (completeEl) completeEl.classList.add('show');
        setTimeout(transitionToDesktop, 700);
      }, 300);
      return;
    }

    const s    = BOOT_STEPS[stepIndex];
    const prev = currentPct;
    currentPct = s.pct;
    stepIndex++;

    /* 항목 생성 */
    const li = document.createElement('li');
    list.appendChild(li);

    /* 타이핑 시작과 함께 프로그레스 점진 증가 */
    li.classList.add('visible');
    smoothProgress(prev, s.pct, 450, null);
    typeText(li, s.label, 38, () => {
      setTimeout(runNextStep, 180);
    });
  }

  function transitionToDesktop() {
    screen.style.opacity = '0';
    desktop.classList.remove('hidden');
    desktop.classList.add('fade-in');
    setTimeout(() => {
      screen.style.display = 'none';
      onDesktopReady();
    }, 620);
  }
}

/* =============================================
   CLOCK
   ============================================= */
function startClock() {
  const el = document.getElementById('taskbar-clock');
  function tick() {
    const d = new Date();
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    el.textContent = h + ':' + m;
  }
  tick();
  setInterval(tick, 1000);
}

/* =============================================
   Z-INDEX & FOCUS MANAGER
   ============================================= */
let zCounter = 200;
let focusedWin = null;

function bringToFront(win) {
  zCounter++;
  win.style.zIndex = zCounter;
  setFocused(win);
}

function setFocused(win) {
  if (focusedWin === win) return;
  if (focusedWin) focusedWin.classList.remove('focused');
  focusedWin = win;
  if (win) win.classList.add('focused');
}

/* =============================================
   WINDOW OPEN / CLOSE / MINIMIZE
   ============================================= */
const minimized = new Set();

function openWindow(id) {
  const win = document.getElementById(id);
  if (!win) return;

  win.classList.remove('closing');

  if (minimized.has(id)) {
    minimized.delete(id);
    win.style.display = 'block';
    win.classList.add('open');
  } else if (win.style.display === 'none' || !win.classList.contains('open')) {
    win.style.display = 'block';
    win.classList.add('open');
    if (id === 'win-skills') animateSkillBars();
  }

  bringToFront(win);
  syncTaskbar();
}

function closeWindow(id) {
  const win = document.getElementById(id);
  if (!win || win.style.display === 'none') return;

  win.classList.add('closing');
  win.addEventListener('animationend', () => {
    win.style.display = 'none';
    win.classList.remove('open', 'closing');
    minimized.delete(id);
    if (focusedWin === win) setFocused(null);
    syncTaskbar();
  }, { once: true });
}

function minimizeWindow(id) {
  const win = document.getElementById(id);
  if (!win || win.style.display === 'none') return;
  win.classList.add('closing');
  win.addEventListener('animationend', () => {
    win.style.display = 'none';
    win.classList.remove('open', 'closing');
    minimized.add(id);
    if (focusedWin === win) setFocused(null);
    syncTaskbar();
  }, { once: true });
}

function toggleWindow(id) {
  const win = document.getElementById(id);
  if (!win) return;
  if (win.style.display === 'none' || minimized.has(id)) {
    openWindow(id);
  } else {
    minimizeWindow(id);
  }
}

/* =============================================
   TASKBAR SYNC
   ============================================= */
const WIN_IDS = ['win-about', 'win-skills', 'win-projects', 'win-contact'];

function syncTaskbar() {
  WIN_IDS.forEach(id => {
    const btn = document.querySelector(`.taskbar-win-btn[data-window="${id}"]`);
    if (!btn) return;
    const win = document.getElementById(id);
    btn.classList.remove('active', 'minimized');
    if (minimized.has(id)) {
      btn.classList.add('minimized');
    } else if (win && win.style.display !== 'none') {
      btn.classList.add('active');
    }
  });
}

/* =============================================
   SHAKE DETECTION (공유 상태)
   ============================================= */
let lastShakeTriggered = 0;

function detectShake(cx) {
  const now = performance.now();
  if (!detectShake._hist) detectShake._hist = [];
  detectShake._hist.push({ x: cx, t: now });
  detectShake._hist = detectShake._hist.filter(p => now - p.t < 650);

  const hist = detectShake._hist;
  if (hist.length < 5) return false;
  if (now - lastShakeTriggered < 3000) return false;

  let reversals = 0;
  for (let i = 1; i < hist.length - 1; i++) {
    const d1 = hist[i].x - hist[i - 1].x;
    const d2 = hist[i + 1].x - hist[i].x;
    if (d1 * d2 < 0 && Math.abs(d1) > 7) reversals++;
  }

  if (reversals >= 3) {
    lastShakeTriggered = now;
    detectShake._hist = [];
    return true;
  }
  return false;
}

/* =============================================
   DRAG (mouse + touch)
   ============================================= */
function initDrag(win) {
  const titlebar = win.querySelector('.win-titlebar');
  if (!titlebar) return;

  let dragging = false, ox = 0, oy = 0;

  function startDrag(cx, cy) {
    dragging = true;
    const rect = win.getBoundingClientRect();
    ox = cx - rect.left;
    oy = cy - rect.top;
    bringToFront(win);
    win.classList.add('dragging');
    document.body.style.userSelect = 'none';
  }

  function moveDrag(cx, cy) {
    if (!dragging) return;
    let nx = cx - ox;
    let ny = cy - oy;
    const taskbarH = 40;
    nx = Math.max(0, Math.min(window.innerWidth  - win.offsetWidth,  nx));
    ny = Math.max(0, Math.min(window.innerHeight - win.offsetHeight - taskbarH, ny));
    win.style.left      = nx + 'px';
    win.style.top       = ny + 'px';
    win.style.transform = 'none';

    /* 흔들기 감지 → 스티커 추가 이스터에그 */
    if (detectShake(cx)) {
      addRandomSticker();
      showToast('✨ 스티커 획득!');
    }
  }

  function endDrag() {
    dragging = false;
    win.classList.remove('dragging');
    document.body.style.userSelect = '';
  }

  /* mouse */
  titlebar.addEventListener('mousedown', e => {
    if (e.target.classList.contains('win-btn')) return;
    startDrag(e.clientX, e.clientY);
  });
  document.addEventListener('mousemove', e => moveDrag(e.clientX, e.clientY));
  document.addEventListener('mouseup', endDrag);

  /* touch */
  titlebar.addEventListener('touchstart', e => {
    if (e.target.classList.contains('win-btn')) return;
    const t = e.touches[0];
    startDrag(t.clientX, t.clientY);
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!dragging) return;
    e.preventDefault();
    const t = e.touches[0];
    moveDrag(t.clientX, t.clientY);
  }, { passive: false });
  document.addEventListener('touchend', endDrag);

  win.addEventListener('mousedown', () => bringToFront(win));
  win.addEventListener('touchstart', () => bringToFront(win), { passive: true });
}

/* =============================================
   STICKER DRAG
   ============================================= */
function initStickerDrag(el) {
  let dragging = false, ox = 0, oy = 0;

  function startDrag(cx, cy) {
    dragging = true;
    const rect = el.getBoundingClientRect();
    /* % → px 로 전환해서 드래그 중 정확한 위치 추적 */
    el.style.left = rect.left + 'px';
    el.style.top  = rect.top  + 'px';
    el.style.right  = 'auto';
    el.style.bottom = 'auto';
    ox = cx - rect.left;
    oy = cy - rect.top;
    el.classList.add('s-dragging');
    document.body.style.userSelect = 'none';
  }

  function moveDrag(cx, cy) {
    if (!dragging) return;
    const nx = Math.max(0, Math.min(window.innerWidth  - el.offsetWidth,  cx - ox));
    const ny = Math.max(0, Math.min(window.innerHeight - el.offsetHeight - 44, cy - oy));
    el.style.left = nx + 'px';
    el.style.top  = ny + 'px';
  }

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    el.classList.remove('s-dragging');
    document.body.style.userSelect = '';
  }

  el.addEventListener('mousedown', e => { e.stopPropagation(); startDrag(e.clientX, e.clientY); });
  document.addEventListener('mousemove', e => moveDrag(e.clientX, e.clientY));
  document.addEventListener('mouseup', endDrag);

  el.addEventListener('touchstart', e => {
    e.stopPropagation();
    const t = e.touches[0];
    startDrag(t.clientX, t.clientY);
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!dragging) return;
    e.preventDefault();
    const t = e.touches[0];
    moveDrag(t.clientX, t.clientY);
  }, { passive: false });
  document.addEventListener('touchend', endDrag);
}

/* =============================================
   STICKER INIT & ADD
   ============================================= */
const FLOAT_CLASSES = ['bob', 'bob-slow', 'bob-rev', '', '', ''];
const STICKER_POOL  = ['⭐','✨','🌸','🎀','💫','🌟','🦋','🍀','💕','🎵'];

function initStickers() {
  document.querySelectorAll('.sticker').forEach((el, i) => {
    const rot = el.dataset.rot || '0';
    el.style.setProperty('--s-rot', rot + 'deg');
    /* float 클래스 순환 배정 */
    const cls = FLOAT_CLASSES[i % FLOAT_CLASSES.length];
    if (cls) el.classList.add(cls);
    initStickerDrag(el);
  });
}

function addRandomSticker() {
  const desktop = document.getElementById('desktop');
  if (!desktop) return;

  const emoji = STICKER_POOL[Math.floor(Math.random() * STICKER_POOL.length)];
  const size  = 32 + Math.floor(Math.random() * 28);
  const top   = 10 + Math.floor(Math.random() * 65);
  const left  = 20 + Math.floor(Math.random() * 65);
  const rot   = -15 + Math.floor(Math.random() * 30);

  const el = document.createElement('div');
  el.className = 'sticker pop';
  el.style.cssText = `top:${top}%;left:${left}%;font-size:${size}px`;
  el.style.setProperty('--s-rot', rot + 'deg');
  el.textContent = emoji;

  /* 아이콘 앞, 창 뒤에 삽입 */
  const icons = desktop.querySelector('.desktop-icons');
  desktop.insertBefore(el, icons);

  /* pop 끝나면 float 붙이기 */
  el.addEventListener('animationend', () => {
    el.classList.remove('pop');
    const cls = FLOAT_CLASSES[Math.floor(Math.random() * FLOAT_CLASSES.length)];
    if (cls) el.classList.add(cls);
    initStickerDrag(el);

    /* wiggle로 주목 */
    el.classList.add('wiggle');
    el.addEventListener('animationend', () => el.classList.remove('wiggle'), { once: true });
  }, { once: true });
}

/* =============================================
   RESIZE (SE corner + E edge + S edge)
   ============================================= */
function initResize(win) {
  const handles = ['se', 'e', 's'];

  handles.forEach(dir => {
    const handle = document.createElement('div');
    handle.className = `resize-handle ${dir}`;
    win.appendChild(handle);

    let resizing = false, sx = 0, sy = 0, sw = 0, sh = 0;

    function startResize(cx, cy) {
      resizing = true;
      sx = cx; sy = cy;
      sw = win.offsetWidth;
      sh = win.offsetHeight;
      bringToFront(win);
      document.body.style.userSelect = 'none';
    }

    function doResize(cx, cy) {
      if (!resizing) return;
      const dx = cx - sx;
      const dy = cy - sy;
      if (dir === 'se' || dir === 'e') win.style.width  = Math.max(260, sw + dx) + 'px';
      if (dir === 'se' || dir === 's') {
        const body = win.querySelector('.win-body');
        const newH = Math.max(100, sh - 28 + dy);
        if (body) body.style.maxHeight = newH + 'px';
      }
    }

    function endResize() { resizing = false; document.body.style.userSelect = ''; }

    handle.addEventListener('mousedown', e => { e.stopPropagation(); startResize(e.clientX, e.clientY); });
    document.addEventListener('mousemove', e => doResize(e.clientX, e.clientY));
    document.addEventListener('mouseup', endResize);
  });
}

/* =============================================
   DESKTOP ICON — SINGLE / DOUBLE CLICK
   ============================================= */
function initIcons() {
  let lastClick = { id: null, time: 0 };

  document.querySelectorAll('.icon').forEach(icon => {
    icon.addEventListener('click', e => {
      const id = icon.id;
      const now = Date.now();

      document.querySelectorAll('.icon').forEach(i => i.classList.remove('selected'));
      icon.classList.add('selected');

      if (lastClick.id === id && now - lastClick.time < 400) {
        openWindow(icon.dataset.window);
        lastClick = { id: null, time: 0 };
      } else {
        lastClick = { id, time: now };
      }
    });
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.icon')) {
      document.querySelectorAll('.icon').forEach(i => i.classList.remove('selected'));
    }
  });
}

/* =============================================
   TITLEBAR BUTTONS
   ============================================= */
function initWinButtons() {
  document.querySelectorAll('.win-close').forEach(btn => {
    btn.addEventListener('click', () => closeWindow(btn.dataset.window));
  });
  document.querySelectorAll('.win-min').forEach(btn => {
    btn.addEventListener('click', () => minimizeWindow(btn.dataset.window));
  });
  document.querySelectorAll('.win-max').forEach(btn => {
    btn.addEventListener('click', () => {
      const win = document.getElementById(btn.dataset.window);
      if (!win) return;
      const body = win.querySelector('.win-body');
      if (win.dataset.maximized === '1') {
        const prev = JSON.parse(win.dataset.prevStyle || '{}');
        win.style.left   = prev.left   || '';
        win.style.top    = prev.top    || '';
        win.style.width  = prev.width  || '';
        win.style.transform = prev.transform || '';
        if (body) body.style.maxHeight = prev.bodyH || '';
        win.dataset.maximized = '0';
      } else {
        win.dataset.prevStyle = JSON.stringify({
          left: win.style.left, top: win.style.top,
          width: win.style.width, transform: win.style.transform,
          bodyH: body ? body.style.maxHeight : '',
        });
        win.style.left = '0px';  win.style.top = '0px';
        win.style.width = '100vw'; win.style.transform = 'none';
        if (body) body.style.maxHeight = 'calc(100vh - 40px - 28px)';
        win.dataset.maximized = '1';
        bringToFront(win);
      }
    });
  });
}

/* =============================================
   TASKBAR BUTTONS
   ============================================= */
function initTaskbar() {
  document.querySelectorAll('.taskbar-win-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleWindow(btn.dataset.window));
  });

  document.getElementById('btn-start')?.addEventListener('click', () => {
    WIN_IDS.forEach(id => openWindow(id));
  });
}

/* =============================================
   SKILL BAR ANIMATION (창 열 때마다 재실행)
   ============================================= */
function animateSkillBars() {
  const bars = document.querySelectorAll('#win-skills .skill-bar-fill');
  bars.forEach(bar => { bar.style.width = '0%'; });
  requestAnimationFrame(() => {
    setTimeout(() => {
      bars.forEach(bar => { bar.style.width = (bar.dataset.pct || 0) + '%'; });
    }, 80);
  });
}

/* =============================================
   PROJECT DATA & DETAIL MODAL
   ============================================= */
const PROJECT_DATA = {
  'company-1': {
    name: '[프로젝트명-1]',
    type: 'Company',
    desc: '[프로젝트 상세 설명을 여기에 입력하세요. 어떤 시스템인지, 어떤 역할을 맡았는지 등을 작성합니다.]',
    tech: ['Java', 'Spring', 'Oracle', 'MyBatis'],
    achievements: ['[성과 1]', '[성과 2]'],
    link: null,
  },
  'company-2': {
    name: '[프로젝트명-2]',
    type: 'Company',
    desc: '[프로젝트 상세 설명을 여기에 입력하세요.]',
    tech: ['Oracle', 'MyBatis', 'Linux'],
    achievements: ['[성과 1]', '[성과 2]'],
    link: null,
  },
  'personal-1': {
    name: 'ArticleSummary Pro',
    type: 'Personal',
    desc: 'Claude AI(claude-sonnet-4-6)를 활용한 AI 기반 기사 요약 서비스. URL 또는 텍스트를 입력하면 실시간 스트리밍으로 기사를 요약하며, 요약 길이·톤 선택, 히스토리 저장·즐겨찾기, 다크모드 등을 지원합니다.',
    tech: ['React 18', 'Vite', 'Tailwind CSS', 'Node.js', 'Express', 'Claude API'],
    achievements: [
      'Claude Streaming API를 활용한 실시간 타이핑 효과 구현',
      '요약 길이(짧음/중간/길음) 및 톤(중립/전문/쉬움) 커스터마이징',
      '로컬 스토리지 기반 히스토리·즐겨찾기 관리',
    ],
    link: 'https://github.com/zincah/article-summary-pro',
  },
};

function openProjectDetail(projId) {
  const data = PROJECT_DATA[projId];
  if (!data) return;

  const titleEl = document.getElementById('detail-title');
  const bodyEl  = document.getElementById('detail-body');
  if (!titleEl || !bodyEl) return;

  titleEl.textContent = data.name + '.txt';

  const techTags = data.tech.map(t =>
    `<span class="detail-tech-tag">${t}</span>`
  ).join('');

  const achievements = data.achievements.map(a =>
    `<div class="detail-achievement">${a}</div>`
  ).join('');

  const linkHtml = data.link
    ? `<a href="${data.link}" target="_blank" class="detail-link">🔗 GitHub →</a>`
    : `<span class="detail-section" style="color:#bbb">CLASSIFIED — internal project</span>`;

  bodyEl.innerHTML = `
    <div class="detail-name">${data.name}</div>
    <div class="detail-section">> DESCRIPTION</div>
    <div class="detail-desc">${data.desc}</div>
    <div class="detail-section">> TECH STACK</div>
    <div class="detail-tech-list">${techTags}</div>
    <div class="detail-section">> ACHIEVEMENTS</div>
    ${achievements}
    <hr class="win-divider" />
    <div class="detail-section">> LINK</div>
    ${linkHtml}
  `;

  openWindow('win-proj-detail');
}

function initProjects() {
  document.querySelectorAll('.proj-open-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openProjectDetail(btn.dataset.projId);
    });
  });
}

/* =============================================
   CONTACT SEND BUTTON
   ============================================= */
function showToast(msg, duration = 2500) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), duration);
}

function initContact() {
  document.getElementById('about-btn-ok')?.addEventListener('click',    () => closeWindow('win-about'));
  document.getElementById('about-btn-close')?.addEventListener('click', () => closeWindow('win-about'));
  document.getElementById('contact-btn-cancel')?.addEventListener('click', () => closeWindow('win-contact'));

  document.getElementById('btn-send')?.addEventListener('click', () => {
    const from = document.getElementById('contact-from');
    const msg  = document.getElementById('contact-msg');
    const errEl = document.getElementById('contact-error');

    from?.classList.remove('error');
    msg?.classList.remove('error');
    if (errEl) errEl.textContent = '';

    const fromVal = from?.value.trim() || '';
    const msgVal  = msg?.value.trim()  || '';

    if (!fromVal) {
      from?.classList.add('error');
      if (errEl) errEl.textContent = 'From 필드를 입력하세요';
      from?.focus();
      return;
    }
    if (!msgVal) {
      msg?.classList.add('error');
      if (errEl) errEl.textContent = '메시지를 입력하세요';
      msg?.focus();
      return;
    }

    const body = `From: ${fromVal}\n\n${msgVal}`;
    window.location.href = `mailto:[이메일 주소]?subject=Portfolio Contact&body=${encodeURIComponent(body)}`;
    showToast('✉ 메일 앱을 열었습니다!');
  });
}

/* =============================================
   ERROR POPUP (random)
   ============================================= */
function scheduleErrorPopup() {
  const delay = 30000 + Math.random() * 30000;
  setTimeout(() => {
    const popup = document.getElementById('win-error');
    if (!popup) return;
    popup.style.display = 'block';
    bringToFront(popup);
  }, delay);

  document.getElementById('btn-error-yes')?.addEventListener('click', () => {
    closeWindow('win-error');
    openWindow('win-contact');
  });
  const noBtn = document.getElementById('btn-error-no');
  if (noBtn) {
    let noBtnFixed = false;

    noBtn.addEventListener('mousemove', (e) => {
      const btn = e.currentTarget;
      const rect = btn.getBoundingClientRect();

      if (!noBtnFixed) {
        /* 처음 hover 시: 현재 위치 그대로 fixed로 고정 (순간이동 방지) */
        btn.style.transition = 'none';
        btn.style.position = 'fixed';
        btn.style.left = rect.left + 'px';
        btn.style.top  = rect.top  + 'px';
        btn.style.zIndex = 9999;
        btn.offsetHeight; /* reflow 강제 */
        btn.style.transition = 'left 0.22s cubic-bezier(0.25, 0.46, 0.45, 0.94), top 0.22s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        noBtnFixed = true;
      }

      const btnCx = rect.left + rect.width / 2;
      const btnCy = rect.top  + rect.height / 2;
      const dx = btnCx - e.clientX;
      const dy = btnCy - e.clientY;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const flee = 110;
      let nx = btnCx + (dx / dist) * flee;
      let ny = btnCy + (dy / dist) * flee;

      const pad = 8;
      nx = Math.max(rect.width  / 2 + pad, Math.min(window.innerWidth  - rect.width  / 2 - pad, nx));
      ny = Math.max(rect.height / 2 + pad, Math.min(window.innerHeight - rect.height / 2 - pad, ny));

      btn.style.left = (nx - rect.width  / 2) + 'px';
      btn.style.top  = (ny - rect.height / 2) + 'px';
    });

    const resetNoBtn = () => {
      noBtn.style.transition = 'none';
      noBtn.style.position = '';
      noBtn.style.left = '';
      noBtn.style.top  = '';
      noBtn.style.zIndex = '';
      noBtnFixed = false;
    };

    document.getElementById('btn-error-yes')?.addEventListener('click', resetNoBtn);

    const popup = document.getElementById('win-error');
    const observer = new MutationObserver(() => {
      if (popup.style.display === 'block') resetNoBtn();
    });
    if (popup) observer.observe(popup, { attributes: true, attributeFilter: ['style'] });
  }
}

/* =============================================
   INIT
   ============================================= */
/* =============================================
   KEYBOARD
   ============================================= */
function initKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && focusedWin) {
      const id = focusedWin.id;
      if (id) minimizeWindow(id);
    }
  });
}

/* =============================================
   MOBILE DETECTION
   ============================================= */
function isMobile() { return window.innerWidth <= 767; }

/* =============================================
   INIT
   ============================================= */
function onDesktopReady() {
  startClock();

  const resizeInited = new WeakSet();
  window._initWindowOnce = win => {
    if (resizeInited.has(win)) return;
    resizeInited.add(win);
    if (!isMobile()) initResize(win);
  };

  document.querySelectorAll('.os-window').forEach(win => {
    if (!isMobile()) initDrag(win);
    window._initWindowOnce(win);
  });

  initIcons();
  initWinButtons();
  initTaskbar();
  initStickers();
  initProjects();
  initContact();
  initKeyboard();

  if (isMobile()) {
    /* 모바일: 메인 창을 JS로도 열어둠 (CSS display:block!important 보조) */
    WIN_IDS.forEach(id => {
      const win = document.getElementById(id);
      if (win) { win.style.display = 'block'; win.classList.add('open'); }
    });
    syncTaskbar();
  } else {
    scheduleErrorPopup();
    /* 데스크탑 fadeIn 끝난 후 ABOUT 창 오픈 */
    setTimeout(() => openWindow('win-about'), 700);
  }
}

document.addEventListener('DOMContentLoaded', runBoot);

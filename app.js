/**
 * NeuralType v2 — Application Controller
 * =========================================
 * Features:
 *  - Animated canvas background (floating nodes)
 *  - WPM tracking with rolling 30-second window
 *  - Heatmap mode for key frequency visualization
 *  - Quick phrase insertion
 *  - Copy & download text
 *  - Better word boundary tracking (handles backspace into previous word)
 *  - Debounced prediction updates
 *  - Top-words tracking
 *  - Autocorrect ON/OFF toggle
 */

// ─────────────────────────────────────────────────
//  State
// ─────────────────────────────────────────────────
const state = {
  text:            '',       // full typed text
  currentWord:     '',       // word being currently typed
  capsLock:        false,
  shiftActive:     false,
  ngramOrder:      3,
  corrections:     0,
  suggestionsUsed: 0,
  autocorrectOn:   true,

  // WPM
  keyTimestamps:   [],       // timestamps of space presses
  startTime:       null,

  // Undo
  canUndo:         false,
  undoText:        '',
  lastCorrFrom:    '',
  lastCorrTo:      '',

  // Heatmap
  heatmapOn:       false,
  keyFreq:         new Map(), // char → count

  // Top words
  wordFreq:        new Map(),

  // Debounce
  suggestionTimer: null,

  modelTrained:    false,
};

// ─────────────────────────────────────────────────
//  DOM
// ─────────────────────────────────────────────────
const dom = {
  textContent:     document.getElementById('textContent'),
  placeholder:     document.getElementById('placeholderText'),
  cursorBlink:     document.getElementById('cursorBlink'),
  suggestions:     document.getElementById('suggestionsContainer'),
  correctionBar:   document.getElementById('correctionBar'),
  correctedFrom:   document.getElementById('correctedFrom'),
  correctedTo:     document.getElementById('correctedTo'),
  undoBtn:         document.getElementById('undoCorrection'),
  ngramContext:    document.getElementById('ngramContext'),
  predictionsChart:document.getElementById('predictionsChart'),
  chartBars:       document.getElementById('chartBars'),
  wordCount:       document.getElementById('wordCount'),
  correctionCount: document.getElementById('correctionCount'),
  suggestionCount: document.getElementById('suggestionCount'),
  charCount:       document.getElementById('charCount'),
  wpmValue:        document.getElementById('wpmValue'),
  wpmStat:         document.getElementById('wpmStat'),
  accValue:        document.getElementById('accValue'),
  modelBadge:      document.getElementById('modelBadge'),
  modelPill:       document.getElementById('modelPill'),
  statusLabel:     document.getElementById('statusLabel'),
  statusDot:       document.getElementById('statusDot'),
  modelLoadBar:    document.getElementById('modelLoadBar'),
  modelLoadPct:    document.getElementById('modelLoadPct'),
  corpusBigrams:   document.getElementById('corpusBigrams'),
  corpusTrigrams:  document.getElementById('corpusTrigrams'),
  corpusVocab:     document.getElementById('corpusVocab'),
  corpusTokens:    document.getElementById('corpusTokens'),
  trainingStatus:  document.getElementById('trainingStatus'),
  topWords:        document.getElementById('topWords'),
  phraseList:      document.getElementById('phraseList'),
  toast:           document.getElementById('toast'),
  toastIcon:       document.getElementById('toastIcon'),
  toastMsg:        document.getElementById('toastMsg'),
  capsKey:         document.getElementById('capsKey'),
  capsIndicator:   document.getElementById('capsIndicator'),
  shiftLeft:       document.getElementById('shiftLeft'),
  shiftRight:      document.getElementById('shiftRight'),
  clearBtn:        document.getElementById('clearBtn'),
  themeToggle:     document.getElementById('themeToggle'),
  copyBtn:         document.getElementById('copyBtn'),
  downloadBtn:     document.getElementById('downloadBtn'),
  autocorrectToggle: document.getElementById('autocorrectToggle'),
  heatmapToggle:   document.getElementById('heatmapToggle'),
  bgCanvas:        document.getElementById('bgCanvas'),
};

// ─────────────────────────────────────────────────
//  Quick Phrases Data
// ─────────────────────────────────────────────────
const phrases = {
  greetings: [
    "Hello, how are you doing today?",
    "Good morning! Hope you have a great day.",
    "Hi there! Nice to meet you.",
    "Thanks for reaching out to me.",
    "Have a wonderful day!",
    "Looking forward to hearing from you.",
    "It was great talking with you.",
  ],
  tech: [
    "The algorithm runs in O(n log n) time.",
    "Please review the pull request when you have time.",
    "The API returns a JSON response.",
    "We need to refactor this code for clarity.",
    "The bug is in the event handler function.",
    "Let me push the changes to the repository.",
    "The unit tests are passing successfully.",
  ],
  business: [
    "Please find the attached report for your review.",
    "I would like to schedule a meeting next week.",
    "The deadline for this project is Friday.",
    "Let me know if you have any questions.",
    "We need to finalize the budget by end of month.",
    "The stakeholders have approved the proposal.",
    "I will follow up with you tomorrow morning.",
  ],
  casual: [
    "That sounds like a great idea!",
    "I totally agree with you on this.",
    "Let's catch up soon over coffee.",
    "What do you think about this?",
    "This is really interesting stuff.",
    "I had no idea about that.",
    "Can't wait to see how this turns out!",
  ],
};

// ─────────────────────────────────────────────────
//  Models
// ─────────────────────────────────────────────────
let ngramModel   = null;
let autocorrect  = null;

// ─────────────────────────────────────────────────
//  Canvas Background
// ─────────────────────────────────────────────────
function initCanvas() {
  const canvas = dom.bgCanvas;
  const ctx    = canvas.getContext('2d');
  let W, H, nodes;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function createNodes() {
    nodes = Array.from({ length: 55 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 2 + 0.5,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      alpha: Math.random() * 0.5 + 0.1,
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const isDark = !document.body.classList.contains('light-theme');
    const nodeColor  = isDark ? '139,92,246' : '100,60,220';
    const lineColor  = isDark ? '139,92,246' : '100,60,220';

    // Connect close nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 160) {
          ctx.strokeStyle = `rgba(${lineColor},${0.12 * (1 - dist/160)})`;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
    }

    // Draw nodes
    nodes.forEach(n => {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${nodeColor},${n.alpha})`;
      ctx.fill();

      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > W) n.vx *= -1;
      if (n.y < 0 || n.y > H) n.vy *= -1;
    });

    requestAnimationFrame(draw);
  }

  resize();
  createNodes();
  draw();
  window.addEventListener('resize', () => { resize(); createNodes(); });
}

// ─────────────────────────────────────────────────
//  Initialize & Train Model
// ─────────────────────────────────────────────────
async function initialize() {
  initCanvas();
  initPhrasePanel();

  dom.statusLabel.textContent = 'Training...';
  dom.statusDot.style.background = '#f59e0b';

  await new Promise(resolve => {
    requestAnimationFrame(() => {
      ngramModel = new NGramModel();
      const stats = ngramModel.train((pct) => updateProgress(pct));
      autocorrect = new AutocorrectEngine(ngramModel.vocabulary, ngramModel.unigramCounts);
      state.modelTrained = true;
      updateCorpusDisplay(stats);
      dom.statusLabel.textContent = 'Model Ready';
      dom.statusDot.style.background = 'var(--c-green)';
      dom.trainingStatus.textContent = 'Ready';
      dom.trainingStatus.style.color = 'var(--c-green)';
      resolve();
    });
  });

  updateSuggestionsDebounced();
  showToast('✅', 'AI model trained. Start typing!', 2500);
}

function updateProgress(pct) {
  dom.modelLoadBar.style.width = pct + '%';
  dom.modelLoadPct.textContent = pct + '%';
}

function updateCorpusDisplay(stats) {
  dom.corpusVocab.textContent    = stats.vocabulary.toLocaleString();
  dom.corpusBigrams.textContent  = stats.bigrams.toLocaleString();
  dom.corpusTrigrams.textContent = stats.trigrams.toLocaleString();
  dom.corpusTokens.textContent   = stats.tokens.toLocaleString();
}

// ─────────────────────────────────────────────────
//  Phrase Panel
// ─────────────────────────────────────────────────
function initPhrasePanel() {
  renderPhrases('greetings');
  document.querySelectorAll('.phrase-cat').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.phrase-cat').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderPhrases(btn.dataset.cat);
    });
  });
}

function renderPhrases(cat) {
  const list = phrases[cat] || [];
  dom.phraseList.innerHTML = '';
  list.forEach(p => {
    const el = document.createElement('div');
    el.className = 'phrase-item';
    el.textContent = p;
    el.title = 'Click to insert';
    el.addEventListener('click', () => {
      insertPhrase(p);
    });
    dom.phraseList.appendChild(el);
  });
}

function insertPhrase(text) {
  if (state.text.length > 0 && !state.text.endsWith(' ')) state.text += ' ';
  state.text += text + ' ';
  state.currentWord = '';
  renderText();
  updateStats();
  updateSuggestionsDebounced();
  updateNgramContext();
  showToast('💬', 'Phrase inserted!');
}

// ─────────────────────────────────────────────────
//  Text Input Logic
// ─────────────────────────────────────────────────
function appendChar(char) {
  if (!state.startTime) state.startTime = Date.now();

  if (char === ' ' || char === '\n') {
    if (state.currentWord.trim().length > 0) {
      // Run autocorrect
      if (state.autocorrectOn) {
        const result = autocorrect.correct(state.currentWord);
        if (result.wasCorrection && result.corrected !== state.currentWord) {
          // Replace word in text buffer
          const idx = state.text.lastIndexOf(state.currentWord);
          if (idx !== -1) {
            state.text = state.text.slice(0, idx) + result.corrected;
          }
          state.corrections++;
          state.undoText    = state.text; // snapshot before space
          state.lastCorrFrom = state.currentWord;
          state.lastCorrTo   = result.corrected;
          state.canUndo      = true;
          state.text += char;
          state.currentWord  = '';
          showCorrectionBar(result.corrected !== result.original ? result.original : null, result.corrected);
        } else {
          hideCorrectionBar();
          state.text += char;
          state.currentWord = '';
        }
      } else {
        hideCorrectionBar();
        state.text += char;
        state.currentWord = '';
      }
    } else {
      state.text += char;
      state.currentWord = '';
    }

    // WPM: record word completion
    const now = Date.now();
    state.keyTimestamps.push(now);
    // Keep only timestamps within last 60 seconds
    state.keyTimestamps = state.keyTimestamps.filter(t => now - t < 60000);

  } else {
    state.currentWord += char;
    state.text += char;
    hideCorrectionBar();

    // Track key heatmap
    const lower = char.toLowerCase();
    state.keyFreq.set(lower, (state.keyFreq.get(lower) || 0) + 1);
    if (state.heatmapOn) updateHeatmap();
  }

  renderText();
  updateStats();
  updateSuggestionsDebounced();
  updateNgramContext();
}

function deleteChar() {
  if (state.text.length === 0) return;

  const last = state.text[state.text.length - 1];
  state.text = state.text.slice(0, -1);

  if (last === ' ' || last === '\n') {
    // Re-entering previous word: find the last word in remaining text
    const remaining = state.text.trimEnd();
    const spaceIdx  = remaining.lastIndexOf(' ');
    state.currentWord = spaceIdx === -1 ? remaining : remaining.slice(spaceIdx + 1);
  } else {
    state.currentWord = state.currentWord.slice(0, -1);
  }

  hideCorrectionBar();
  renderText();
  updateStats();
  updateSuggestionsDebounced();
  updateNgramContext();
}

function insertSuggestion(word) {
  // Remove current partial word from buffer
  if (state.currentWord.length > 0) {
    state.text = state.text.slice(0, -state.currentWord.length);
  }

  // Capitalise if start of sentence
  const finishedText = state.text.trimEnd();
  const needsCap = finishedText.length === 0 || /[.!?]$/.test(finishedText);
  const toInsert = needsCap ? word.charAt(0).toUpperCase() + word.slice(1) : word;

  state.text += toInsert + ' ';
  state.currentWord = '';
  state.suggestionsUsed++;

  // Word frequency
  state.wordFreq.set(toInsert.toLowerCase(), (state.wordFreq.get(toInsert.toLowerCase()) || 0) + 1);

  hideCorrectionBar();
  renderText();
  updateStats();
  updateTopWords();
  updateSuggestionsDebounced();
  updateNgramContext();
}

function clearAll() {
  state.text = ''; state.currentWord = ''; state.canUndo = false;
  state.keyTimestamps = []; state.startTime = null;
  state.wordFreq.clear(); state.keyFreq.clear();
  dom.wpmValue.textContent = '0'; dom.wpmStat.textContent = '0';
  dom.accValue.textContent = '100';
  hideCorrectionBar();
  renderText(); updateStats(); updateSuggestionsDebounced(); updateNgramContext(); updateTopWords();
  if (state.heatmapOn) updateHeatmap();
  showToast('🗑️', 'Text cleared');
}

// ─────────────────────────────────────────────────
//  Render
// ─────────────────────────────────────────────────
function renderText() {
  if (state.text.length === 0) {
    dom.placeholder.style.display = 'flex';
    dom.textContent.textContent  = '';
  } else {
    dom.placeholder.style.display = 'none';
    dom.textContent.textContent  = state.text;
  }
}

// ─────────────────────────────────────────────────
//  Statistics
// ─────────────────────────────────────────────────
function getTypedWords() {
  return state.text.trim().split(/\s+/).filter(w => w.length > 0);
}

function updateStats() {
  const words = getTypedWords();
  const wc = words.filter(w => /[a-z]/i.test(w)).length;

  animateStatCard('sc-words',       dom.wordCount,       wc);
  animateStatCard('sc-corrections', dom.correctionCount, state.corrections);
  animateStatCard('sc-suggestions', dom.suggestionCount, state.suggestionsUsed);
  dom.charCount.textContent = state.text.length;

  // WPM (based on word-completions in last 60s)
  const wpm = state.keyTimestamps.length;
  dom.wpmStat.textContent  = wpm;
  dom.wpmValue.textContent = wpm;

  animateStatCard('sc-wpm', dom.wpmStat, wpm);

  // Accuracy
  const totalWords    = wc + state.corrections;
  const accPct        = totalWords > 0 ? Math.round((wc / totalWords) * 100) : 100;
  dom.accValue.textContent = Math.max(0, Math.min(100, accPct));

  // Word freq tracking
  words.forEach(w => {
    const lw = w.toLowerCase().replace(/[^a-z]/g, '');
    if (lw.length > 2) {
      state.wordFreq.set(lw, (state.wordFreq.get(lw) || 0) + 1);
    }
  });
  updateTopWords();
}

let _lastStatValues = {};
function animateStatCard(cardId, el, value) {
  const prev = _lastStatValues[cardId];
  if (prev !== value) {
    _lastStatValues[cardId] = value;
    el.textContent = value;
    const card = document.getElementById(cardId);
    if (card) {
      card.classList.remove('bump');
      void card.offsetWidth;
      card.classList.add('bump');
    }
  }
}

// ─────────────────────────────────────────────────
//  Suggestions
// ─────────────────────────────────────────────────
function updateSuggestionsDebounced() {
  clearTimeout(state.suggestionTimer);
  state.suggestionTimer = setTimeout(updateSuggestions, 60);
}

function updateSuggestions() {
  if (!state.modelTrained) return;

  const words = getTypedWords();
  let preds = ngramModel.predict(words, 8, state.ngramOrder);

  // If typing a partial word, prefix-filter and add prefix matches
  if (state.currentWord.length >= 2 && autocorrect) {
    const prefix = state.currentWord.toLowerCase();
    const prefixMatches = autocorrect.prefixMatch(prefix, 5);
    // Merge prefix matches at the front, boosting their score
    const prefixSet = new Set(prefixMatches);
    preds = [
      ...prefixMatches.map((w, i) => ({ word: w, score: 98 - i*4, probability: 0.98 - i*0.04 })),
      ...preds.filter(p => !prefixSet.has(p.word))
    ].slice(0, 5);
  } else {
    // Filter out current partial word and already-typed last word
    const lastWord = words[words.length - 1]?.toLowerCase() || '';
    preds = preds.filter(p => p.word !== lastWord).slice(0, 5);
  }

  dom.suggestions.innerHTML = '';

  if (preds.length === 0) {
    dom.suggestions.innerHTML = '<div class="suggestion-chip no-data"><span class="chip-word">No predictions</span></div>';
    return;
  }

  preds.forEach((pred, i) => {
    const chip = document.createElement('div');
    chip.className = `suggestion-chip${i === 0 ? ' top' : ''}`;

    const wordSpan = document.createElement('span');
    wordSpan.className = 'chip-word';
    wordSpan.textContent = pred.word;

    const probSpan = document.createElement('span');
    probSpan.className = 'chip-prob';
    probSpan.textContent = pred.score + '%';

    chip.appendChild(wordSpan);
    chip.appendChild(probSpan);
    chip.addEventListener('click', () => {
      insertSuggestion(pred.word);
      addRipple(chip, 16, 16);
    });
    dom.suggestions.appendChild(chip);
  });
}

// ─────────────────────────────────────────────────
//  N-gram Visualization
// ─────────────────────────────────────────────────
function updateNgramContext() {
  if (!state.modelTrained) return;

  const words = getTypedWords();
  const preds = ngramModel.predict(words, 5, state.ngramOrder);

  if (words.length === 0) {
    dom.ngramContext.innerHTML = `
      <div class="context-empty">
        <div class="empty-animation"><div class="pulse-ring"></div>
          <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </div>
        <p>Start typing to see AI prediction context</p>
      </div>`;
    dom.predictionsChart.style.display = 'none';
    return;
  }

  const ctxInfo = ngramModel.getContextInfo(words, state.ngramOrder);
  dom.ngramContext.innerHTML = '';

  ctxInfo.contextWindow.forEach((w, i) => {
    if (i > 0) {
      const arr = document.createElement('span');
      arr.className = 'ctx-arrow'; arr.textContent = '→';
      dom.ngramContext.appendChild(arr);
    }
    const tok = document.createElement('div');
    tok.className = 'context-token ctx-word';
    tok.textContent = w;
    tok.style.animationDelay = `${i * 0.04}s`;
    dom.ngramContext.appendChild(tok);
  });

  if (preds.length > 0) {
    const arr = document.createElement('span');
    arr.className = 'ctx-arrow'; arr.textContent = '→';
    dom.ngramContext.appendChild(arr);

    const target = document.createElement('div');
    target.className = 'context-token ctx-target';
    target.textContent = preds[0].word;
    target.style.animationDelay = `${ctxInfo.contextWindow.length * 0.04}s`;
    dom.ngramContext.appendChild(target);
  }

  const modelLabels = { 2: 'Bigram', 3: 'Trigram', 4: '4-gram' };
  dom.modelPill.textContent = modelLabels[state.ngramOrder] || 'N-gram';

  // Bar chart
  if (preds.length > 0) {
    dom.predictionsChart.style.display = 'block';
    dom.chartBars.innerHTML = '';

    const maxScore = preds[0].score || 1;
    const gradients = [
      'linear-gradient(90deg,#8b5cf6,#3b82f6)',
      'linear-gradient(90deg,#7c3aed,#2563eb)',
      'linear-gradient(90deg,#6d28d9,#1d4ed8)',
      'linear-gradient(90deg,#5b21b6,#1e40af)',
      'linear-gradient(90deg,#4c1d95,#1e3a8a)',
    ];

    preds.slice(0, 5).forEach((pred, i) => {
      const pct = Math.round((pred.score / maxScore) * 100);
      const row = document.createElement('div');
      row.className = 'chart-bar-row';
      row.innerHTML = `
        <div class="chart-bar-label">${pred.word}</div>
        <div class="chart-bar-track">
          <div class="chart-bar-fill" style="width:0%;background:${gradients[i] || gradients[4]}"></div>
        </div>
        <div class="chart-bar-pct">${pred.score}%</div>`;
      dom.chartBars.appendChild(row);
      requestAnimationFrame(() => {
        setTimeout(() => { row.querySelector('.chart-bar-fill').style.width = pct + '%'; }, i * 60);
      });
    });
  }
}

// ─────────────────────────────────────────────────
//  Top Words
// ─────────────────────────────────────────────────
function updateTopWords() {
  const sorted = [...state.wordFreq.entries()]
    .filter(([w]) => w.length > 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  if (sorted.length === 0) {
    dom.topWords.innerHTML = '<span class="tw-empty">No words yet...</span>';
    return;
  }
  dom.topWords.innerHTML = '';
  sorted.forEach(([word, count]) => {
    const tag = document.createElement('span');
    tag.className = 'tw-tag';
    tag.textContent = `${word} (${count})`;
    dom.topWords.appendChild(tag);
  });
}

// ─────────────────────────────────────────────────
//  Heatmap
// ─────────────────────────────────────────────────
function updateHeatmap() {
  if (!state.heatmapOn) {
    document.querySelectorAll('.key').forEach(k => {
      k.classList.remove('heatmap-1','heatmap-2','heatmap-3','heatmap-4','heatmap-5');
    });
    return;
  }
  const max = Math.max(...state.keyFreq.values(), 1);
  document.querySelectorAll('.key-letter, .key-num, .key-sym').forEach(k => {
    const ch  = (k.dataset.char || '').toLowerCase();
    const cnt = state.keyFreq.get(ch) || 0;
    const lvl = cnt === 0 ? 0 : Math.ceil((cnt / max) * 5);
    k.classList.remove('heatmap-1','heatmap-2','heatmap-3','heatmap-4','heatmap-5');
    if (lvl > 0) k.classList.add(`heatmap-${lvl}`);
  });
}

// ─────────────────────────────────────────────────
//  Correction Bar
// ─────────────────────────────────────────────────
function showCorrectionBar(from, to) {
  if (!from || from === to) return;
  dom.correctedFrom.textContent = from;
  dom.correctedTo.textContent   = to;
  dom.correctionBar.style.display = 'block';
}
function hideCorrectionBar() {
  dom.correctionBar.style.display = 'none';
  state.canUndo = false;
}
dom.undoBtn.addEventListener('click', () => {
  if (!state.canUndo) return;
  state.text = state.undoText;
  state.currentWord = state.lastCorrFrom;
  state.corrections = Math.max(0, state.corrections - 1);
  state.canUndo = false;
  hideCorrectionBar();
  renderText(); updateStats(); updateSuggestionsDebounced(); updateNgramContext();
  showToast('↩️', 'Correction undone');
});

// ─────────────────────────────────────────────────
//  N-gram Order Selector
// ─────────────────────────────────────────────────
document.querySelectorAll('.ngram-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.ngram-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    state.ngramOrder = parseInt(tab.dataset.n);
    const labels = { 2: 'Bigram', 3: 'Trigram', 4: '4-gram' };
    const name = labels[state.ngramOrder];
    dom.modelBadge.textContent = name;
    updateSuggestions(); updateNgramContext();
    showToast('📊', `Switched to ${name} model`);
  });
});

// ─────────────────────────────────────────────────
//  Autocorrect Toggle
// ─────────────────────────────────────────────────
dom.autocorrectToggle.addEventListener('click', () => {
  state.autocorrectOn = !state.autocorrectOn;
  dom.autocorrectToggle.classList.toggle('active', state.autocorrectOn);
  showToast(state.autocorrectOn ? '✅' : '❌', `Autocorrect ${state.autocorrectOn ? 'ON' : 'OFF'}`);
});
// Init as active
dom.autocorrectToggle.classList.add('active');

// ─────────────────────────────────────────────────
//  Heatmap Toggle
// ─────────────────────────────────────────────────
dom.heatmapToggle.addEventListener('click', () => {
  state.heatmapOn = !state.heatmapOn;
  dom.heatmapToggle.textContent = `🔥 Heatmap: ${state.heatmapOn ? 'ON' : 'OFF'}`;
  dom.heatmapToggle.classList.toggle('hm-on', state.heatmapOn);
  updateHeatmap();
  showToast('🔥', `Key heatmap ${state.heatmapOn ? 'ON' : 'OFF'}`);
});

// ─────────────────────────────────────────────────
//  Copy & Download
// ─────────────────────────────────────────────────
dom.copyBtn.addEventListener('click', async () => {
  if (!state.text.trim()) { showToast('⚠️', 'Nothing to copy!'); return; }
  try {
    await navigator.clipboard.writeText(state.text.trim());
    showToast('📋', 'Copied to clipboard!');
  } catch {
    showToast('❌', 'Copy failed — try manually');
  }
});

dom.downloadBtn.addEventListener('click', () => {
  if (!state.text.trim()) { showToast('⚠️', 'Nothing to export!'); return; }
  const blob = new Blob([state.text.trim()], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `neuraltype_${new Date().toISOString().slice(0,10)}.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('💾', 'Text exported!');
});

// ─────────────────────────────────────────────────
//  Clear
// ─────────────────────────────────────────────────
dom.clearBtn.addEventListener('click', clearAll);

// ─────────────────────────────────────────────────
//  Theme Toggle
// ─────────────────────────────────────────────────
let _dark = true;
dom.themeToggle.addEventListener('click', () => {
  _dark = !_dark;
  document.body.classList.toggle('light-theme', !_dark);
  showToast(_dark ? '🌙' : '☀️', _dark ? 'Dark mode' : 'Light mode');
});

// ─────────────────────────────────────────────────
//  Virtual Keyboard
// ─────────────────────────────────────────────────
function addRipple(el, x, y) {
  const r = document.createElement('span');
  r.className = 'key-ripple';
  r.style.left = (x - 4) + 'px';
  r.style.top  = (y - 4) + 'px';
  el.appendChild(r);
  r.addEventListener('animationend', () => r.remove(), { once: true });
}

function pressKey(keyEl, char) {
  keyEl.classList.add('pressed');
  addRipple(keyEl, keyEl.offsetWidth / 2, keyEl.offsetHeight / 2);
  setTimeout(() => keyEl.classList.remove('pressed'), 130);
  appendChar(char);
}

document.querySelectorAll('.key-letter, .key-num, .key-sym').forEach(key => {
  key.addEventListener('mousedown', function (e) {
    e.preventDefault();
    const raw  = this.dataset.char || '';
    const shift = this.dataset.shift || raw.toUpperCase();
    const char = (state.shiftActive || state.capsLock && /[a-z]/i.test(raw)) ? shift : raw;
    pressKey(this, char);
    if (state.shiftActive) {
      state.shiftActive = false;
      dom.shiftLeft.classList.remove('active');
      dom.shiftRight.classList.remove('active');
    }
  });
});

// Backspace
document.getElementById('backspaceKey').addEventListener('mousedown', function(e) {
  e.preventDefault();
  deleteChar();
  this.classList.add('pressed');
  setTimeout(() => this.classList.remove('pressed'), 130);
});

// Hold-to-delete
let _bsInterval = null;
document.getElementById('backspaceKey').addEventListener('mousedown', () => {
  _bsInterval = setInterval(deleteChar, 90);
});
document.addEventListener('mouseup', () => clearInterval(_bsInterval));

// Space
document.getElementById('spaceKey').addEventListener('mousedown', function(e) {
  e.preventDefault();
  pressKey(this, ' ');
});

// Enter
document.getElementById('enterKey').addEventListener('mousedown', function(e) {
  e.preventDefault();
  pressKey(this, ' ');
});

// Tab
document.querySelector('.key-tab').addEventListener('mousedown', function(e) {
  e.preventDefault();
  for (let i = 0; i < 4; i++) appendChar(' ');
  this.classList.add('pressed');
  setTimeout(() => this.classList.remove('pressed'), 130);
});

// Caps Lock
dom.capsKey.addEventListener('click', () => {
  state.capsLock = !state.capsLock;
  dom.capsKey.classList.toggle('active', state.capsLock);
  showToast(state.capsLock ? '🔠' : '🔡', `Caps Lock ${state.capsLock ? 'ON' : 'OFF'}`);
});

// Shift
[dom.shiftLeft, dom.shiftRight].forEach(btn => {
  btn.addEventListener('click', () => {
    state.shiftActive = !state.shiftActive;
    dom.shiftLeft.classList.toggle('active', state.shiftActive);
    dom.shiftRight.classList.toggle('active', state.shiftActive);
  });
});

// ─────────────────────────────────────────────────
//  Physical Keyboard
// ─────────────────────────────────────────────────
function findVKey(key) {
  const lower = key.toLowerCase();
  const el = document.querySelector(`.key[data-char="${lower}"]`);
  if (el) return el;
  if (key === 'Backspace') return document.getElementById('backspaceKey');
  if (key === ' ')          return document.getElementById('spaceKey');
  if (key === 'Enter')      return document.getElementById('enterKey');
  if (key === 'CapsLock')   return dom.capsKey;
  return null;
}

document.addEventListener('keydown', e => {
  // Skip if modifier-only
  if (e.ctrlKey || e.metaKey) return;

  const vk = findVKey(e.key);
  if (vk) { vk.classList.add('pressed'); addRipple(vk, vk.offsetWidth/2, vk.offsetHeight/2); }

  if (e.key === 'Backspace')  { e.preventDefault(); deleteChar(); }
  else if (e.key === 'Enter') { e.preventDefault(); appendChar(' '); }
  else if (e.key === ' ')     { e.preventDefault(); appendChar(' '); }
  else if (e.key === 'CapsLock') {
    state.capsLock = !state.capsLock;
    dom.capsKey.classList.toggle('active', state.capsLock);
  }
  else if (e.key === 'Shift') {
    state.shiftActive = true;
    dom.shiftLeft.classList.add('active'); dom.shiftRight.classList.add('active');
  }
  else if (e.key.length === 1) { e.preventDefault(); appendChar(e.key); }
});

document.addEventListener('keyup', e => {
  const vk = findVKey(e.key);
  if (vk) setTimeout(() => vk.classList.remove('pressed'), 100);
  if (e.key === 'Shift') {
    state.shiftActive = false;
    dom.shiftLeft.classList.remove('active'); dom.shiftRight.classList.remove('active');
  }
});

// ─────────────────────────────────────────────────
//  Toast
// ─────────────────────────────────────────────────
let _toastTimer;
function showToast(icon, message, duration = 2200) {
  dom.toastIcon.textContent = icon;
  dom.toastMsg.textContent  = message;
  dom.toast.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => dom.toast.classList.remove('show'), duration);
}

// ─────────────────────────────────────────────────
//  Boot
// ─────────────────────────────────────────────────
initialize();

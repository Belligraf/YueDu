console.log("✅ matcches.js загружен (полная оригинальная версия)");

// ====================== ЦВЕТОВОЙ КОНФИГ ======================
window.colorConfig = window.colorConfig || {
    linked: '#a7f3d0',
    linkedBorder: '#10b981',
    selected: '#fef08a',
    selectedBorder: '#eab308',
    hover: '#fef9c3',
    tempHighlight: '#fef9c3',
    posColors: {
        'noun': '#c5e0b4',
        'verb': '#bdd7ee',
        'adj':  '#f7c6c6',
        'adv':  '#ffd966',
        'pron': '#d5a6bd',
        'num':  '#c5d9f1',
        'conj': '#e2efda',
        'prep': '#fde9a0',
        'intj': '#f9cb9c',
        'part': '#e6c3c3',
        'unknown': 'transparent'
    }
};

// ======================================================
// ПАРАЛЛЕЛЬНЫЙ РИДЕР — ПОЛНАЯ ОРИГИНАЛЬНАЯ ВЕРСИЯ
// ======================================================
window.loadParallelView = async function() {
    const origDiv = document.getElementById('original-text');
    const transDiv = document.getElementById('translation-text');
    if (!origDiv || !transDiv) return;
    if (!window.currentOriginalText) return;

    window.selectedChineseWords.clear();
    window.selectedRussianWords.clear();

    // Получение сегментации
    let segmentedWords = [];
    try {
        const response = await fetch('/api/segment/segment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: window.currentOriginalText })
        });
        if (response.ok) {
            const data = await response.json();
            segmentedWords = data.words;
            window.currentSegmentedWords = segmentedWords;
        }
    } catch (err) {
        console.error(err);
        segmentedWords = window.currentOriginalText.split('');
    }

// ==================== ОТРИСОВКА КИТАЙСКОГО (правильное поведение для Parallel) ====================
origDiv.innerHTML = '';
origDiv.style.whiteSpace = 'pre-wrap';
origDiv.style.lineHeight = '1.8';
origDiv.style.fontSize = '1.25rem';

let chineseWordIndex = 0;
window.currentWordsArray = [];
const wordsToShow = segmentedWords.length ? segmentedWords : [window.currentOriginalText];

for (let i = 0; i < wordsToShow.length; i++) {
    const token = wordsToShow[i];

    if (/[\u4e00-\u9fff]/.test(token)) {
        const span = document.createElement('span');
        span.textContent = token;
        span.className = 'chinese-word';
        span.style.cssText = 'display:inline; margin:0; padding:2px 1px; cursor:pointer;';
        const idx = chineseWordIndex;
        span.setAttribute('data-idx', idx);
        window.currentWordsArray[idx] = token;

        // === ЛЕВАЯ КНОПКА — выделяем слово для связывания ===
        span.onclick = function(e) {
            e.stopPropagation();
            if (window.selectedChineseWords.has(idx)) {
                window.selectedChineseWords.delete(idx);
                span.classList.remove('selected-for-link');
            } else {
                window.selectedChineseWords.add(idx);
                span.classList.add('selected-for-link');
            }
            if (window.updateLinkButtonState) window.updateLinkButtonState();
        };

        // === ПРАВАЯ КНОПКА — меню части речи ===
        span.oncontextmenu = function(e) {
            e.preventDefault();
            if (typeof window.showPartMenu === 'function') {
                window.showPartMenu(e.clientX, e.clientY, idx, token);
            }
        };

        // Наведение (подсветка связанных русских слов)
        span.onmouseenter = (function(i) {
            return function() {
                const linked = window.currentMatches[i];
                if (linked && linked.length) {
                    transDiv.querySelectorAll('.russian-word').forEach(w => {
                        if (linked.includes(parseInt(w.getAttribute('data-idx')))) {
                            w.classList.add('temp-highlight');
                        }
                    });
                }
            };
        })(idx);

        span.onmouseleave = () => {
            transDiv.querySelectorAll('.russian-word').forEach(w => w.classList.remove('temp-highlight'));
        };

        origDiv.appendChild(span);
        chineseWordIndex++;
    }
    else if (token === '\n') {
        origDiv.appendChild(document.createElement('br'));
    }
    else {
        const span = document.createElement('span');
        span.textContent = token;
        span.style.display = 'inline';
        origDiv.appendChild(span);
    }
}

    // ==================== ОТРИСОВКА РУССКОГО ====================
    transDiv.innerHTML = '';
    transDiv.style.whiteSpace = 'pre-wrap';
    transDiv.style.lineHeight = '1.8';

    if (window.currentTranslationText) {
        let russianWordIndex = 0;
        window.currentTransArray = [];
        let currentWord = '', inWord = false;
        const translationText = window.currentTranslationText;

        for (let i = 0; i < translationText.length; i++) {
            const char = translationText[i];

            if (/[а-яА-Яa-zA-Z0-9]/.test(char)) {
                currentWord += char;
                inWord = true;
            } else {
                if (inWord && currentWord) {
                    const wordSpan = document.createElement('span');
                    wordSpan.textContent = currentWord;
                    wordSpan.className = 'russian-word';
                    wordSpan.style.cssText = 'display:inline; margin:0; padding:2px 1px; cursor:pointer;';
                    wordSpan.setAttribute('data-idx', russianWordIndex);
                    window.currentTransArray[russianWordIndex] = currentWord;

                    // Клик
                    wordSpan.onclick = (function(idx, el) {
                        return function(e) {
                            e.stopPropagation();
                            if (window.selectedRussianWords.has(idx)) {
                                window.selectedRussianWords.delete(idx);
                                el.classList.remove('selected-for-link');
                            } else {
                                window.selectedRussianWords.add(idx);
                                el.classList.add('selected-for-link');
                            }
                            if (window.updateLinkButtonState) window.updateLinkButtonState();
                        };
                    })(russianWordIndex, wordSpan);

                    // Наведение
                    wordSpan.onmouseenter = (function(idx) {
                        return function() {
                            const linked = [];
                            for (const [chIdx, ruIds] of Object.entries(window.currentMatches)) {
                                if (ruIds.includes(idx)) linked.push(parseInt(chIdx));
                            }
                            if (linked.length) {
                                origDiv.querySelectorAll('.chinese-word').forEach(w => {
                                    if (linked.includes(parseInt(w.getAttribute('data-idx')))) {
                                        w.classList.add('temp-highlight');
                                    }
                                });
                            }
                        };
                    })(russianWordIndex);

                    wordSpan.onmouseleave = () => {
                        origDiv.querySelectorAll('.chinese-word').forEach(w => w.classList.remove('temp-highlight'));
                    };

                    transDiv.appendChild(wordSpan);
                    russianWordIndex++;
                    currentWord = '';
                    inWord = false;
                }

                if (char === ' ') {
                    const space = document.createElement('span');
                    space.innerHTML = '&nbsp;';
                    transDiv.appendChild(space);
                } else if (char === '\n') {
                    transDiv.appendChild(document.createElement('br'));
                } else {
                    const punct = document.createElement('span');
                    punct.textContent = char;
                    punct.style.color = '#666';
                    transDiv.appendChild(punct);
                }
            }
        }

        if (currentWord) {
            const wordSpan = document.createElement('span');
            wordSpan.textContent = currentWord;
            wordSpan.className = 'russian-word';
            wordSpan.setAttribute('data-idx', russianWordIndex);
            transDiv.appendChild(wordSpan);
        }
    }

    if (transDiv) {
        if (typeof applyCurrentBlurState === 'function') applyCurrentBlurState(transDiv);
    }

    if (window.createControlPanel) window.createControlPanel();

    if (window.currentEditId) {
        await window.loadMatchesFromDB();
    }

    setTimeout(() => {
        if (window.highlightLinkedWords) window.highlightLinkedWords();
    }, 100);
};

// ======================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (оригинальные)
// ======================================================

window.highlightLinkedWords = function() {
    console.log("🔄 highlightLinkedWords с цветами POS");
    const cfg = window.colorConfig;

    document.querySelectorAll('#original-text .chinese-word').forEach(span => {
        const idx = parseInt(span.getAttribute('data-idx'));
        if (isNaN(idx)) return;

        const isLinked = window.currentMatches?.[idx] && window.currentMatches[idx].length > 0;
        const pos = window.currentWordsPos?.[idx];

        if (isLinked) {
            if (pos && pos !== 'unknown' && cfg.posColors[pos]) {
                span.style.backgroundColor = cfg.posColors[pos];
            } else {
                span.style.backgroundColor = cfg.linked;
            }
            span.style.borderBottom = `2px solid ${cfg.linkedBorder}`;
        } else {
            if (pos && pos !== 'unknown' && cfg.posColors[pos]) {
                span.style.backgroundColor = cfg.posColors[pos];
                span.style.borderBottom = '';
            } else {
                span.style.backgroundColor = '';
                span.style.borderBottom = '';
            }
        }
    });

    document.querySelectorAll('#translation-text .russian-word').forEach(span => {
        const idx = parseInt(span.getAttribute('data-idx'));
        if (isNaN(idx)) return;

        const isLinked = Object.values(window.currentMatches || {})
                           .some(arr => arr && arr.includes(idx));

        if (isLinked) {
            const color = (typeof getColorForRussianWord === 'function')
                ? getColorForRussianWord(idx)
                : cfg.linked;
            span.style.backgroundColor = color || cfg.linked;
            span.style.borderBottom = `2px solid ${cfg.linkedBorder}`;
        } else {
            span.style.backgroundColor = '';
            span.style.borderBottom = '';
        }
    });
};

window.getColorForRussianWord = function(russianIdx) {
    const linkedChineseIndices = [];
    for (const [chIdx, ruIds] of Object.entries(window.currentMatches || {})) {
        if (ruIds.includes(russianIdx)) linkedChineseIndices.push(parseInt(chIdx));
    }
    if (linkedChineseIndices.length === 0) return '';

    for (const chIdx of linkedChineseIndices) {
        const pos = window.currentWordsPos?.[chIdx];
        if (pos && pos !== 'unknown' && window.colorConfig.posColors[pos]) {
            return window.colorConfig.posColors[pos];
        }
    }
    return window.colorConfig.linked;
};

window.applyCurrentBlurState = function(container) {
    if (!container) return;
    if (window.isBlurred) {
        container.classList.add('blur-sm');
    } else {
        container.classList.remove('blur-sm');
    }
};

console.log("✅ parallel.js (полная оригинальная версия) готов");

// ======================================================
// ЗАГРУЗКА СВЯЗЕЙ ИЗ БД (нужна для параллельного режима)
// ======================================================
window.loadMatchesFromDB = async function() {
    if (!window.currentEditId) return;

    try {
        console.log(`📡 Загружаем связи для текста ID=${window.currentEditId}`);

        const response = await fetch(`/api/library/${window.currentEditId}/matches`);

        if (!response.ok) {
            console.warn(`Статус ответа: ${response.status}`);
            window.currentMatches = {};
            if (window.highlightLinkedWords) window.highlightLinkedWords();
            return;
        }

        const data = await response.json();
        console.log("Получены данные matches:", data);

        if (!data || !data.words) {
            console.warn("Данные matches пустые или null");
            window.currentMatches = {};
            window.currentWordsPos = [];
            window.currentWordsIds = [];
            if (window.highlightLinkedWords) window.highlightLinkedWords();
            return;
        }

        // Карта ID перевода → позиция
        const transIdToPos = {};
        if (data.translations) {
            data.translations.forEach(t => {
                if (t && t.id !== undefined && t.position !== undefined) {
                    transIdToPos[t.id] = t.position;
                }
            });
        }

        window.currentMatches = {};
        window.currentWordsPos = [];
        window.currentWordsIds = [];

        if (data.words) {
            data.words.forEach(word => {
                if (!word) return;
                const pos = word.position;
                window.currentWordsIds[pos] = word.id;
                window.currentWordsPos[pos] = word.part_of_speech;

                if (word.translation_ids && word.translation_ids.length) {
                    const positions = word.translation_ids
                        .map(id => transIdToPos[id])
                        .filter(p => p !== undefined);

                    if (positions.length) {
                        window.currentMatches[pos] = positions;
                    }
                }
            });
        }

        console.log("✅ Загружены связи:", window.currentMatches);
        if (window.highlightLinkedWords) window.highlightLinkedWords();

    } catch (e) {
        console.error("Ошибка загрузки связей:", e);
        window.currentMatches = {};
        if (window.highlightLinkedWords) window.highlightLinkedWords();
    }
};

// ======================================================
// ПАНЕЛЬ УПРАВЛЕНИЯ (оригинальная логика)
// ======================================================
window.createControlPanel = function() {
    const existing = document.getElementById('link-control-panel');
    if (existing) existing.remove();

    const panel = document.createElement('div');
    panel.id = 'link-control-panel';
    panel.style.cssText = `
        position:fixed; bottom:20px; left:50%; transform:translateX(-50%);
        background:white; padding:12px 20px; border-radius:12px;
        box-shadow:0 4px 20px rgba(0,0,0,0.15); z-index:1000;
        display:flex; gap:12px; align-items:center;
    `;

    panel.innerHTML = `
        <button id="link-save-btn" style="background:#10b981;color:white;padding:11px 24px;border:none;border-radius:8px;font-weight:600;cursor:pointer;">
            🔗 Привязать
        </button>
        <button id="break-link-btn" style="background:#f7a2a2;color:white;padding:11px 20px;border:none;border-radius:8px;font-weight:600;cursor:pointer;">
            ✂️ Разорвать связь
        </button>
        <button onclick="window.saveAllLinksToDB()" style="background:#3b82f6;color:white;padding:11px 20px;border:none;border-radius:8px;font-weight:600;cursor:pointer;">
            💾 Сохранить
        </button>
        <button onclick="window.showPosLegend()"
                title="Легенда цветов частей речи"
                style="background:#6366f1;color:white;padding:11px 14px;border:none;border-radius:8px;cursor:pointer;font-size:1.25em;">
            📖
        </button>
    `;

    const parallelMode = document.getElementById('parallel-mode');
    if (parallelMode) parallelMode.appendChild(panel);

    // Кнопка "Привязать"
    const linkBtn = document.getElementById('link-save-btn');
    if (linkBtn) {
        linkBtn.onclick = async () => {
            if (window.selectedChineseWords.size === 0 || window.selectedRussianWords.size === 0) {
                alert("Выберите слова с обеих сторон!");
                return;
            }
            if (window.linkSelectedWords) window.linkSelectedWords();
            if (window.saveAllLinksToDB) await window.saveAllLinksToDB();
        };
    }

    // Кнопка "Разорвать связь"
    const breakBtn = document.getElementById('break-link-btn');
    if (breakBtn) {
        breakBtn.onclick = () => {
            if (window.breakSelectedLinks) window.breakSelectedLinks();
        };
    }
};

// ======================================================
// ФУНКЦИИ ДЛЯ КНОПОК (оригинальные)
// ======================================================

window.updateLinkButtonState = function() {
    const btn = document.getElementById('link-save-btn');
    if (!btn) return;
    const disabled = window.selectedChineseWords.size === 0 || window.selectedRussianWords.size === 0;
    btn.disabled = disabled;
    btn.style.opacity = disabled ? '0.5' : '1';
};

window.linkSelectedWords = function() {
    const selectedCh = Array.from(window.selectedChineseWords);
    const selectedRu = Array.from(window.selectedRussianWords);

    selectedCh.forEach(chIdx => {
        if (!window.currentMatches[chIdx]) window.currentMatches[chIdx] = [];
        selectedRu.forEach(ruIdx => {
            if (!window.currentMatches[chIdx].includes(ruIdx)) {
                window.currentMatches[chIdx].push(ruIdx);
            }
        });
    });

    if (window.highlightLinkedWords) window.highlightLinkedWords();
    if (window.clearSelections) window.clearSelections();

    if (window.currentEditId && window.saveAllLinksToDB) {
        setTimeout(() => window.saveAllLinksToDB(), 50);
    }
};

window.clearSelections = function() {
    document.querySelectorAll('.chinese-word.selected-for-link, .russian-word.selected-for-link')
        .forEach(el => el.classList.remove('selected-for-link'));

    window.selectedChineseWords.clear();
    window.selectedRussianWords.clear();
    if (window.updateLinkButtonState) window.updateLinkButtonState();
};

window.breakSelectedLinks = function() {
    if (window.selectedChineseWords.size === 0 && window.selectedRussianWords.size === 0) {
        alert("Выберите слова, связи которых хотите разорвать");
        return;
    }

    let removedCount = 0;

    for (const chIdx of window.selectedChineseWords) {
        if (window.currentMatches[chIdx]) {
            const before = window.currentMatches[chIdx].length;

            if (window.selectedRussianWords.size > 0) {
                window.currentMatches[chIdx] = window.currentMatches[chIdx].filter(ruIdx =>
                    !window.selectedRussianWords.has(ruIdx)
                );
            } else {
                delete window.currentMatches[chIdx];
            }

            if (window.currentMatches[chIdx] && window.currentMatches[chIdx].length === 0) {
                delete window.currentMatches[chIdx];
            }

            removedCount += before - (window.currentMatches[chIdx] ? window.currentMatches[chIdx].length : 0);
        }
    }

    if (removedCount > 0) {
        console.log(`✂️ Успешно разорвано ${removedCount} связей`);
        if (window.highlightLinkedWords) window.highlightLinkedWords();
        if (window.clearSelections) window.clearSelections();

        if (window.currentEditId && window.saveAllLinksToDB) {
            setTimeout(() => window.saveAllLinksToDB(), 100);
        }
    } else {
        alert("Не найдено связей для выбранных слов");
    }
};

// Заглушка, если saveAllLinksToDB ещё не определена
if (typeof window.saveAllLinksToDB !== 'function') {
    window.saveAllLinksToDB = async function() {
        console.log("saveAllLinksToDB вызвана (заглушка)");
        if (window.loadMatchesFromDB) await window.loadMatchesFromDB();
    };
}
// ======================================================
// БЛЮР ПЕРЕВОДА (кнопка "Скрыть перевод")
// ======================================================
window.toggleBlur = function() {
    const transDiv = document.getElementById('translation-text');
    if (!transDiv) return;

    window.isBlurred = !window.isBlurred;

    const btn = document.getElementById('blurBtn');
    if (btn) {
        btn.textContent = window.isBlurred
            ? '👁️ Показать перевод'
            : '🙈 Скрыть перевод';
    }

    // Применяем класс блюра
    if (window.isBlurred) {
        transDiv.classList.add('blur-sm');
    } else {
        transDiv.classList.remove('blur-sm');
    }
};

// Применение текущего состояния блюра (вызывается после отрисовки)
window.applyCurrentBlurState = function(container) {
    if (!container) return;

    if (window.isBlurred) {
        container.classList.add('blur-sm');
    } else {
        container.classList.remove('blur-sm');
    }
};
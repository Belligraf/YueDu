console.log("✅ matches.js загружен (общая логика связывания для Parallel + Match)");

// ====================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ======================
window.selectedChineseWords = window.selectedChineseWords || new Set();
window.selectedRussianWords = window.selectedRussianWords || new Set();

// ====================== ОБЩИЕ ФУНКЦИИ СВЯЗЫВАНИЯ ======================

window.highlightLinkedWords = function() {
    console.log("🔄 highlightLinkedWords (общая)");
    const cfg = window.colorConfig || {};

    // Китайские слова
    document.querySelectorAll('.chinese-word').forEach(span => {
        const idx = parseInt(span.getAttribute('data-idx'));
        if (isNaN(idx)) return;

        const isLinked = window.currentMatches?.[idx] && window.currentMatches[idx].length > 0;
        const pos = window.currentWordsPos?.[idx];

        if (isLinked) {
            span.style.backgroundColor = (pos && cfg.posColors?.[pos])
                ? cfg.posColors[pos]
                : (cfg.linked || '#a7f3d0');
            span.style.borderBottom = `2px solid ${cfg.linkedBorder || '#10b981'}`;
        } else {
            span.style.backgroundColor = (pos && cfg.posColors?.[pos])
                ? cfg.posColors[pos]
                : '';
            span.style.borderBottom = '';
        }
    });

    // Русские слова
    document.querySelectorAll('.russian-word').forEach(span => {
        const idx = parseInt(span.getAttribute('data-idx'));
        if (isNaN(idx)) return;

        const isLinked = Object.values(window.currentMatches || {})
                           .some(arr => arr && arr.includes(idx));

        if (isLinked) {
            span.style.backgroundColor = cfg.linked || '#a7f3d0';
            span.style.borderBottom = `2px solid ${cfg.linkedBorder || '#10b981'}`;
        } else {
            span.style.backgroundColor = '';
            span.style.borderBottom = '';
        }
    });
};

window.createControlPanel = function() {
    // Удаляем все панели управления
    document.querySelectorAll('#link-control-panel, #match-control-panel').forEach(el => el.remove());

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

    const container = document.getElementById('parallel-mode') || document.getElementById('match-mode');
    if (container) container.appendChild(panel);

    // Привязать
    const linkBtn = document.getElementById('link-save-btn');
    if (linkBtn) {
        linkBtn.onclick = async () => {
            if (window.selectedChineseWords.size === 0 || window.selectedRussianWords.size === 0) {
                alert("Выберите слова с обеих сторон!");
                return;
            }
            window.linkSelectedWords();
            await window.saveAllLinksToDB();
        };
    }

    // Разорвать
    const breakBtn = document.getElementById('break-link-btn');
    if (breakBtn) {
        breakBtn.onclick = () => window.breakSelectedLinks();
    }
};

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

    window.highlightLinkedWords();
    window.clearSelections();

    if (window.currentEditId && window.saveAllLinksToDB) {
        setTimeout(() => window.saveAllLinksToDB(), 50);
    }
};

window.clearSelections = function() {
    document.querySelectorAll('.selected-for-link').forEach(el => {
        el.classList.remove('selected-for-link');
    });
    window.selectedChineseWords.clear();
    window.selectedRussianWords.clear();
    window.updateLinkButtonState();
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

    // Если выбраны только русские слова
    if (window.selectedChineseWords.size === 0 && window.selectedRussianWords.size > 0) {
        for (const [chIdx, ruList] of Object.entries(window.currentMatches)) {
            const before = ruList.length;
            window.currentMatches[chIdx] = ruList.filter(ruIdx => !window.selectedRussianWords.has(ruIdx));
            if (window.currentMatches[chIdx].length === 0) delete window.currentMatches[chIdx];
            removedCount += before - window.currentMatches[chIdx].length;
        }
    }

    if (removedCount > 0) {
        console.log(`✂️ Разорвано ${removedCount} связей`);
        window.highlightLinkedWords();
        window.clearSelections();

        if (window.currentEditId && window.saveAllLinksToDB) {
            setTimeout(() => window.saveAllLinksToDB(), 100);
        }
    } else {
        alert("Не найдено связей для выбранных слов");
    }
};

// ====================== РЕЖИМ СОПОСТАВЛЕНИЯ ======================
window.loadMatchView = async function() {
    console.log("🔄 loadMatchView запущен");

    const origDiv = document.getElementById('match-original');
    const transDiv = document.getElementById('match-translation');

    if (!origDiv || !transDiv) {
        console.error("❌ Контейнеры match не найдены");
        return;
    }

    window.selectedChineseWords.clear();
    window.selectedRussianWords.clear();

    // Сегментация китайского
    let segmentedWords = [];
    try {
        const res = await fetch('/api/segment/segment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: window.currentOriginalText })
        });
        if (res.ok) {
            const data = await res.json();
            segmentedWords = data.words || [];
        }
    } catch (e) {
        console.error(e);
        segmentedWords = window.currentOriginalText.split('');
    }

    // ==================== КИТАЙСКИЙ ====================
    origDiv.innerHTML = '';
    origDiv.style.whiteSpace = 'pre-wrap';
    origDiv.style.lineHeight = '1.8';
    origDiv.style.fontSize = '1.25rem';

    let chineseWordIndex = 0;
    window.currentWordsArray = [];

    segmentedWords.forEach(token => {
        if (/[\u4e00-\u9fff]/.test(token)) {
            const span = document.createElement('span');
            span.textContent = token;
            span.className = 'chinese-word';
            span.style.cssText = 'display:inline; margin:0; padding:2px 1px; cursor:pointer;';
            span.setAttribute('data-idx', chineseWordIndex);
            window.currentWordsArray[chineseWordIndex] = token;

            span.onclick = function(e) {
                e.stopPropagation();
                if (window.selectedChineseWords.has(chineseWordIndex)) {
                    window.selectedChineseWords.delete(chineseWordIndex);
                    span.classList.remove('selected-for-link');
                } else {
                    window.selectedChineseWords.add(chineseWordIndex);
                    span.classList.add('selected-for-link');
                }
                window.updateLinkButtonState();
            };

            span.oncontextmenu = function(e) {
                e.preventDefault();
                if (typeof window.showPartMenu === 'function') window.showPartMenu(e.clientX, e.clientY, chineseWordIndex, token);
            };

            span.onmouseenter = () => {
                const linked = window.currentMatches[chineseWordIndex];
                if (linked && linked.length) {
                    transDiv.querySelectorAll('.russian-word').forEach(w => {
                        if (linked.includes(parseInt(w.getAttribute('data-idx')))) w.classList.add('temp-highlight');
                    });
                }
            };
            span.onmouseleave = () => transDiv.querySelectorAll('.russian-word').forEach(w => w.classList.remove('temp-highlight'));

            origDiv.appendChild(span);
            chineseWordIndex++;
        } else if (token === '\n') {
            origDiv.appendChild(document.createElement('br'));
        } else {
            const span = document.createElement('span');
            span.textContent = token;
            origDiv.appendChild(span);
        }
    });

    // ==================== РУССКИЙ ====================
    transDiv.innerHTML = '';
    transDiv.style.whiteSpace = 'pre-wrap';
    transDiv.style.lineHeight = '1.8';
    transDiv.style.wordSpacing = '-4px';
    transDiv.style.letterSpacing = '-0.3px';

    if (window.currentTranslationText) {
        let russianWordIndex = 0;
        window.currentTransArray = [];
        let currentWord = '', inWord = false;

        for (let i = 0; i < window.currentTranslationText.length; i++) {
            const char = window.currentTranslationText[i];

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

                    wordSpan.onclick = function(e) {
                        e.stopPropagation();
                        if (window.selectedRussianWords.has(russianWordIndex)) {
                            window.selectedRussianWords.delete(russianWordIndex);
                            wordSpan.classList.remove('selected-for-link');
                        } else {
                            window.selectedRussianWords.add(russianWordIndex);
                            wordSpan.classList.add('selected-for-link');
                        }
                        window.updateLinkButtonState();
                    };

                    wordSpan.onmouseenter = () => {
                        const linked = [];
                        for (const [chIdx, ruIds] of Object.entries(window.currentMatches)) {
                            if (ruIds.includes(russianWordIndex)) linked.push(parseInt(chIdx));
                        }
                        if (linked.length) {
                            origDiv.querySelectorAll('.chinese-word').forEach(w => {
                                if (linked.includes(parseInt(w.getAttribute('data-idx')))) w.classList.add('temp-highlight');
                            });
                        }
                    };
                    wordSpan.onmouseleave = () => origDiv.querySelectorAll('.chinese-word').forEach(w => w.classList.remove('temp-highlight'));

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
    }

    // Создаём общую панель управления
    window.createControlPanel();

    // Загружаем связи из БД
    if (window.currentEditId) {
        await window.loadMatchesFromDB();
    }

    setTimeout(() => {
        window.highlightLinkedWords();
    }, 100);

    console.log("✅ loadMatchView завершён");
};

// Заглушка для saveAllLinksToDB (если не определена в другом файле)
if (typeof window.saveAllLinksToDB !== 'function') {
    window.saveAllLinksToDB = async function() {
        console.log("saveAllLinksToDB вызвана (заглушка в matches.js)");
        if (window.loadMatchesFromDB) await window.loadMatchesFromDB();
    };
}

console.log("✅ matches.js (с общей логикой) готов");
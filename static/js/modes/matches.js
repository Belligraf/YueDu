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
    console.log("🔄 loadMatchView — минимальный и чистый (текст из БД)");

    const origDiv = document.getElementById('match-original');
    const transDiv = document.getElementById('match-translation');
    if (!origDiv || !transDiv) return;

    window.selectedChineseWords.clear();
    window.selectedRussianWords.clear();

    // Главное — рисуем текст точно как в БД
    window.formatAllText();

    // Добавляем только интерактив (клик + ПКМ)
    document.querySelectorAll('#match-original .chinese-word').forEach((span, idx) => {
        span.setAttribute('data-idx', idx);
        span.onclick = function(e) {
            e.stopPropagation();
            if (window.selectedChineseWords.has(idx)) {
                window.selectedChineseWords.delete(idx);
                span.classList.remove('selected-for-link');
            } else {
                window.selectedChineseWords.add(idx);
                span.classList.add('selected-for-link');
            }
            window.updateLinkButtonState();
        };
        span.oncontextmenu = function(e) {
            e.preventDefault();
            if (typeof window.showPartMenu === 'function') window.showPartMenu(e.clientX, e.clientY, idx, span.textContent);
        };
    });

    window.createControlPanel();
    if (window.currentEditId) await window.loadMatchesFromDB();
    setTimeout(() => window.highlightLinkedWords(), 100);

    console.log("✅ Match — текст горизонтальный и соответствует БД");
};

// Заглушка для saveAllLinksToDB (если не определена в другом файле)
if (typeof window.saveAllLinksToDB !== 'function') {
    window.saveAllLinksToDB = async function() {
        console.log("saveAllLinksToDB вызвана (заглушка в matches.js)");
        if (window.loadMatchesFromDB) await window.loadMatchesFromDB();
    };
}

console.log("✅ matches.js (с общей логикой) готов");
console.log("✅ matches.js загружен");

window.selectedChineseWords = window.selectedChineseWords || new Set();
window.selectedRussianWords = window.selectedRussianWords || new Set();

// ====================== ПОДСВЕТКА СВЯЗЕЙ ======================
window.highlightLinkedWords = function() {
    const cfg = window.colorConfig || {};

    // Китайские
    document.querySelectorAll('.chinese-word').forEach(span => {
        const idx = parseInt(span.getAttribute('data-idx'));
        if (isNaN(idx)) return;
        const isLinked = window.currentMatches?.[idx]?.length > 0;
        const pos = window.currentWordsPos?.[idx];
        if (isLinked) {
            span.style.backgroundColor = (pos && pos !== 'unknown' && cfg.posColors?.[pos])
                ? cfg.posColors[pos] : (cfg.linked || '#a7f3d0');
            span.style.borderBottom = `2px solid ${cfg.linkedBorder || '#10b981'}`;
        } else {
            span.style.backgroundColor = (pos && pos !== 'unknown' && cfg.posColors?.[pos])
                ? cfg.posColors[pos] : '';
            span.style.borderBottom = '';
        }
    });

    // Русские — берут цвет от связанного китайского (POS)
    document.querySelectorAll('.russian-word').forEach(span => {
        const idx = parseInt(span.getAttribute('data-idx'));
        if (isNaN(idx)) return;
        const linkedChIdxs = Object.entries(window.currentMatches || {})
            .filter(([, arr]) => arr && arr.includes(idx))
            .map(([ci]) => parseInt(ci));
        if (linkedChIdxs.length > 0) {
            let color = cfg.linked || '#a7f3d0';
            for (const ci of linkedChIdxs) {
                const pos = window.currentWordsPos?.[ci];
                if (pos && pos !== 'unknown' && cfg.posColors?.[pos]) { color = cfg.posColors[pos]; break; }
            }
            span.style.backgroundColor = color;
            span.style.borderBottom = `2px solid ${cfg.linkedBorder || '#10b981'}`;
        } else {
            span.style.backgroundColor = '';
            span.style.borderBottom = '';
        }
    });
};

// ====================== ПАНЕЛЬ УПРАВЛЕНИЯ ======================
window.createControlPanel = function() {
    document.querySelectorAll('#link-control-panel, #match-control-panel').forEach(el => el.remove());
    const panel = document.createElement('div');
    panel.id = 'link-control-panel';
    panel.style.cssText = `position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:white;padding:12px 20px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.15);z-index:1000;display:flex;gap:12px;align-items:center;`;
    panel.innerHTML = `
        <button id="link-save-btn" style="background:#10b981;color:white;padding:11px 24px;border:none;border-radius:8px;font-weight:600;cursor:pointer;">🔗 Привязать</button>
        <button id="break-link-btn" style="background:#f7a2a2;color:white;padding:11px 20px;border:none;border-radius:8px;font-weight:600;cursor:pointer;">✂️ Разорвать связь</button>
        <button onclick="window.saveAllLinksToDB()" style="background:#3b82f6;color:white;padding:11px 20px;border:none;border-radius:8px;font-weight:600;cursor:pointer;">💾 Сохранить</button>
        <button onclick="window.showPosLegend()" style="background:#6366f1;color:white;padding:11px 14px;border:none;border-radius:8px;cursor:pointer;font-size:1.25em;" title="Легенда цветов">📖</button>
    `;
    const container = document.getElementById('parallel-mode') || document.getElementById('match-mode');
    if (container) container.appendChild(panel);

    document.getElementById('link-save-btn').onclick = async () => {
        if (!window.selectedChineseWords.size || !window.selectedRussianWords.size) {
            alert("Выберите слова с обеих сторон!"); return;
        }
        window.linkSelectedWords();
        await window.saveAllLinksToDB();
    };
    document.getElementById('break-link-btn').onclick = () => window.breakSelectedLinks();
};

window.updateLinkButtonState = function() {
    const btn = document.getElementById('link-save-btn');
    if (!btn) return;
    const disabled = !window.selectedChineseWords.size || !window.selectedRussianWords.size;
    btn.disabled = disabled;
    btn.style.opacity = disabled ? '0.5' : '1';
};

window.linkSelectedWords = function() {
    Array.from(window.selectedChineseWords).forEach(ci => {
        if (!window.currentMatches[ci]) window.currentMatches[ci] = [];
        Array.from(window.selectedRussianWords).forEach(ri => {
            if (!window.currentMatches[ci].includes(ri)) window.currentMatches[ci].push(ri);
        });
    });
    window.highlightLinkedWords();
    window.clearSelections();
    if (window.currentEditId && window.saveAllLinksToDB) setTimeout(() => window.saveAllLinksToDB(), 50);
};

window.clearSelections = function() {
    document.querySelectorAll('.selected-for-link').forEach(el => el.classList.remove('selected-for-link'));
    window.selectedChineseWords.clear();
    window.selectedRussianWords.clear();
    window.updateLinkButtonState();
};

window.breakSelectedLinks = function() {
    if (!window.selectedChineseWords.size && !window.selectedRussianWords.size) {
        alert("Выберите слова, связи которых хотите разорвать"); return;
    }
    let removed = 0;
    for (const ci of window.selectedChineseWords) {
        if (!window.currentMatches[ci]) continue;
        const before = window.currentMatches[ci].length;
        if (window.selectedRussianWords.size) {
            window.currentMatches[ci] = window.currentMatches[ci].filter(r => !window.selectedRussianWords.has(r));
        } else {
            delete window.currentMatches[ci];
        }
        if (window.currentMatches[ci]?.length === 0) delete window.currentMatches[ci];
        removed += before - (window.currentMatches[ci]?.length || 0);
    }
    if (!window.selectedChineseWords.size) {
        for (const [ci, arr] of Object.entries(window.currentMatches)) {
            const before = arr.length;
            window.currentMatches[ci] = arr.filter(r => !window.selectedRussianWords.has(r));
            if (!window.currentMatches[ci].length) delete window.currentMatches[ci];
            removed += before - (window.currentMatches[ci]?.length || 0);
        }
    }
    if (removed > 0) {
        window.highlightLinkedWords();
        window.clearSelections();
        if (window.currentEditId && window.saveAllLinksToDB) setTimeout(() => window.saveAllLinksToDB(), 100);
    } else {
        alert("Не найдено связей для выбранных слов");
    }
};

// ====================== РЕЖИМ СОПОСТАВЛЕНИЯ ======================
window.loadMatchView = async function() {
    console.log("🔄 loadMatchView");
    const origDiv = document.getElementById('match-original');
    const transDiv = document.getElementById('match-translation');
    if (!origDiv || !transDiv) return;

    window.selectedChineseWords.clear();
    window.selectedRussianWords.clear();

    // Рендерим текст (chinese-word и russian-word spans создаются здесь)
    window.formatAllText();

    // Навешиваем обработчики на китайские слова
    origDiv.querySelectorAll('.chinese-word').forEach(span => {
        const idx = parseInt(span.getAttribute('data-idx'));
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
            if (window.showPartMenu) window.showPartMenu(e.clientX, e.clientY, idx, span.textContent);
        };
        span.onmouseenter = function() {
            const linked = window.currentMatches[idx];
            if (linked?.length) {
                transDiv.querySelectorAll('.russian-word').forEach(w => {
                    if (linked.includes(parseInt(w.getAttribute('data-idx')))) w.classList.add('temp-highlight');
                });
            }
        };
        span.onmouseleave = function() {
            transDiv.querySelectorAll('.russian-word').forEach(w => w.classList.remove('temp-highlight'));
        };
    });

    // Навешиваем обработчики на русские слова
    transDiv.querySelectorAll('.russian-word').forEach(span => {
        const idx = parseInt(span.getAttribute('data-idx'));
        span.onclick = function(e) {
            e.stopPropagation();
            if (window.selectedRussianWords.has(idx)) {
                window.selectedRussianWords.delete(idx);
                span.classList.remove('selected-for-link');
            } else {
                window.selectedRussianWords.add(idx);
                span.classList.add('selected-for-link');
            }
            window.updateLinkButtonState();
        };
        span.onmouseenter = function() {
            const linkedCh = Object.entries(window.currentMatches || {})
                .filter(([, arr]) => arr && arr.includes(idx))
                .map(([ci]) => parseInt(ci));
            if (linkedCh.length) {
                origDiv.querySelectorAll('.chinese-word').forEach(w => {
                    if (linkedCh.includes(parseInt(w.getAttribute('data-idx')))) w.classList.add('temp-highlight');
                });
            }
        };
        span.onmouseleave = function() {
            origDiv.querySelectorAll('.chinese-word').forEach(w => w.classList.remove('temp-highlight'));
        };
    });

    window.createControlPanel();
    if (window.currentEditId) await window.loadMatchesFromDB();
    setTimeout(() => window.highlightLinkedWords(), 150);
    console.log("✅ Match готов, русских слов:", transDiv.querySelectorAll('.russian-word').length);
};

// ====================== СОХРАНЕНИЕ СВЯЗЕЙ В БД ======================
// API ожидает: { words: [{word, part_of_speech}], translations: [{phrase}], associations: [{word_position, translation_positions}] }
window.saveAllLinksToDB = async function() {
    if (!window.currentEditId) {
        console.warn("saveAllLinksToDB: нет currentEditId");
        return;
    }

    try {
        // Собираем все китайские слова из DOM (в порядке позиций)
        const chineseSpans = document.querySelectorAll(
            '#match-original .chinese-word, #original-text .chinese-word, #parallel-original-reading .chinese-word'
        );
        const words = [];
        chineseSpans.forEach(span => {
            const idx = parseInt(span.getAttribute('data-idx'));
            if (isNaN(idx)) return;
            words[idx] = {
                word: span.textContent.trim(),
                part_of_speech: window.currentWordsPos?.[idx] || null
            };
        });

        // Собираем все русские слова из DOM (в порядке позиций)
        const russianSpans = document.querySelectorAll(
            '#match-translation .russian-word, #translation-text .russian-word, #parallel-translation-reading .russian-word'
        );
        const translations = [];
        russianSpans.forEach(span => {
            const idx = parseInt(span.getAttribute('data-idx'));
            if (isNaN(idx)) return;
            translations[idx] = { phrase: span.textContent.trim() };
        });

        // Убираем дырки в массивах (sparse array → dense)
        const wordsList = words.filter(Boolean);
        const translationsList = translations.filter(Boolean);

        // Собираем ассоциации из currentMatches
        const associations = [];
        Object.entries(window.currentMatches || {}).forEach(([chPos, ruPositions]) => {
            if (!ruPositions || !ruPositions.length) return;
            associations.push({
                word_position: parseInt(chPos),
                translation_positions: ruPositions
            });
        });

        console.log("💾 Сохраняем:", wordsList.length, "слов,", translationsList.length, "переводов,", associations.length, "связей");

        const saveResp = await fetch(`/api/library/${window.currentEditId}/matches`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                words: wordsList,
                translations: translationsList,
                associations: associations
            })
        });

        if (saveResp.ok) {
            console.log("✅ Связи сохранены в БД");
        } else {
            const err = await saveResp.text();
            console.error("Ошибка сохранения:", saveResp.status, err);
        }
    } catch (e) {
        console.error("saveAllLinksToDB ошибка:", e);
    }
};

console.log("✅ matches.js готов");

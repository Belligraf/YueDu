console.log("✅ matches.js загружен");

// ========== РЕЖИМ СОПОСТАВЛЕНИЯ ==========
window.loadMatchView = async function() {
    const matchOrig = document.getElementById('match-original');
    const matchTrans = document.getElementById('match-translation');

    if (!matchOrig || !matchTrans) return;
    if (!window.currentOriginalText) return;

    window.selectedChineseWords.clear();
    window.selectedRussianWords.clear();

    // Получаем сегментированные слова
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
    } catch (err) {}

    // === КИТАЙСКИЙ ТЕКСТ ===
    matchOrig.innerHTML = '<h3 class="font-bold mb-3">📖 Китайский текст (кликни для выбора):</h3>';
    matchOrig.style.whiteSpace = 'pre-wrap';
    matchOrig.style.lineHeight = '1.8';

    let chineseWordIndex = 0;
    window.currentWordsArray = [];
    const wordsToShow = segmentedWords.length ? segmentedWords : [window.currentOriginalText];

    for (const token of wordsToShow) {
        if (/[\u4e00-\u9fff]/.test(token)) {
            const span = document.createElement('span');
            span.textContent = token;
            span.className = 'chinese-word';
            span.style.display = 'inline-block';
            span.style.cursor = 'pointer';
            span.style.margin = '0 2px';
            span.setAttribute('data-idx', chineseWordIndex);

            window.currentWordsArray[chineseWordIndex] = token;

            span.onclick = (function(idx, el) {
                return function(e) {
                    e.stopPropagation();
                    if (window.selectedChineseWords.has(idx)) {
                        window.selectedChineseWords.delete(idx);
                        el.style.backgroundColor = '';
                    } else {
                        window.selectedChineseWords.add(idx);
                        el.style.backgroundColor = '#fef08a';
                    }
                    window.updateMatchButtonState();
                };
            })(chineseWordIndex, span);

            span.oncontextmenu = (function(word) {
                return function(e) {
                    e.preventDefault();
                    window.showTranslationFromDictionary(word);
                    return false;
                };
            })(token);

            // НАВЕДЕНИЕ - подсветка связанных русских слов
            span.onmouseenter = (function(idx) {
                return function() {
                    const linked = window.currentMatches[idx];
                    if (linked && linked.length) {
                        const russianWords = matchTrans.querySelectorAll('.russian-word');
                        russianWords.forEach((w, widx) => {
                            if (linked.includes(widx)) {
                                w.style.backgroundColor = '#fef08a';
                            }
                        });
                    }
                };
            })(chineseWordIndex);

            span.onmouseleave = function() {
                const russianWords = matchTrans.querySelectorAll('.russian-word');
                russianWords.forEach(w => {
                    if (!w.classList.contains('selected-for-link')) {
                        w.style.backgroundColor = '';
                    }
                });
            };

            matchOrig.appendChild(span);
            chineseWordIndex++;
        } else if (token === '\n') {
            matchOrig.appendChild(document.createElement('br'));
        } else {
            const span = document.createElement('span');
            span.textContent = token;
            span.style.display = 'inline';
            matchOrig.appendChild(span);
        }
    }

    // === РУССКИЙ ПЕРЕВОД ===
    matchTrans.innerHTML = '<h3 class="font-bold mb-3">🌍 Русский перевод (кликни для выбора):</h3>';
    matchTrans.style.whiteSpace = 'pre-wrap';
    matchTrans.style.lineHeight = '1.8';

    if (window.currentTranslationText) {
        let russianWordIndex = 0;
        window.currentTransArray = [];
        let currentWord = '';

        for (let i = 0; i < window.currentTranslationText.length; i++) {
            const char = window.currentTranslationText[i];

            if (/[а-яА-Яa-zA-Z0-9]/.test(char)) {
                currentWord += char;
            } else {
                if (currentWord) {
                    const span = document.createElement('span');
                    span.textContent = currentWord;
                    span.className = 'russian-word';
                    span.style.display = 'inline-block';
                    span.style.cursor = 'pointer';
                    span.style.margin = '0 2px';
                    span.setAttribute('data-idx', russianWordIndex);

                    window.currentTransArray[russianWordIndex] = currentWord;

                    span.onclick = (function(idx, el) {
                        return function(e) {
                            e.stopPropagation();
                            if (window.selectedRussianWords.has(idx)) {
                                window.selectedRussianWords.delete(idx);
                                el.style.backgroundColor = '';
                            } else {
                                window.selectedRussianWords.add(idx);
                                el.style.backgroundColor = '#fef08a';
                            }
                            window.updateMatchButtonState();
                        };
                    })(russianWordIndex, span);

                    span.onmouseenter = (function(idx) {
                        return function() {
                            const linked = [];
                            for (const [chIdx, ruIds] of Object.entries(window.currentMatches)) {
                                if (ruIds.includes(idx)) linked.push(parseInt(chIdx));
                            }
                            if (linked.length) {
                                const chineseWords = matchOrig.querySelectorAll('.chinese-word');
                                chineseWords.forEach((w, widx) => {
                                    if (linked.includes(widx)) {
                                        w.style.backgroundColor = '#fef08a';
                                    }
                                });
                            }
                        };
                    })(russianWordIndex);

                    span.onmouseleave = function() {
                        const chineseWords = matchOrig.querySelectorAll('.chinese-word');
                        chineseWords.forEach(w => {
                            if (!w.classList.contains('selected-for-link')) {
                                w.style.backgroundColor = '';
                            }
                        });
                    };

                    matchTrans.appendChild(span);
                    russianWordIndex++;
                    currentWord = '';
                }

                if (char === ' ') {
                    const space = document.createElement('span');
                    space.innerHTML = '&nbsp;';
                    matchTrans.appendChild(space);
                } else if (char === '\n') {
                    matchTrans.appendChild(document.createElement('br'));
                } else {
                    const punct = document.createElement('span');
                    punct.textContent = char;
                    punct.style.display = 'inline';
                    punct.style.color = '#666';
                    matchTrans.appendChild(punct);
                }
            }
        }

        if (currentWord) {
            const span = document.createElement('span');
            span.textContent = currentWord;
            span.className = 'russian-word';
            span.style.display = 'inline-block';
            span.style.cursor = 'pointer';
            window.currentTransArray[russianWordIndex] = currentWord;
            matchTrans.appendChild(span);
        }
    }

    window.createMatchPanel();

    if (window.currentEditId) {
        await window.loadMatchesFromDB();
    }

    window.highlightMatchLinkedWords();
};

window.createMatchPanel = function() {
    const existing = document.getElementById('match-control-panel');
    if (existing) existing.remove();

    const container = document.getElementById('match-mode');
    if (!container) return;

    const panel = document.createElement('div');
    panel.id = 'match-control-panel';
    panel.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:white;padding:12px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:1000;display:flex;gap:12px;';
    panel.innerHTML = `
        <button id="match-link-btn" style="background:#3b82f6;color:white;padding:8px 16px;border-radius:8px;border:none;cursor:pointer;">🔗 Привязать</button>
        <button onclick="window.clearMatchSelections()" style="background:#6b7280;color:white;padding:8px 16px;border-radius:8px;border:none;cursor:pointer;">🗑️ Очистить</button>
        <button onclick="window.saveAllLinksToDB()" style="background:#10b981;color:white;padding:8px 16px;border-radius:8px;border:none;cursor:pointer;">💾 Сохранить</button>
    `;
    container.appendChild(panel);

    document.getElementById('match-link-btn').onclick = () => window.linkMatchSelectedWords();
};

window.updateMatchButtonState = function() {
    const btn = document.getElementById('match-link-btn');
    if (btn) {
        const disabled = window.selectedChineseWords.size === 0 || window.selectedRussianWords.size === 0;
        btn.disabled = disabled;
        btn.style.opacity = disabled ? '0.5' : '1';
    }
};

window.linkMatchSelectedWords = function() {
    for (const chIdx of window.selectedChineseWords) {
        if (!window.currentMatches[chIdx]) window.currentMatches[chIdx] = [];
        for (const ruIdx of window.selectedRussianWords) {
            if (!window.currentMatches[chIdx].includes(ruIdx)) {
                window.currentMatches[chIdx].push(ruIdx);
            }
        }
    }
    window.highlightMatchLinkedWords();
    window.clearMatchSelections();
    if (window.currentEditId) window.saveAllLinksToDB();
};

window.highlightMatchLinkedWords = function() {
    const matchOrig = document.getElementById('match-original');
    const matchTrans = document.getElementById('match-translation');

    if (matchOrig) {
        const chineseWords = matchOrig.querySelectorAll('.chinese-word');
        chineseWords.forEach((word, idx) => {
            if (window.currentMatches[idx] && window.currentMatches[idx].length) {
                word.style.backgroundColor = '#d1fae5';
            } else {
                word.style.backgroundColor = '';
            }
        });
    }

    if (matchTrans) {
        const linked = new Set();
        for (const ruIds of Object.values(window.currentMatches)) {
            ruIds.forEach(id => linked.add(id));
        }
        const russianWords = matchTrans.querySelectorAll('.russian-word');
        russianWords.forEach((word, idx) => {
            if (linked.has(idx)) {
                word.style.backgroundColor = '#d1fae5';
            } else {
                word.style.backgroundColor = '';
            }
        });
    }
};

window.clearMatchSelections = function() {
    window.selectedChineseWords.clear();
    window.selectedRussianWords.clear();
    document.querySelectorAll('#match-mode .chinese-word, #match-mode .russian-word').forEach(el => {
        el.style.backgroundColor = '';
    });
    window.updateMatchButtonState();
};
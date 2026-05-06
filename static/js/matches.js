console.log("✅ matches.js загружен");

// ========== РЕЖИМ СОПОСТАВЛЕНИЯ ==========
window.loadMatchView = async function() {
    const matchOrig = document.getElementById('match-original');
    const matchTrans = document.getElementById('match-translation');
    if (!matchOrig || !matchTrans) return;
    if (!window.currentOriginalText) return;

    window.selectedChineseWords.clear();
    window.selectedRussianWords.clear();

    // Получить сегментацию
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
    } catch (err) { console.error(err); }

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
            span.style.margin = '0';
            const idx = chineseWordIndex;
            span.setAttribute('data-idx', idx);
            window.currentWordsArray[idx] = token;

            span.onclick = (function(i, el) {
                return function(e) {
                    e.stopPropagation();
                    if (window.selectedChineseWords.has(i)) {
                        window.selectedChineseWords.delete(i);
                        el.classList.remove('selected-for-link');
                    } else {
                        window.selectedChineseWords.add(i);
                        el.classList.add('selected-for-link');
                    }
                    window.updateMatchButtonState();
                };
            })(idx, span);

            span.oncontextmenu = (function(i, w) {
                return function(e) {
                    e.preventDefault();
                    if (typeof window.showPartMenu === 'function') {
                        window.showPartMenu(e.clientX, e.clientY, i, w);
                    }
                    return false;
                };
            })(idx, token);

            // Наведение для match режима: подсветка русских слов
            span.onmouseenter = (function(i) {
                return function() {
                    const linked = window.currentMatches[i];
                    if (linked && linked.length) {
                        const russianWords = matchTrans.querySelectorAll('.russian-word');
                        russianWords.forEach(w => {
                            if (linked.includes(parseInt(w.getAttribute('data-idx')))) {
                                w.classList.add('temp-highlight');
                            }
                        });
                    }
                };
            })(idx);
            span.onmouseleave = function() {
                const russianWords = matchTrans.querySelectorAll('.russian-word');
                russianWords.forEach(w => w.classList.remove('temp-highlight'));
            };

            // Постоянная подсветка: связанные (зелёный) или часть речи
            if (window.currentMatches[idx] && window.currentMatches[idx].length) {
                span.style.backgroundColor = '#d1fae5';
            } else {
                const pos = window.currentWordsPos ? window.currentWordsPos[idx] : null;
                if (pos && pos !== 'unknown' && window.posColors && window.posColors[pos]) {
                    span.style.backgroundColor = window.posColors[pos];
                } else {
                    span.style.backgroundColor = '';
                }
            }

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

    // Русский перевод
    matchTrans.innerHTML = '<h3 class="font-bold mb-3">🌍 Русский перевод (кликни для выбора):</h3>';
    matchTrans.style.whiteSpace = 'pre-wrap';
    matchTrans.style.lineHeight = '1.8';
    if (window.currentTranslationText) {
        let russianWordIndex = 0;
        window.currentTransArray = [];
        let currentWord = '';
        const translationText = window.currentTranslationText;
        for (let i = 0; i < translationText.length; i++) {
            const char = translationText[i];
            if (/[а-яА-Яa-zA-Z0-9]/.test(char)) {
                currentWord += char;
            } else {
                if (currentWord) {
                    const span = document.createElement('span');
                    span.textContent = currentWord;
                    span.className = 'russian-word';
                    span.style.display = 'inline-block';
                    span.style.cursor = 'pointer';
                    span.style.margin = '0';
                    span.setAttribute('data-idx', russianWordIndex);
                    window.currentTransArray[russianWordIndex] = currentWord;

                    span.onclick = (function(idx, el) {
                        return function(e) {
                            e.stopPropagation();
                            if (window.selectedRussianWords.has(idx)) {
                                window.selectedRussianWords.delete(idx);
                                el.classList.remove('selected-for-link');
                            } else {
                                window.selectedRussianWords.add(idx);
                                el.classList.add('selected-for-link');
                            }
                            window.updateMatchButtonState();
                        };
                    })(russianWordIndex, span);

                    span.onmouseenter = (function(idx) {
                        return function() {
                            const linkedChinese = [];
                            for (const [chIdx, ruIds] of Object.entries(window.currentMatches)) {
                                if (ruIds.includes(idx)) linkedChinese.push(parseInt(chIdx));
                            }
                            if (linkedChinese.length) {
                                const chineseWords = matchOrig.querySelectorAll('.chinese-word');
                                chineseWords.forEach(w => {
                                    if (linkedChinese.includes(parseInt(w.getAttribute('data-idx')))) {
                                        w.classList.add('temp-highlight');
                                    }
                                });
                            }
                        };
                    })(russianWordIndex);
                    span.onmouseleave = function() {
                        const chineseWords = matchOrig.querySelectorAll('.chinese-word');
                        chineseWords.forEach(w => w.classList.remove('temp-highlight'));
                    };

                    const isLinked = Object.values(window.currentMatches).some(ruList => ruList.includes(russianWordIndex));
                    span.style.backgroundColor = isLinked ? '#d1fae5' : '';

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
            span.setAttribute('data-idx', russianWordIndex);
            matchTrans.appendChild(span);
        }
    }

    window.createMatchPanel();
    if (window.currentEditId) await window.loadMatchesForMatchView();
    window.highlightMatchLinkedWords(); // поддержка постоянной зелёной подсветки
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

window.loadMatchesForMatchView = async function() {
    if (!window.currentEditId) return;
    try {
        const response = await fetch(`/api/library/${window.currentEditId}/matches`);
        if (response.ok) {
            const data = await response.json();
            // Карта глобальный ID -> позиция
            const transIdToPos = {};
            data.translations?.forEach(t => { transIdToPos[t.id] = t.position; });
            window.currentMatches = {};
            data.words?.forEach(word => {
                if (word.translation_ids?.length) {
                    const positions = word.translation_ids.map(id => transIdToPos[id]).filter(p => p !== undefined);
                    if (positions.length) {
                        window.currentMatches[word.position] = positions;
                    }
                }
            });
            console.log("Загружены связи для match:", window.currentMatches);
            window.highlightMatchLinkedWords();
        }
    } catch(e) {
        console.error(e);
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

window.showPartMenu = function(x, y, wordIdx, wordText) {
    console.log("showPartMenu called", x, y, wordIdx, wordText);
    const existing = document.getElementById('pos-menu');
    if (existing) existing.remove();

    const menu = document.createElement('div');
    menu.id = 'pos-menu';
    menu.style.cssText = `position:fixed;left:${x}px;top:${y}px;background:white;border:1px solid #ccc;border-radius:8px;box-shadow:2px 2px 10px rgba(0,0,0,0.2);z-index:10000;padding:4px 0;min-width:150px;`;

    const parts = [
        {tag:'noun', label:'Существительное'},
        {tag:'verb', label:'Глагол'},
        {tag:'adj', label:'Прилагательное'},
        {tag:'adv', label:'Наречие'},
        {tag:'pron', label:'Местоимение'},
        {tag:'num', label:'Числительное'},
        {tag:'conj', label:'Союз'},
        {tag:'prep', label:'Предлог'},
        {tag:'intj', label:'Междометие'},
        {tag:'part', label:'Частица'},
        {tag:'unknown', label:'Сбросить подсветку'}
    ];

    parts.forEach(part => {
        const item = document.createElement('div');
        item.textContent = part.label;
        item.style.cssText = 'padding:6px 12px;cursor:pointer;transition:background 0.2s;';
        item.onmouseenter = () => item.style.backgroundColor = '#f0f0f0';
        item.onmouseleave = () => item.style.backgroundColor = '';
        item.onclick = () => {
            window.updatePartOfSpeech(wordIdx, part.tag);
            menu.remove();
        };
        menu.appendChild(item);
    });

    document.body.appendChild(menu);
    setTimeout(() => {
        const closeHandler = (e) => {
            if (!menu.contains(e.target)) menu.remove();
            document.removeEventListener('click', closeHandler);
        };
        document.addEventListener('click', closeHandler);
    }, 0);
};

window.updatePartOfSpeech = async function(wordIdx, newPos) {
    const wordId = window.currentWordsIds?.[wordIdx];
    if (!wordId) {
        console.warn(`Нет ID для слова с индексом ${wordIdx}`);
        return;
    }
    try {
        const res = await fetch(`/api/library/words/${wordId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ part_of_speech: newPos })
        });
        if (res.ok) {
            // Обновить локальный массив
            window.currentWordsPos[wordIdx] = newPos;
            // Найти span и применить подсветку
            const span = document.querySelector(`.chinese-word[data-idx='${wordIdx}']`);
            if (span) window.applyPosHighlight(span, newPos);
            console.log(`Слову "${window.currentWordsArray[wordIdx]}" назначена часть речи: ${newPos}`);
        } else {
            console.error('Ошибка обновления части речи', res.status);
        }
    } catch(e) { console.error(e); }
};

window.updatePartOfSpeech = async function(wordIdx, newPos) {
    // Найти глобальный ID слова (у нас есть currentWordsIds массив, нужно заполнить при загрузке)
    const wordId = window.currentWordsIds?.[wordIdx];
    if (!wordId) {
        console.warn("Нет ID слова");
        return;
    }
    try {
        const response = await fetch(`/api/library/words/${wordId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ part_of_speech: newPos })
        });
        if (response.ok) {
            // Обновить локальный массив
            window.currentWordsPos[wordIdx] = newPos;
            // Найти соответствующий DOM-элемент и применить подсветку
            const targetSpan = document.querySelector(`.chinese-word[data-idx='${wordIdx}']`);
            if (targetSpan) window.applyPosHighlight(targetSpan, newPos);
        }
    } catch(e) { console.error(e); }
};
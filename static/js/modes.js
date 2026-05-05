console.log("✅ modes.js загружен");

// Глобальные переменные
window.selectedChineseWords = new Set();
window.selectedRussianWords = new Set();

// ========== ЗАГРУЗКА ТЕКСТА ИЗ БИБЛИОТЕКИ ==========
window.loadTextFromLibrary = async function(id) {
    try {
        const response = await fetch(`/api/library/${id}`);
        if (!response.ok) throw new Error('Ошибка загрузки');

        const text = await response.json();

        window.currentOriginalText = text.content;
        window.currentTranslationText = text.translation || '';
        window.currentEditId = text.id;

        // Заполняем поля ввода
        const inputText = document.getElementById('inputText');
        const inputTranslation = document.getElementById('inputTranslation');
        if (inputText) inputText.value = window.currentOriginalText;
        if (inputTranslation) inputTranslation.value = window.currentTranslationText;

        // Загружаем связи из БД
        await window.loadMatchesFromDB();

        // Отображаем в параллельном режиме
        await window.loadParallelView();

        console.log(`✅ Загружен текст: ${text.title}`);
    } catch (error) {
        console.error("Ошибка загрузки текста:", error);
        alert("Ошибка загрузки текста");
    }
};

// ========== ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК ==========
window.showTab = async function(tabName) {
    const container = document.getElementById('content-container');
    if (!container) return;

    const response = await fetch(`/static/modes/${tabName}.html`);
    const html = await response.text();
    container.innerHTML = html;

    setTimeout(() => {
        const simpleMode = document.getElementById('simple-mode');
        const parallelMode = document.getElementById('parallel-mode');
        const matchMode = document.getElementById('match-mode');
        const simpleBtn = document.getElementById('tab-simple-btn');
        const parallelBtn = document.getElementById('tab-parallel-btn');
        const matchBtn = document.getElementById('tab-match-btn');

        if (simpleMode) simpleMode.classList.add('hidden');
        if (parallelMode) parallelMode.classList.add('hidden');
        if (matchMode) matchMode.classList.add('hidden');

        if (simpleBtn) simpleBtn.classList.remove('tab-active');
        if (parallelBtn) parallelBtn.classList.remove('tab-active');
        if (matchBtn) matchBtn.classList.remove('tab-active');

        if (tabName === 'simple') {
            if (simpleMode) simpleMode.classList.remove('hidden');
            if (simpleBtn) simpleBtn.classList.add('tab-active');
        } else if (tabName === 'parallel') {
            if (parallelMode) parallelMode.classList.remove('hidden');
            if (parallelBtn) parallelBtn.classList.add('tab-active');
            if (window.currentOriginalText) window.loadParallelView();
        } else if (tabName === 'match') {
            if (matchMode) matchMode.classList.remove('hidden');
            if (matchBtn) matchBtn.classList.add('tab-active');
            if (window.currentOriginalText && window.loadMatchView) window.loadMatchView();
        }
    }, 100);
};

// ========== ПРОСТОЙ РЕЖИМ ==========
window.processText = async function() {
    const input = document.getElementById('inputText');
    const translationInput = document.getElementById('inputTranslation');
    if (!input) return;

    const text = input.value;
    if (!text.trim()) {
        alert('Введите текст');
        return;
    }

    window.currentOriginalText = text;
    window.currentTranslationText = translationInput?.value || '';

    // Сегментация через jieba
    try {
        const response = await fetch('/api/segment/segment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text })
        });
        if (response.ok) {
            const data = await response.json();
            window.currentSegmentedWords = data.words;
        }
    } catch (err) {
        console.error("Ошибка сегментации:", err);
    }

    const parallelMode = document.getElementById('parallel-mode');
    if (parallelMode && !parallelMode.classList.contains('hidden')) {
        window.loadParallelView();
    }
};

// ========== ПАРАЛЛЕЛЬНЫЙ РЕЖИМ ==========
window.loadParallelView = async function() {
    const origDiv = document.getElementById('original-text');
    const transDiv = document.getElementById('translation-text');

    if (!origDiv || !transDiv) return;
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
    } catch (err) {
        console.error("Ошибка:", err);
    }

    // === ОТОБРАЖАЕМ КИТАЙСКИЙ ТЕКСТ (слова целиком, а не по символам) ===
    origDiv.innerHTML = '';
    origDiv.style.whiteSpace = 'pre-wrap';
    origDiv.style.lineHeight = '1.8';
    origDiv.style.fontSize = '1.2rem';

    let chineseWordIndex = 0;
    window.currentWordsArray = [];

    // Используем сегментированные слова от jieba
    const wordsToShow = segmentedWords.length ? segmentedWords : [window.currentOriginalText];

    for (let i = 0; i < wordsToShow.length; i++) {
        const token = wordsToShow[i];

        if (/[\u4e00-\u9fff]/.test(token)) {
            // Целое китайское слово
            const span = document.createElement('span');
            span.textContent = token;
            span.className = 'chinese-word';
            span.style.display = 'inline-block';
            span.style.cursor = 'pointer';
            span.setAttribute('data-idx', chineseWordIndex);

            window.currentWordsArray[chineseWordIndex] = token;

            // Левый клик - выделение
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
                    window.updateLinkButtonState();
                };
            })(chineseWordIndex, span);

            // Правый клик - перевод
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
                        const russianWords = transDiv.querySelectorAll('.russian-word');
                        russianWords.forEach((w, widx) => {
                            if (linked.includes(widx)) {
                                w.style.backgroundColor = '#fef08a';
                            }
                        });
                    }
                };
            })(chineseWordIndex);

            span.onmouseleave = function() {
                const russianWords = transDiv.querySelectorAll('.russian-word');
                russianWords.forEach(w => {
                    if (!w.classList.contains('selected-for-link')) {
                        w.style.backgroundColor = '';
                    }
                });
            };

            origDiv.appendChild(span);
            chineseWordIndex++;
        }
        else if (token === '\n') {
            origDiv.appendChild(document.createElement('br'));
        }
        else {
            // Пробелы и знаки препинания
            const span = document.createElement('span');
            span.textContent = token;
            span.style.display = 'inline';
            origDiv.appendChild(span);
        }
    }

    // === ОТОБРАЖАЕМ РУССКИЙ ПЕРЕВОД ===
    transDiv.innerHTML = '';
    transDiv.style.whiteSpace = 'pre-wrap';
    transDiv.style.lineHeight = '1.8';

    if (window.currentTranslationText) {
        const translationText = window.currentTranslationText;
        let russianWordIndex = 0;
        window.currentTransArray = [];
        let currentWord = '';
        let inWord = false;

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
                    wordSpan.style.display = 'inline-block';
                    wordSpan.style.cursor = 'pointer';
                    wordSpan.setAttribute('data-idx', russianWordIndex);

                    window.currentTransArray[russianWordIndex] = currentWord;

                    wordSpan.onclick = (function(idx, el) {
                        return function(e) {
                            e.stopPropagation();
                            if (window.selectedRussianWords.has(idx)) {
                                window.selectedRussianWords.delete(idx);
                                el.style.backgroundColor = '';
                            } else {
                                window.selectedRussianWords.add(idx);
                                el.style.backgroundColor = '#fef08a';
                            }
                            window.updateLinkButtonState();
                        };
                    })(russianWordIndex, wordSpan);

                    wordSpan.onmouseenter = (function(idx) {
                        return function() {
                            const linked = [];
                            for (const [chIdx, ruIds] of Object.entries(window.currentMatches)) {
                                if (ruIds.includes(idx)) linked.push(parseInt(chIdx));
                            }
                            if (linked.length) {
                                const chineseWords = origDiv.querySelectorAll('.chinese-word');
                                chineseWords.forEach((w, widx) => {
                                    if (linked.includes(widx)) {
                                        w.style.backgroundColor = '#fef08a';
                                    }
                                });
                            }
                        };
                    })(russianWordIndex);

                    wordSpan.onmouseleave = function() {
                        const chineseWords = origDiv.querySelectorAll('.chinese-word');
                        chineseWords.forEach(w => {
                            if (!w.classList.contains('selected-for-link')) {
                                w.style.backgroundColor = '';
                            }
                        });
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
                    punct.style.display = 'inline';
                    punct.style.color = '#666';
                    transDiv.appendChild(punct);
                }
            }
        }

        if (currentWord) {
            const wordSpan = document.createElement('span');
            wordSpan.textContent = currentWord;
            wordSpan.className = 'russian-word';
            wordSpan.style.display = 'inline-block';
            wordSpan.style.cursor = 'pointer';
            wordSpan.setAttribute('data-idx', russianWordIndex);
            window.currentTransArray[russianWordIndex] = currentWord;
            transDiv.appendChild(wordSpan);
        }

        if (window.isBlurred) {
            transDiv.classList.add('blur-sm');
        }
    }

    window.createControlPanel();

    if (window.currentEditId) {
        await window.loadMatchesFromDB();
    }

    window.highlightLinkedWords();
};

// ========== ЗАГРУЗКА СВЯЗЕЙ ИЗ БД ==========
window.loadMatchesFromDB = async function() {
    if (!window.currentEditId) return;
    try {
        const response = await fetch(`/api/library/${window.currentEditId}/matches`);
        if (response.ok) {
            const data = await response.json();
            window.currentMatches = {};
            if (data.words) {
                data.words.forEach(word => {
                    if (word.translation_ids && word.translation_ids.length) {
                        window.currentMatches[word.position] = word.translation_ids;
                    }
                });
            }
            console.log("Загружены связи:", window.currentMatches);
            window.highlightLinkedWords();
        }
    } catch(e) {
        console.error("Ошибка загрузки связей:", e);
    }
};

// ========== ПОДСВЕТКА СВЯЗАННЫХ СЛОВ ==========
window.highlightLinkedWords = function() {
    const origDiv = document.getElementById('original-text');
    const transDiv = document.getElementById('translation-text');

    console.log("Подсветка связей, currentMatches:", window.currentMatches);

    if (origDiv) {
        const chineseWords = origDiv.querySelectorAll('.chinese-word');
        chineseWords.forEach((word, idx) => {
            if (window.currentMatches && window.currentMatches[idx] && window.currentMatches[idx].length) {
                word.style.backgroundColor = '#d1fae5';  // Зеленый для связанных
                word.style.borderRadius = '4px';
            } else {
                word.style.backgroundColor = '';
            }
        });
    }

    if (transDiv) {
        // Собираем все русские индексы, которые связаны
        const linkedRussianIndices = new Set();
        if (window.currentMatches) {
            for (const ruIndices of Object.values(window.currentMatches)) {
                if (ruIndices && ruIndices.length) {
                    ruIndices.forEach(idx => linkedRussianIndices.add(idx));
                }
            }
        }

        const russianWords = transDiv.querySelectorAll('.russian-word');
        russianWords.forEach((word, idx) => {
            if (linkedRussianIndices.has(idx)) {
                word.style.backgroundColor = '#d1fae5';  // Зеленый для связанных
                word.style.borderRadius = '4px';
            } else {
                word.style.backgroundColor = '';
            }
        });
    }
};

// ========== ПАНЕЛЬ УПРАВЛЕНИЯ ==========
window.createControlPanel = function() {
    const existing = document.getElementById('link-control-panel');
    if (existing) existing.remove();

    const container = document.getElementById('parallel-mode');
    if (!container) return;

    const panel = document.createElement('div');
    panel.id = 'link-control-panel';
    panel.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:white;padding:12px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:1000;display:flex;gap:12px;';
    panel.innerHTML = `
        <button id="link-btn" style="background:#3b82f6;color:white;padding:8px 16px;border-radius:8px;border:none;cursor:pointer;">🔗 Привязать</button>
        <button onclick="window.clearSelections()" style="background:#6b7280;color:white;padding:8px 16px;border-radius:8px;border:none;cursor:pointer;">🗑️ Очистить</button>
        <button onclick="window.saveAllLinksToDB()" style="background:#10b981;color:white;padding:8px 16px;border-radius:8px;border:none;cursor:pointer;">💾 Сохранить</button>
    `;
    container.appendChild(panel);

    document.getElementById('link-btn').onclick = () => window.linkSelectedWords();
};

window.updateLinkButtonState = function() {
    const btn = document.getElementById('link-btn');
    if (btn) {
        const disabled = window.selectedChineseWords.size === 0 || window.selectedRussianWords.size === 0;
        btn.disabled = disabled;
        btn.style.opacity = disabled ? '0.5' : '1';
    }
};

window.linkSelectedWords = function() {
    console.log("Привязка слов, китайские:", Array.from(window.selectedChineseWords), "русские:", Array.from(window.selectedRussianWords));

    for (const chIdx of window.selectedChineseWords) {
        if (!window.currentMatches[chIdx]) window.currentMatches[chIdx] = [];
        for (const ruIdx of window.selectedRussianWords) {
            if (!window.currentMatches[chIdx].includes(ruIdx)) {
                window.currentMatches[chIdx].push(ruIdx);
                console.log(`Связали китайское слово ${chIdx} с русским ${ruIdx}`);
            }
        }
    }

    window.highlightLinkedWords();
    window.clearSelections();

    // Автоматически сохраняем после привязки
    if (window.currentEditId) {
        setTimeout(() => window.saveAllLinksToDB(), 100);
    }
};
window.clearSelections = function() {
    window.selectedChineseWords.clear();
    window.selectedRussianWords.clear();
    document.querySelectorAll('.chinese-word, .russian-word').forEach(el => {
        el.style.backgroundColor = '';
    });
    window.updateLinkButtonState();
};

window.showTranslationFromDictionary = async function(word) {
    try {
        const res = await fetch(`/api/dictionary/translate/${encodeURIComponent(word)}`);
        if (res.ok) {
            const data = await res.json();
            if (data.translation) {
                window.showTranslationPopup(word, [data.translation]);
                return;
            }
        }
        window.showTranslationPopup(word, []);
    } catch(e) {}
};

window.saveAllLinksToDB = async function() {
    if (!window.currentEditId) {
        console.warn("Нет ID текста, сначала сохраните текст");
        return;
    }

    console.log("Сохраняем связи в БД...", window.currentMatches);

    // Собираем уникальные китайские слова
    const allWords = [];
    const chineseElements = document.querySelectorAll('#original-text .chinese-word, #match-original .chinese-word');
    chineseElements.forEach((el, idx) => {
        if (el.textContent && /[\u4e00-\u9fff]/.test(el.textContent)) {
            allWords.push({ word: el.textContent, position: idx });
        }
    });

    // Собираем уникальные русские слова
    const allTranslations = [];
    const russianElements = document.querySelectorAll('#translation-text .russian-word, #match-translation .russian-word');
    russianElements.forEach((el, idx) => {
        if (el.textContent && /[а-яА-Я]/.test(el.textContent)) {
            allTranslations.push({ phrase: el.textContent, position: idx });
        }
    });

    const associations = [];
    for (const [wordIdx, transIds] of Object.entries(window.currentMatches)) {
        if (transIds && transIds.length > 0) {
            associations.push({
                word_id: parseInt(wordIdx),
                translation_ids: transIds
            });
        }
    }

    const matchData = {
        words: allWords,
        translations: allTranslations,
        associations: associations
    };

    try {
        const response = await fetch(`/api/library/${window.currentEditId}/matches`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(matchData)
        });

        if (response.ok) {
            console.log("✅ Связи сохранены в БД");
        } else {
            console.error("Ошибка сохранения:", response.status);
        }
    } catch (error) {
        console.error("Ошибка:", error);
    }
};

window.toggleBlur = function() {
    const transDiv = document.getElementById('translation-text');
    if (!transDiv) return;
    window.isBlurred = !window.isBlurred;
    const btn = document.getElementById('blurBtn');
    if (window.isBlurred) {
        transDiv.classList.add('blur-sm');
        if (btn) btn.textContent = '👁️ Показать перевод';
    } else {
        transDiv.classList.remove('blur-sm');
        if (btn) btn.textContent = '🙈 Скрыть перевод';
    }
};
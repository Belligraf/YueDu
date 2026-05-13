console.log("✅ modes.js загружен");

// Глобальные переменные
window.selectedChineseWords = new Set();
window.selectedRussianWords = new Set();
window.loadMatches = window.loadMatchesFromDB;

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
// ========== ПРОСТОЙ РЕЖИМ ==========
window.processText = async function() {
    const input = document.getElementById('inputText');
    const translationInput = document.getElementById('inputTranslation');
    const resultDiv = document.getElementById('result');

    if (!input || !resultDiv) return;

    const text = input.value.trim();
    if (!text) {
        alert('Введите китайский текст');
        return;
    }

    window.currentOriginalText = text;
    window.currentTranslationText = translationInput?.value.trim() || '';

    try {
        const response = await fetch('/api/segment/segment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text })
        });

        if (response.ok) {
            const data = await response.json();
            window.currentSegmentedWords = data.words || [];
        }
    } catch (err) {
        console.error("Ошибка сегментации:", err);
        window.currentSegmentedWords = text.split(''); // fallback
    }

    // === ОТРИСОВКА РЕЗУЛЬТАТА В ПРОСТОМ РЕЖИМЕ ===
    if (resultDiv) {
        resultDiv.innerHTML = window.currentSegmentedWords
            .map(word => {
                if (/[\u4e00-\u9fff]/.test(word)) {
                    return `<span class="chinese-word" style="padding:2px 6px; margin:1px; border-radius:4px; cursor:pointer;">${word}</span>`;
                }
                return word === '\n' ? '<br>' : word;
            })
            .join('');
    }

    console.log("✅ Текст разбит на слова и отображён");

    // Автоматически переключаемся в параллельный режим
    setTimeout(() => {
        window.showTab('parallel');
    }, 300);
};

// ========== ПАРАЛЛЕЛЬНЫЙ РЕЖИМ ==========
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
    } catch (err) { console.error(err); }

    // Отрисовка китайского текста
    origDiv.innerHTML = '';
    origDiv.style.whiteSpace = 'pre-wrap';
    origDiv.style.lineHeight = '1.8';
    origDiv.style.fontSize = '1.2rem';

    let chineseWordIndex = 0;
    window.currentWordsArray = [];
    const wordsToShow = segmentedWords.length ? segmentedWords : [window.currentOriginalText];

    for (let i = 0; i < wordsToShow.length; i++) {
        const token = wordsToShow[i];
        if (/[\u4e00-\u9fff]/.test(token)) {
            const span = document.createElement('span');
            span.textContent = token;
            span.className = 'chinese-word';
            span.style.display = 'inline-block';
            span.style.cursor = 'pointer';
            const idx = chineseWordIndex;
            span.setAttribute('data-idx', idx);
            window.currentWordsArray[idx] = token;

            // Левый клик для выделения (класс selected-for-link)
            span.onclick = (function(i, el) {
                return function(e) {
                    e.stopPropagation();
                    // Если слово уже выделено - снимаем выделение
                    if (window.selectedChineseWords.has(i)) {
                        window.selectedChineseWords.delete(i);
                        el.classList.remove('selected-for-link');
                        // Также снимаем выделение со связанных русских слов
                        const linkedRussian = window.currentMatches[i] || [];
                        for (const ruIdx of linkedRussian) {
                            const ruEl = document.querySelector(`.russian-word[data-idx='${ruIdx}']`);
                            if (ruEl) ruEl.classList.remove('selected-for-link');
                            window.selectedRussianWords.delete(ruIdx);
                        }
                    } else {
                        window.selectedChineseWords.add(i);
                        el.classList.add('selected-for-link');
                        // Выделяем связанные русские слова
                        const linkedRussian = window.currentMatches[i] || [];
                        for (const ruIdx of linkedRussian) {
                            const ruEl = document.querySelector(`.russian-word[data-idx='${ruIdx}']`);
                            if (ruEl) ruEl.classList.add('selected-for-link');
                            window.selectedRussianWords.add(ruIdx);
                        }
                    }
                    window.updateLinkButtonState();
                };
            })(idx, span);

            // Правый клик для меню части речи
            span.oncontextmenu = (function(i, w) {
                return function(e) {
                    e.preventDefault();
                    if (typeof window.showPartMenu === 'function') {
                        window.showPartMenu(e.clientX, e.clientY, i, w);
                    }
                    return false;
                };
            })(idx, token);

            // Наведение на китайское слово -> временная подсветка русских слов (класс temp-highlight)
            span.onmouseenter = (function(i) {
                return function() {
                    const linked = window.currentMatches[i];
                    if (linked && linked.length) {
                        const russianWords = transDiv.querySelectorAll('.russian-word');
                        russianWords.forEach(w => {
                            if (linked.includes(parseInt(w.getAttribute('data-idx')))) {
                                w.classList.add('temp-highlight');
                            }
                        });
                    }
                };
            })(idx);
            span.onmouseleave = function() {
                const russianWords = transDiv.querySelectorAll('.russian-word');
                russianWords.forEach(w => w.classList.remove('temp-highlight'));
            };

            // Применить постоянную подсветку (часть речи или связанность)
            if (window.currentMatches[idx] && window.currentMatches[idx].length) {
                span.style.backgroundColor = '#d1fae5'; // зелёный для связанных
            } else {
                const pos = window.currentWordsPos ? window.currentWordsPos[idx] : null;
                if (pos && pos !== 'unknown' && window.posColors && window.posColors[pos]) {
                    span.style.backgroundColor = window.posColors[pos];
                } else {
                    span.style.backgroundColor = '';
                }
            }

            origDiv.appendChild(span);
            chineseWordIndex++;
        } else if (token === '\n') {
            origDiv.appendChild(document.createElement('br'));
        } else {
            const span = document.createElement('span');
            span.textContent = token;
            span.style.display = 'inline';
            origDiv.appendChild(span);
        }
    }

    // Отрисовка русского перевода
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
                    wordSpan.style.display = 'inline-block';
                    wordSpan.style.cursor = 'pointer';
                    wordSpan.setAttribute('data-idx', russianWordIndex);
                    window.currentTransArray[russianWordIndex] = currentWord;

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
                            window.updateLinkButtonState();
                        };
                    })(russianWordIndex, wordSpan);

                    wordSpan.onmouseenter = (function(idx) {
                        return function() {
                            const linkedChineseIndices = [];
                            for (const [chIdx, ruIds] of Object.entries(window.currentMatches)) {
                                if (ruIds.includes(idx)) linkedChineseIndices.push(parseInt(chIdx));
                            }
                            if (linkedChineseIndices.length) {
                                const chineseWords = origDiv.querySelectorAll('.chinese-word');
                                chineseWords.forEach(w => {
                                    const wIdx = parseInt(w.getAttribute('data-idx'));
                                    if (linkedChineseIndices.includes(wIdx)) {
                                        w.classList.add('temp-highlight');
                                    }
                                });
                            }
                        };
                    })(russianWordIndex);
                    wordSpan.onmouseleave = function() {
                        const chineseWords = origDiv.querySelectorAll('.chinese-word');
                        chineseWords.forEach(w => w.classList.remove('temp-highlight'));
                    };

                    // Постоянная подсветка русского слова (если связано)
                    const isLinked = Object.values(window.currentMatches).some(ruList => ruList.includes(russianWordIndex));
                    wordSpan.style.backgroundColor = isLinked ? '#d1fae5' : '';

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
            // также добавить обработчики аналогично предыдущему слову, но можно копировать
        }
        if (window.isBlurred) transDiv.classList.add('blur-sm');
    } else {
        transDiv.innerHTML = '<span class="text-gray-400">Нет перевода</span>';
    }

    window.createControlPanel();
    if (window.currentEditId) await window.loadMatchesFromDB();
    window.highlightLinkedWords(); // установка постоянной подсветки (зелёный для связанных)
};

// ========== ЗАГРУЗКА СВЯЗЕЙ ИЗ БД ==========
window.loadMatchesFromDB = async function() {
    if (!window.currentEditId) return;
    try {
        const response = await fetch(`/api/library/${window.currentEditId}/matches`);
        if (response.ok) {
            const data = await response.json();
            // Строим карту: глобальный ID перевода -> его позиция
            const transIdToPos = {};
            if (data.translations) {
                data.translations.forEach(t => {
                    transIdToPos[t.id] = t.position;
                });
            }
            window.currentMatches = {};
            window.currentWordsPos = [];
            window.currentWordsIds = [];
            if (data.words) {
                data.words.forEach(word => {
                    window.currentWordsIds[word.position] = word.id;
                    window.currentWordsPos[word.position] = word.part_of_speech;
                    if (word.translation_ids && word.translation_ids.length) {
                        // Преобразуем глобальные ID в позиции
                        const positions = word.translation_ids
                            .map(id => transIdToPos[id])
                            .filter(p => p !== undefined);
                        if (positions.length) {
                            window.currentMatches[word.position] = positions;
                        }
                    }
                });
            }
            console.log("Загружены связи (позиции):", window.currentMatches);
            window.highlightLinkedWords();
        }
    } catch(e) {
        console.error("Ошибка загрузки связей:", e);
    }
};

// ========== ПОДСВЕТКА СВЯЗАННЫХ СЛОВ ==========
window.highlightLinkedWords = function() {
    if (!window.highlightEnabled) return;

    // Китайские слова
    document.querySelectorAll('.chinese-word').forEach(span => {
        const idx = parseInt(span.getAttribute('data-idx'));
        if (isNaN(idx)) return;

        const isLinked = window.currentMatches?.[idx] && window.currentMatches[idx].length > 0;

        if (isLinked) {
            span.style.backgroundColor = '#d1fae5';
        } else {
            const pos = window.currentWordsPos?.[idx];
            span.style.backgroundColor = (pos && window.posColors?.[pos]) ? window.posColors[pos] : '';
        }
    });

    // Русские слова
    document.querySelectorAll('.russian-word').forEach(span => {
        const idx = parseInt(span.getAttribute('data-idx'));
        const isLinked = Object.values(window.currentMatches || {}).some(arr => arr.includes(idx));
        span.style.backgroundColor = isLinked ? '#d1fae5' : '';
    });
};

// ========== ПАНЕЛЬ УПРАВЛЕНИЯ ==========
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
            🔗 Привязать и сохранить
        </button>

        <button onclick="window.clearSelections()" style="background:#6b7280;color:white;padding:11px 16px;border:none;border-radius:8px;cursor:pointer;">
            🗑️ Очистить
        </button>

        <button id="toggle-highlight-btn" onclick="window.toggleHighlight()"
                style="background:#8b5cf6;color:white;padding:11px 18px;border:none;border-radius:8px;cursor:pointer;">
            🎨 Выключить подсветку
        </button>

        <button onclick="window.showPosLegend()"
                title="Легенда цветов частей речи"
                style="background:#6366f1;color:white;padding:11px 14px;border:none;border-radius:8px;cursor:pointer;font-size:1.25em;">
            📖
        </button>
    `;

    document.getElementById('parallel-mode').appendChild(panel);

    // Обработчик главной кнопки
    document.getElementById('link-save-btn').onclick = async () => {
        if (window.selectedChineseWords.size === 0 || window.selectedRussianWords.size === 0) {
            alert("Выберите слова с обеих сторон!");
            return;
        }
        window.linkSelectedWords();
        await window.saveAllLinksToDB();
    };
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

    const selectedChinese = Array.from(window.selectedChineseWords);
    const selectedRussian = Array.from(window.selectedRussianWords);

    // Добавляем связи
    for (const chIdx of selectedChinese) {
        if (!window.currentMatches[chIdx]) window.currentMatches[chIdx] = [];
        for (const ruIdx of selectedRussian) {
            if (!window.currentMatches[chIdx].includes(ruIdx)) {
                window.currentMatches[chIdx].push(ruIdx);
            }
        }
    }

    // Обновляем цвета (связанные слова станут зелёными)
    window.highlightLinkedWords();
    window.clearSelections();

    // Снимаем выделение только с привязанных слов
    for (const idx of selectedChinese) {
        const el = document.querySelector(`.chinese-word[data-idx='${idx}']`);
        if (el) el.classList.remove('selected-for-link');
        window.selectedChineseWords.delete(idx);
    }
    for (const idx of selectedRussian) {
        const el = document.querySelector(`.russian-word[data-idx='${idx}']`);
        if (el) el.classList.remove('selected-for-link');
        window.selectedRussianWords.delete(idx);
    }
    window.updateLinkButtonState();

    // Сохраняем в БД
    if (window.currentEditId) {
        setTimeout(() => window.saveAllLinksToDB(), 100);
    }
};

window.clearSelections = function() {
    console.trace("clearSelections вызван");
    for (const idx of window.selectedChineseWords) {
        const el = document.querySelector(`.chinese-word[data-idx='${idx}']`);
        if (el) el.classList.remove('selected-for-link');
    }
    for (const idx of window.selectedRussianWords) {
        const el = document.querySelector(`.russian-word[data-idx='${idx}']`);
        if (el) el.classList.remove('selected-for-link');
    }
    window.selectedChineseWords.clear();
    window.selectedRussianWords.clear();
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
        console.warn("Нет ID текста");
        return;
    }

    // Собираем слова из массивов, а не из DOM
    const allWords = (window.currentWordsArray || []).map((word, idx) => ({
        word: word,
        position: idx,
        part_of_speech: window.currentWordsPos?.[idx] || null   // добавить
    })).filter(w => w.word && /[\u4e00-\u9fff]/.test(w.word));

    const allTranslations = (window.currentTransArray || []).map((phrase, idx) => ({
        phrase: phrase,
        position: idx
    })).filter(t => t.phrase && /[а-яА-Я]/.test(t.phrase));

    const associations = Object.entries(window.currentMatches || {})
        .filter(([_, ids]) => ids && ids.length)
        .map(([wordIdx, transIds]) => ({
            word_id: parseInt(wordIdx),
            translation_ids: transIds
        }));

    const matchData = { words: allWords, translations: allTranslations, associations };
    console.log("Отправляем сохранение:", matchData);

    try {
        const response = await fetch(`/api/library/${window.currentEditId}/matches`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(matchData)
        });
        if (response.ok) {
            console.log("✅ Сохранено в БД");
            await window.loadMatchesFromDB();   // ← важно
            window.highlightLinkedWords();      // ← сразу обновляем UI
        }
        else console.error("Ошибка сохранения:", response.status);
    } catch(e) { console.error(e); }
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

function getColorForRussianWord(russianIdx) {
    // Найти все китайские индексы, связанные с этим русским словом
    const linkedChineseIndices = [];
    for (const [chIdx, ruIds] of Object.entries(window.currentMatches)) {
        if (ruIds.includes(russianIdx)) linkedChineseIndices.push(parseInt(chIdx));
    }
    if (linkedChineseIndices.length === 0) return ''; // нет связи – прозрачный
    // Ищем первый связанный китайский индекс, у которого есть part_of_speech
    for (const chIdx of linkedChineseIndices) {
        const pos = window.currentWordsPos ? window.currentWordsPos[chIdx] : null;
        if (pos && pos !== 'unknown' && window.posColors && window.posColors[pos]) {
            return window.posColors[pos]; // цвет части речи
        }
    }
    // Если ни у одного китайского слова нет части речи – зелёный
    return '#d1fae5';
};

// ==================== ПЕРЕКЛЮЧЕНИЕ ПОДСВЕТКИ ====================
window.toggleHighlight = function() {
    window.highlightEnabled = !window.highlightEnabled;

    const btn = document.getElementById('toggle-highlight-btn');
    if (btn) {
        if (window.highlightEnabled) {
            btn.innerHTML = '🎨 Выключить подсветку';
            btn.style.backgroundColor = '#8b5cf6';
        } else {
            btn.innerHTML = '🎨 Включить подсветку';
            btn.style.backgroundColor = '#64748b';
        }
    }

    const allWords = document.querySelectorAll('.chinese-word, .russian-word');

    if (window.highlightEnabled) {
        // === ВКЛЮЧАЕМ ПОДСВЕТКУ ===
        allWords.forEach(el => {
            const savedBg = el.getAttribute('data-original-bg');
            if (savedBg) {
                el.style.backgroundColor = savedBg;
            }
        });
        window.highlightLinkedWords();   // обновляем зелёные связи
    } else {
        // === ВЫКЛЮЧАЕМ ПОДСВЕТКУ ===
        allWords.forEach(el => {
            // Сохраняем текущий цвет перед отключением
            if (!el.hasAttribute('data-original-bg')) {
                el.setAttribute('data-original-bg', el.style.backgroundColor || '');
            }
            // Полностью убираем цвет
            el.style.backgroundColor = '';
        });
    }
};

// Делаем функции глобальными
window.showPartMenu = showPartMenu;
window.updatePartOfSpeech = updatePartOfSpeech;
window.applyPosHighlight = applyPosHighlight;
console.log("✅ modes.js загружен");

// ====================== ЦВЕТОВОЙ КОНФИГ ======================
window.colorConfig = {
    // Основные цвета
    linked: '#a7f3d0',           // цвет связанных слов (зелёный)
    linkedBorder: '#10b981',     // бордер у связанных слов
    selected: '#fef08a',         // цвет при выборе (жёлтый)
    selectedBorder: '#eab308',
    hover: '#fef9c3',            // цвет при наведении
    tempHighlight: '#fef9c3',

    // Цвета частей речи
    posColors: {
        'noun': '#c5e0b4',      // существительное
        'verb': '#bdd7ee',      // глагол
        'adj':  '#f7c6c6',      // прилагательное
        'adv':  '#ffd966',      // наречие
        'pron': '#d5a6bd',      // местоимение
        'num':  '#c5d9f1',      // числительное
        'conj': '#e2efda',      // союз
        'prep': '#fde9a0',      // предлог
        'intj': '#f9cb9c',      // междометие
        'part': '#e6c3c3',      // частица
        'unknown': 'transparent'
    }
};

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
    } catch (err) {
        console.error(err);
        segmentedWords = window.currentOriginalText.split('');
    }

    // ==================== ОТРИСОВКА КИТАЙСКОГО ====================
    origDiv.innerHTML = '';
    origDiv.style.whiteSpace = 'pre-wrap';
    origDiv.style.lineHeight = '1.8';
    origDiv.style.fontSize = '1.25rem';
    origDiv.style.wordSpacing = '0';
    origDiv.style.letterSpacing = '0';

    let chineseWordIndex = 0;
    window.currentWordsArray = [];
    const wordsToShow = segmentedWords.length ? segmentedWords : [window.currentOriginalText];

    for (let i = 0; i < wordsToShow.length; i++) {
        const token = wordsToShow[i];

        if (/[\u4e00-\u9fff]/.test(token)) {
            const span = document.createElement('span');
            span.textContent = token;
            span.className = 'chinese-word';
            span.style.display = 'inline';
            span.style.margin = '0';
            span.style.cursor = 'pointer';
            span.style.padding = '2px 1px';
            const idx = chineseWordIndex;
            span.setAttribute('data-idx', idx);
            window.currentWordsArray[idx] = token;

            // Клик для выделения
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
                    window.updateLinkButtonState();
                };
            })(idx, span);

            // Правый клик — меню части речи
            span.oncontextmenu = (function(i, w) {
                return function(e) {
                    e.preventDefault();
                    if (typeof window.showPartMenu === 'function') {
                        window.showPartMenu(e.clientX, e.clientY, i, w);
                    }
                    return false;
                };
            })(idx, token);

            // Наведение
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
                    wordSpan.style.display = 'inline';
                    wordSpan.style.cursor = 'pointer';
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
                            window.updateLinkButtonState();
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
                    punct.style.display = 'inline';
                    punct.style.color = '#666';
                    transDiv.appendChild(punct);
                }
            }
        }

        // Последнее слово
        if (currentWord) {
            const wordSpan = document.createElement('span');
            wordSpan.textContent = currentWord;
            wordSpan.className = 'russian-word';
            wordSpan.style.display = 'inline';
            wordSpan.style.cursor = 'pointer';
            wordSpan.setAttribute('data-idx', russianWordIndex);
            window.currentTransArray[russianWordIndex] = currentWord;
            transDiv.appendChild(wordSpan);
        }
    }

    window.createControlPanel();

    // Загружаем связи и применяем подсветку
    if (window.currentEditId) {
        await window.loadMatchesFromDB();
    }

    // Важно: небольшая задержка, чтобы DOM полностью построился
    setTimeout(() => {
        window.highlightLinkedWords();
    }, 100);
};

// ========== ЗАГРУЗКА СВЯЗЕЙ ИЗ БД ==========
window.loadMatchesFromDB = async function() {
    if (!window.currentEditId) return;

    try {
        console.log(`📡 Загружаем связи для текста ID=${window.currentEditId}`);

        const response = await fetch(`/api/library/${window.currentEditId}/matches`);

        if (!response.ok) {
            console.warn(`Статус ответа: ${response.status}`);
            window.currentMatches = {};
            window.highlightLinkedWords();
            return;
        }

        const data = await response.json();
        console.log("Получены данные matches:", data);

        // Защита от null/undefined
        if (!data || !data.words) {
            console.warn("Данные matches пустые или null");
            window.currentMatches = {};
            window.currentWordsPos = [];
            window.currentWordsIds = [];
            window.highlightLinkedWords();
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
        window.highlightLinkedWords();

    } catch (e) {
        console.error("Ошибка загрузки связей:", e);
        window.currentMatches = {};
        window.highlightLinkedWords();
    }
};

// ========== ПОДСВЕТКА С УЧЁТОМ ЧАСТИ РЕЧИ ==========
window.highlightLinkedWords = function() {
    console.log("🔄 highlightLinkedWords с цветами POS");

    const cfg = window.colorConfig;

    // 1. Китайские слова
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

    // 2. Русские слова
    document.querySelectorAll('#translation-text .russian-word').forEach(span => {
        const idx = parseInt(span.getAttribute('data-idx'));
        if (isNaN(idx)) return;

        const isLinked = Object.values(window.currentMatches || {})
                           .some(arr => arr && arr.includes(idx));

        if (isLinked) {
            const color = getColorForRussianWord(idx);
            span.style.backgroundColor = color || cfg.linked;
            span.style.borderBottom = `2px solid ${cfg.linkedBorder}`;
        } else {
            span.style.backgroundColor = '';
            span.style.borderBottom = '';
        }
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

    document.getElementById('parallel-mode').appendChild(panel);

    // Привязать
    document.getElementById('link-save-btn').onclick = async () => {
        if (window.selectedChineseWords.size === 0 || window.selectedRussianWords.size === 0) {
            alert("Выберите слова с обеих сторон!");
            return;
        }
        window.linkSelectedWords();
        await window.saveAllLinksToDB();
    };

    // Разорвать связь
    document.getElementById('break-link-btn').onclick = () => {
        window.breakSelectedLinks();
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
    const selectedCh = Array.from(window.selectedChineseWords);
    const selectedRu = Array.from(window.selectedRussianWords);

    console.log("🔗 linkSelectedWords вызван");
    console.log("   Китайские индексы:", selectedCh);
    console.log("   Русские индексы:", selectedRu);
    console.log("   Текущие matches перед изменением:", JSON.parse(JSON.stringify(window.currentMatches)));

    // Очищаем старые связи только для выбранных китайских слов
    selectedCh.forEach(chIdx => {
        window.currentMatches[chIdx] = [];
    });

    selectedCh.forEach(chIdx => {
        selectedRu.forEach(ruIdx => {
            if (!window.currentMatches[chIdx].includes(ruIdx)) {
                window.currentMatches[chIdx].push(ruIdx);
                console.log(`   ✅ Добавлена связь: ${chIdx} → ${ruIdx}`);
            }
        });
    });

    console.log("   currentMatches ПОСЛЕ:", JSON.parse(JSON.stringify(window.currentMatches)));

    window.highlightLinkedWords();
    window.clearSelections();

    if (window.currentEditId) {
        setTimeout(() => window.saveAllLinksToDB(), 50);
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
    if (!window.currentEditId) return;

    console.log("💾 saveAllLinksToDB — отправка на сервер");
    console.log("   currentMatches перед отправкой:", JSON.parse(JSON.stringify(window.currentMatches)));

    const associations = Object.entries(window.currentMatches || {})
        .filter(([_, arr]) => arr && arr.length > 0)
        .map(([wordPos, transArr]) => ({
            word_id: parseInt(wordPos),
            translation_ids: [...new Set(transArr)]   // убираем дубли
        }));

    console.log("   Отправляемые associations:", associations);

    const payload = {
        words: (window.currentWordsArray || []).map((w, i) => ({
            word: w,
            position: i,
            part_of_speech: window.currentWordsPos?.[i] || null
        })).filter(w => w.word),

        translations: (window.currentTransArray || []).map((t, i) => ({
            phrase: t,
            position: i
        })).filter(t => t.phrase),

        associations: associations
    };

    try {
        const res = await fetch(`/api/library/${window.currentEditId}/matches`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            console.log("✅ Связи успешно сохранены");
            await window.loadMatchesFromDB();
        } else {
            console.error("Ошибка сохранения:", await res.text());
        }
    } catch (e) {
        console.error("Ошибка сети:", e);
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

function getColorForRussianWord(russianIdx) {
    const linkedChineseIndices = [];
    for (const [chIdx, ruIds] of Object.entries(window.currentMatches)) {
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
}

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

// ========== РАЗОРВАТЬ ВЫБРАННЫЕ СВЯЗИ ==========
window.breakSelectedLinks = function() {
    if (window.selectedChineseWords.size === 0 && window.selectedRussianWords.size === 0) {
        alert("Выберите слова, связи которых хотите разорвать");
        return;
    }

    let removedCount = 0;

    // Случай 1: Выделены китайские слова → удаляем у них все связи с выбранными русскими (или все, если русские не выбраны)
    for (const chIdx of window.selectedChineseWords) {
        if (window.currentMatches[chIdx]) {
            const before = window.currentMatches[chIdx].length;

            if (window.selectedRussianWords.size > 0) {
                // Удаляем только выбранные русские слова
                window.currentMatches[chIdx] = window.currentMatches[chIdx].filter(ruIdx =>
                    !window.selectedRussianWords.has(ruIdx)
                );
            } else {
                // Если русские не выбраны — удаляем все связи у этого китайского слова
                delete window.currentMatches[chIdx];
            }

            if (window.currentMatches[chIdx] && window.currentMatches[chIdx].length === 0) {
                delete window.currentMatches[chIdx];
            }

            removedCount += before - (window.currentMatches[chIdx] ? window.currentMatches[chIdx].length : 0);
        }
    }

    // Случай 2: Выделены только русские слова → удаляем их из всех китайских связей
    if (window.selectedChineseWords.size === 0 && window.selectedRussianWords.size > 0) {
        for (const [chIdx, ruList] of Object.entries(window.currentMatches)) {
            const before = ruList.length;
            window.currentMatches[chIdx] = ruList.filter(ruIdx =>
                !window.selectedRussianWords.has(ruIdx)
            );
            if (window.currentMatches[chIdx].length === 0) {
                delete window.currentMatches[chIdx];
            }
            removedCount += before - window.currentMatches[chIdx].length;
        }
    }

    if (removedCount > 0) {
        console.log(`✂️ Успешно разорвано ${removedCount} связей`);
        window.highlightLinkedWords();
        window.clearSelections();

        if (window.currentEditId) {
            setTimeout(() => window.saveAllLinksToDB(), 100);
        }
    } else {
        alert("Не найдено связей для выбранных слов");
    }
};

// Делаем функции глобальными
window.showPartMenu = showPartMenu;
window.updatePartOfSpeech = updatePartOfSpeech;
window.applyPosHighlight = applyPosHighlight;
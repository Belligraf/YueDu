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

// ========== ПРОСТОЙ РЕЖИМ — РИДЕР ==========
window.processText = async function() {
    const input = document.getElementById('inputText');
    const resultDiv = document.getElementById('result');

    if (!input || !resultDiv) return;

    const text = input.value.trim();
    if (!text) {
        alert('Введите китайский текст');
        return;
    }

    window.currentOriginalText = text;
    window.currentTranslationText = document.getElementById('inputTranslation')?.value.trim() || '';

    try {
        const response = await fetch('/api/segment/segment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text })
        });

        const data = await response.json();
        window.currentSegmentedWords = data.words || [];
    } catch (err) {
        console.error("Ошибка сегментации:", err);
        window.currentSegmentedWords = text.split('');
    }

    // === КРАСИВАЯ ОТРИСОВКА С КЛИКАМИ ===
    resultDiv.innerHTML = window.currentSegmentedWords
        .map(token => {
            if (/[\u4e00-\u9fff]/.test(token)) {
                return `<span class="chinese-word inline-block px-2 py-1 mx-0.5 my-1 rounded-lg bg-white border border-gray-200 hover:bg-blue-50 cursor-pointer transition-all"
                            onclick="window.showTranslationFromDictionary('${token}')">
                            ${token}
                        </span>`;
            }
            else if (token === '\n') {
                return '<br><br>';
            }
            else {
                return token;
            }
        })
        .join('');

    console.log("✅ Ридер: текст разбит и готов к чтению");
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

            span.onclick = function(e) {
                e.stopPropagation();
                window.showWordTranslations(token, chineseWordIndex);
            };

            span.oncontextmenu = function(e) {
                e.preventDefault();
                if (typeof window.showPartMenu === 'function') {
                    window.showPartMenu(e.clientX, e.clientY, chineseWordIndex, token);
                }
            };

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
    if (transDiv) {
        // Восстанавливаем состояние блюра после перерисовки
        applyCurrentBlurState(transDiv);
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

// ========== НОВЫЕ ФУНКЦИИ ДЛЯ ПОПАПА ==========
window.showTranslationFromDictionary = async function(word, element = null, event = null) {
    try {
        const res = await fetch(`/api/dictionary/translate/${encodeURIComponent(word)}`);
        const data = await res.json();

        let translationText = "Перевод не найден";
        if (data.translation) {
            translationText = data.translation;
        }

        const pinyin = data.pinyin || '';

        showPositionedPopup(word, translationText, pinyin, element, event);

    } catch (e) {
        console.error(e);
        showPositionedPopup(word, "Ошибка при получении перевода", '', element, event);
    }
};

// Старый попап теперь перенаправляет на новый (защита)
function showSimpleTranslationPopup(word, translation, element = null, event = null) {
    showPositionedPopup(word, translation, '', element, event);
}

// === ГЛАВНАЯ ФУНКЦИЯ — маленький попап рядом со словом ===
function showPositionedPopup(word, translation, pinyin = '', element = null, event = null) {
    // Удаляем старый попап
    const old = document.getElementById('simple-popup');
    if (old) old.remove();

    const popup = document.createElement('div');
    popup.id = 'simple-popup';
    popup.style.cssText = `
        position: fixed;
        background: white;
        border-radius: 16px;
        box-shadow: 0 20px 50px -12px rgba(0,0,0,0.55);
        z-index: 99999;
        width: 380px;
        max-height: 520px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        border: 1px solid #e2e8f0;
        font-size: 15px;
    `;

    let formatted = translation
        .replace(/→/g, '→')
        .replace(/\d+\)/g, m => `<strong>${m}</strong>`);

    const pinyinHTML = pinyin
        ? `<div style="font-size:15px; color:#64748b; margin-bottom:10px; font-family:monospace; font-weight:600;">${pinyin}</div>`
        : '';

    popup.innerHTML = `
        <div style="padding:16px 20px; background:#f8fafc; border-bottom:1px solid #e2e8f0; font-size:22px; font-weight:700; color:#1f2937; display:flex; justify-content:space-between; align-items:center;">
            ${word}
            <span onclick="document.getElementById('simple-popup').remove()" style="cursor:pointer; font-size:28px; color:#64748b; line-height:1;">×</span>
        </div>
        <div style="flex:1; padding:20px; overflow-y:auto; line-height:1.65; color:#374151; max-height:420px;">
            ${pinyinHTML}
            ${formatted}
        </div>
        <div style="padding:12px 20px; border-top:1px solid #e2e8f0; text-align:right; background:#f8fafc;">
            <button onclick="document.getElementById('simple-popup').remove()"
                    style="background:#3b82f6; color:white; border:none; padding:8px 18px; border-radius:8px; cursor:pointer; font-weight:500;">
                Закрыть
            </button>
        </div>
    `;

    document.body.appendChild(popup);

    // === УМНОЕ ПОЗИЦИОНИРОВАНИЕ ===
    let x = window.innerWidth / 2 - 190;
    let y = window.innerHeight / 2 - 200;

    // Приоритет: элемент → event → центр
    if (element && element.getBoundingClientRect) {
        const rect = element.getBoundingClientRect();
        x = rect.right + 15;
        y = rect.top - 10;
    } else if (event && event.clientX) {
        x = event.clientX + 20;
        y = event.clientY - 30;
    }

    // Не вылезать за экран
    const w = 380, h = 520;
    if (x + w > window.innerWidth - 10) x = window.innerWidth - w - 15;
    if (x < 10) x = 10;
    if (y + h > window.innerHeight - 10) y = window.innerHeight - h - 15;
    if (y < 10) y = 10;

    popup.style.left = `${x}px`;
    popup.style.top = `${y}px`;

    // Закрытие по клику вне
    setTimeout(() => {
        document.addEventListener('click', function handler(ev) {
            if (!popup.contains(ev.target)) {
                popup.remove();
                document.removeEventListener('click', handler);
            }
        }, { once: true });
    }, 80);
}

// Простой и надёжный попап (создаёт содержимое сам)
function showSimpleTranslationPopup(word, translation) {
    // Удаляем старый попап, если есть
    const oldPopup = document.getElementById('simple-popup');
    if (oldPopup) oldPopup.remove();

    const popup = document.createElement('div');
    popup.id = 'simple-popup';
    popup.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    `;

    popup.innerHTML = `
        <div style="background: white; border-radius: 16px; padding: 24px; max-width: 420px; width: 90%; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
            <div style="font-size: 22px; font-weight: 700; margin-bottom: 12px; color: #1f2937;">
                ${word}
            </div>
            <div style="font-size: 16px; color: #374151; line-height: 1.6; white-space: pre-wrap;">
                ${translation}
            </div>
            <div style="margin-top: 20px; text-align: right;">
                <button onclick="document.getElementById('simple-popup').remove()"
                        style="background: #3b82f6; color: white; border: none; padding: 8px 20px; border-radius: 8px; cursor: pointer;">
                    Закрыть
                </button>
            </div>
        </div>
    `;

    // Закрытие по клику на фон
    popup.onclick = function(e) {
        if (e.target === popup) popup.remove();
    };
    document.body.appendChild(popup);
}

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

// ========== ТОГГЛ БЛЮРА (исправленная версия) ==========
window.toggleBlur = function() {
    const transDiv = document.getElementById('translation-text');
    if (!transDiv) return;

    window.isBlurred = !window.isBlurred;

    const btn = document.getElementById('blurBtn');
    if (btn) {
        if (window.isBlurred) {
            btn.textContent = '👁️ Показать перевод';
        } else {
            btn.textContent = '🙈 Скрыть перевод';
        }
    }

    applyCurrentBlurState(transDiv);
};

// Применяем текущее состояние блюра
function applyCurrentBlurState(container) {
    if (!container) return;

    if (window.isBlurred) {
        container.classList.add('blur-sm');
    } else {
        container.classList.remove('blur-sm');
    }
}

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

window.processTextForReader = function() {
    const contentDiv = document.getElementById('reader-content');
    if (!contentDiv) return;

    const text = window.currentOriginalText || '';
    if (!text) return;

    fetch('/api/segment/segment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text })
    })
    .then(r => r.json())
    .then(data => {
        let html = '';
        (data.words || []).forEach(token => {
            if (/[\u4e00-\u9fff]/.test(token)) {
                html += `<span class="reader-word"
                            style="display:inline; margin:0; padding:2px 1px; cursor:pointer;"
                            onclick="window.showTranslationFromDictionary('${token.replace(/'/g, "\\'")}')">
                            ${token}
                        </span>`;
            } else if (token === '\n') {
                html += '<br><br>';
            } else {
                html += token;
            }
        });
        contentDiv.innerHTML = html;
    })
    .catch(err => {
        console.error(err);
        contentDiv.innerHTML = '<p class="text-red-500">Ошибка обработки текста</p>';
    });
};

// ========== ГЛОБАЛЬНЫЕ ФУНКЦИИ ==========
window.showPartMenu = showPartMenu;
window.updatePartOfSpeech = updatePartOfSpeech;
window.applyPosHighlight = applyPosHighlight;

// Инициализация
console.log("✅ modes.js полностью загружен");
console.log("✅ modes.js загружен");

// Глобальные переменные для выделения
window.selectedChineseWords = new Set(); // Храним выбранные китайские слова
window.selectedRussianWords = new Set(); // Храним выбранные русские слова
window.isSelectingMode = false;

// ========== ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК ==========
window.showTab = async function(tabName) {
    console.log(`🟡 Переключение на вкладку: ${tabName}`);

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
            if (window.currentOriginalText) {
                window.loadParallelView();
            }
        } else if (tabName === 'match') {
            if (matchMode) matchMode.classList.remove('hidden');
            if (matchBtn) matchBtn.classList.add('tab-active');
            if (window.currentOriginalText) {
                window.loadMatchView();
            }
        }
    }, 100);
};

// ========== ПРОСТОЙ РЕЖИМ ==========
window.processText = async function() {
    console.log("🟡 processText вызван");

    const input = document.getElementById('inputText');
    const translationInput = document.getElementById('inputTranslation');

    if (!input) {
        console.error("inputText не найден");
        return;
    }

    const text = input.value;
    if (!text.trim()) {
        alert('Пожалуйста, введите текст');
        return;
    }

    window.currentOriginalText = text;
    window.currentTranslationText = translationInput?.value || '';

    // Отправляем на сервер для сегментации
    try {
        const response = await fetch('/api/segment/segment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text })
        });

        if (response.ok) {
            const data = await response.json();
            window.currentSegmentedWords = data.words;
            console.log("✅ Сегментация:", window.currentSegmentedWords);
        }
    } catch (err) {
        console.error("Ошибка сегментации:", err);
    }

    // Обновляем отображение в параллельном режиме если он активен
    const parallelMode = document.getElementById('parallel-mode');
    if (parallelMode && !parallelMode.classList.contains('hidden')) {
        window.loadParallelView();
    }

    console.log("✅ Текст сохранен");
};

// ========== ПАРАЛЛЕЛЬНЫЙ РЕЖИМ ==========
window.loadParallelView = async function() {
    console.log("🟡 loadParallelView вызван");

    const origDiv = document.getElementById('original-text');
    const transDiv = document.getElementById('translation-text');

    if (!origDiv || !transDiv) {
        console.error("Контейнеры не найдены");
        return;
    }

    if (!window.currentOriginalText) {
        origDiv.innerHTML = '<div class="text-gray-400">Нет текста. Сначала введите текст в простом режиме.</div>';
        transDiv.innerHTML = '<div class="text-gray-400">Нет перевода</div>';
        return;
    }

    // Очищаем выделения
    window.selectedChineseWords.clear();
    window.selectedRussianWords.clear();

    // Получаем сегментацию для китайского текста
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
        console.error("Ошибка сегментации:", err);
    }

    // ========== ОТОБРАЖАЕМ КИТАЙСКИЙ ТЕКСТ ==========
    origDiv.innerHTML = '';
    origDiv.style.whiteSpace = 'pre-wrap';
    origDiv.style.wordBreak = 'break-word';
    origDiv.style.lineHeight = '1.8';
    origDiv.style.fontSize = '1.2rem';

    let chineseWordIndex = 0;
    const wordsToShow = segmentedWords.length ? segmentedWords : window.currentOriginalText.split('');

    for (let i = 0; i < wordsToShow.length; i++) {
        const token = wordsToShow[i];
        const span = document.createElement('span');
        span.textContent = token;

        if (/[\u4e00-\u9fff]/.test(token)) {
            // Китайское слово
            span.className = 'chinese-word';
            span.style.display = 'inline-block';
            span.style.padding = '2px 4px';
            span.style.margin = '0 2px';
            span.style.borderRadius = '4px';
            span.style.cursor = 'pointer';
            span.style.transition = 'all 0.2s ease';
            span.setAttribute('data-chinese-idx', chineseWordIndex);
            span.setAttribute('data-chinese-word', token);

            // Левый клик - выделение для связывания
            span.onclick = (function(idx, word, element) {
                return function(e) {
                    e.stopPropagation();
                    if (window.selectedChineseWords.has(idx)) {
                        window.selectedChineseWords.delete(idx);
                        element.classList.remove('selected-for-link');
                    } else {
                        window.selectedChineseWords.add(idx);
                        element.classList.add('selected-for-link');
                    }
                    window.updateLinkButtonState();
                    console.log(`Выбрано китайское слово: "${word}"`, Array.from(window.selectedChineseWords));
                };
            })(chineseWordIndex, token, span);

            // Правый клик - перевод из словаря
            span.oncontextmenu = (function(word, idx) {
                return function(e) {
                    e.preventDefault();
                    window.showTranslationFromDictionary(word);
                    return false;
                };
            })(token, chineseWordIndex);

            chineseWordIndex++;
        } else if (token === '\n') {
            span.innerHTML = '<br>';
            span.style.display = 'block';
        } else if (token === ' ') {
            span.innerHTML = '&nbsp;';
            span.style.width = '8px';
            span.style.display = 'inline';
        } else {
            span.style.display = 'inline';
            span.style.color = '#666';
        }

        origDiv.appendChild(span);
    }

    console.log(`✅ Китайский текст отображен, слов: ${chineseWordIndex}`);

    // ========== ОТОБРАЖАЕМ РУССКИЙ ПЕРЕВОД ==========
    transDiv.innerHTML = '';
    transDiv.style.whiteSpace = 'pre-wrap';
    transDiv.style.lineHeight = '1.8';
    transDiv.style.fontSize = '1.1rem';

    if (window.currentTranslationText) {
        // Разбиваем русский текст на слова
        const russianTokens = [];
        let currentWord = '';

        for (let i = 0; i < window.currentTranslationText.length; i++) {
            const char = window.currentTranslationText[i];

            if (/[а-яА-Яa-zA-Z0-9]/.test(char)) {
                currentWord += char;
            } else {
                if (currentWord) {
                    russianTokens.push({ type: 'word', text: currentWord });
                    currentWord = '';
                }
                if (char === ' ') {
                    russianTokens.push({ type: 'space', text: ' ' });
                } else if (char === '\n') {
                    russianTokens.push({ type: 'newline', text: '\n' });
                } else if (/[,.!?;:]/.test(char)) {
                    russianTokens.push({ type: 'punct', text: char });
                }
            }
        }
        if (currentWord) {
            russianTokens.push({ type: 'word', text: currentWord });
        }

        console.log("Разбивка русского текста:", russianTokens);

        let russianWordIndex = 0;
        window.currentTransArray = [];

        for (const token of russianTokens) {
            if (token.type === 'newline') {
                const br = document.createElement('br');
                transDiv.appendChild(br);
            }
            else if (token.type === 'space') {
                const space = document.createElement('span');
                space.innerHTML = '&nbsp;';
                space.style.width = '8px';
                space.style.display = 'inline';
                transDiv.appendChild(space);
            }
            else if (token.type === 'punct') {
                const punct = document.createElement('span');
                punct.textContent = token.text;
                punct.style.display = 'inline';
                punct.style.color = '#666';
                punct.style.margin = '0 2px';
                transDiv.appendChild(punct);
            }
            else if (token.type === 'word') {
                const wordSpan = document.createElement('span');
                wordSpan.textContent = token.text;
                wordSpan.className = 'russian-word';
                wordSpan.style.display = 'inline-block';
                wordSpan.style.padding = '4px 8px';
                wordSpan.style.margin = '2px';
                wordSpan.style.borderRadius = '8px';
                wordSpan.style.backgroundColor = '#f0fdf4';
                wordSpan.style.border = '1px solid #bbf7d0';
                wordSpan.style.cursor = 'pointer';
                wordSpan.style.transition = 'all 0.2s ease';
                wordSpan.setAttribute('data-russian-idx', russianWordIndex);
                wordSpan.setAttribute('data-russian-word', token.text);

                // Левый клик - выделение для связывания
                wordSpan.onclick = (function(idx, word, element) {
                    return function(e) {
                        e.stopPropagation();
                        if (window.selectedRussianWords.has(idx)) {
                            window.selectedRussianWords.delete(idx);
                            element.classList.remove('selected-for-link');
                        } else {
                            window.selectedRussianWords.add(idx);
                            element.classList.add('selected-for-link');
                        }
                        window.updateLinkButtonState();
                        console.log(`Выбрано русское слово: "${word}"`, Array.from(window.selectedRussianWords));
                    };
                })(russianWordIndex, token.text, wordSpan);

                // Правый клик - ничего не делаем для русских слов
                wordSpan.oncontextmenu = function(e) {
                    e.preventDefault();
                    return false;
                };

                window.currentTransArray.push(token.text);
                transDiv.appendChild(wordSpan);
                transDiv.appendChild(document.createTextNode(' '));
                russianWordIndex++;
            }
        }

        console.log(`✅ Русский текст отображен, слов: ${russianWordIndex}`);

        // Применяем размытие
        if (window.isBlurred) {
            transDiv.classList.add('blur-sm', 'select-none');
        }
    } else {
        transDiv.innerHTML = '<span class="text-gray-400">Нет перевода</span>';
    }

    // Создаем панель управления
    window.createControlPanel();

    // Загружаем существующие связи
    if (window.currentEditId) {
        await window.loadMatches();
    }

    console.log("✅ loadParallelView завершен");
};

// ========== СОЗДАНИЕ ПАНЕЛИ УПРАВЛЕНИЯ ==========
window.createControlPanel = function() {
    // Удаляем существующую панель
    const existingPanel = document.getElementById('link-control-panel');
    if (existingPanel) existingPanel.remove();

    const parallelContainer = document.getElementById('parallel-mode');
    if (!parallelContainer) return;

    const panel = document.createElement('div');
    panel.id = 'link-control-panel';
    panel.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-xl p-4 z-50 flex gap-3 border border-gray-200';
    panel.innerHTML = `
        <button id="link-button" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
            🔗 Привязать выделенные слова
        </button>
        <button onclick="window.clearSelections()" class="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600">
            🗑️ Очистить выделение
        </button>
        <button onclick="window.saveAllLinks()" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
            💾 Сохранить все связи
        </button>
    `;
    parallelContainer.appendChild(panel);

    window.linkButton = document.getElementById('link-button');
};

// ========== ОБНОВЛЕНИЕ СОСТОЯНИЯ КНОПКИ ==========
window.updateLinkButtonState = function() {
    if (window.linkButton) {
        const hasChinese = window.selectedChineseWords.size > 0;
        const hasRussian = window.selectedRussianWords.size > 0;
        window.linkButton.disabled = !(hasChinese && hasRussian);

        if (hasChinese && hasRussian) {
            window.linkButton.classList.add('bg-green-600', 'hover:bg-green-700');
            window.linkButton.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        } else {
            window.linkButton.classList.remove('bg-green-600', 'hover:bg-green-700');
            window.linkButton.classList.add('bg-blue-600', 'hover:bg-blue-700');
        }
    }
};

// ========== ПРИВЯЗКА ВЫДЕЛЕННЫХ СЛОВ ==========
window.linkSelectedWords = function() {
    const chineseIndices = Array.from(window.selectedChineseWords);
    const russianIndices = Array.from(window.selectedRussianWords);

    if (chineseIndices.length === 0 || russianIndices.length === 0) {
        alert("Выберите китайские и русские слова для связывания");
        return;
    }

    console.log(`Связываем китайские индексы: ${chineseIndices}, русские индексы: ${russianIndices}`);

    // Для каждого китайского слова добавляем связи со всеми русскими
    for (const chIdx of chineseIndices) {
        if (!window.currentMatches[chIdx]) {
            window.currentMatches[chIdx] = [];
        }
        for (const ruIdx of russianIndices) {
            if (!window.currentMatches[chIdx].includes(ruIdx)) {
                window.currentMatches[chIdx].push(ruIdx);
            }
        }
    }

    // Визуально подсвечиваем связанные слова
    window.highlightLinkedWords();

    // Очищаем выделения
    window.clearSelections();

    console.log("✅ Связи добавлены");
};

// ========== ПОДСВЕТКА СВЯЗАННЫХ СЛОВ ==========
window.highlightLinkedWords = function() {
    const origDiv = document.getElementById('original-text');
    const transDiv = document.getElementById('translation-text');

    if (origDiv) {
        const chineseWords = origDiv.querySelectorAll('.chinese-word');
        chineseWords.forEach((word, idx) => {
            if (window.currentMatches[idx] && window.currentMatches[idx].length > 0) {
                word.classList.add('has-link');
                word.style.backgroundColor = '#d1fae5';
                word.style.borderBottom = '2px solid #10b981';
            } else {
                word.classList.remove('has-link');
                word.style.backgroundColor = '';
                word.style.borderBottom = '';
            }
        });
    }

    if (transDiv) {
        const russianWords = transDiv.querySelectorAll('.russian-word');
        // Проверяем, какие русские слова связаны
        const linkedRussian = new Set();
        for (const [chIdx, ruIndices] of Object.entries(window.currentMatches)) {
            for (const ruIdx of ruIndices) {
                linkedRussian.add(ruIdx);
            }
        }

        russianWords.forEach((word, idx) => {
            if (linkedRussian.has(idx)) {
                word.style.backgroundColor = '#d1fae5';
                word.style.border = '1px solid #10b981';
            } else {
                word.style.backgroundColor = '#f0fdf4';
                word.style.border = '1px solid #bbf7d0';
            }
        });
    }
};

// ========== ОЧИСТКА ВЫДЕЛЕНИЙ ==========
window.clearSelections = function() {
    window.selectedChineseWords.clear();
    window.selectedRussianWords.clear();

    const origDiv = document.getElementById('original-text');
    const transDiv = document.getElementById('translation-text');

    if (origDiv) {
        const chineseWords = origDiv.querySelectorAll('.chinese-word');
        chineseWords.forEach(word => {
            word.classList.remove('selected-for-link');
        });
    }

    if (transDiv) {
        const russianWords = transDiv.querySelectorAll('.russian-word');
        russianWords.forEach(word => {
            word.classList.remove('selected-for-link');
        });
    }

    window.updateLinkButtonState();
    console.log("Выделения очищены");
};

// ========== ПОКАЗ ПЕРЕВОДА ИЗ СЛОВАРЯ (ПРАВЫЙ КЛИК) ==========
window.showTranslationFromDictionary = async function(word) {
    console.log(`🔍 Правый клик - перевод из словаря: "${word}"`);

    try {
        const res = await fetch(`/api/dictionary/translate/${encodeURIComponent(word)}`);
        if (res.ok) {
            const data = await res.json();
            if (data.translation) {
                window.showTranslationPopup(word, [data.translation]);
                return;
            }
        }
        window.showTranslationPopup(word, [], false);
    } catch(e) {
        console.error(e);
        window.showTranslationPopup(word, [], false);
    }
};

// ========== СОХРАНЕНИЕ ВСЕХ СВЯЗЕЙ ==========
window.saveAllLinks = async function() {
    if (!window.currentEditId) {
        alert("Сначала сохраните текст в библиотеку!");
        return;
    }

    if (window.saveMatchesToServer) {
        await window.saveMatchesToServer();
        alert("✅ Все связи сохранены!");
    } else {
        console.error("saveMatchesToServer не определена");
    }
};

// ========== РАЗМЫТИЕ ==========
window.toggleBlur = function() {
    const transDiv = document.getElementById('translation-text');
    if (!transDiv) return;

    window.isBlurred = !window.isBlurred;
    const btn = document.getElementById('blurBtn');

    if (window.isBlurred) {
        transDiv.classList.add('blur-sm', 'select-none');
        if (btn) btn.textContent = '👁️ Показать перевод';
    } else {
        transDiv.classList.remove('blur-sm', 'select-none');
        if (btn) btn.textContent = '🙈 Скрыть перевод';
    }
};

// ========== ЗАГРУЗКА СУЩЕСТВУЮЩИХ СВЯЗЕЙ ==========
window.loadMatches = async function() {
    if (!window.currentEditId) return;

    try {
        const res = await fetch(`/api/library/${window.currentEditId}/matches`);
        if (!res.ok) return;

        const data = await res.json();
        window.currentMatches = {};

        if (data.words) {
            data.words.forEach(w => {
                if (w.translation_ids && w.translation_ids.length) {
                    window.currentMatches[w.position] = w.translation_ids;
                }
            });
        }

        window.highlightLinkedWords();
        console.log("✅ Существующие связи загружены");
    } catch(e) {
        console.error(e);
    }
};
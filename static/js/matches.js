console.log("✅ matches.js загружен");

// ========== РЕЖИМ СОПОСТАВЛЕНИЯ ==========
window.loadMatchView = async function() {
    console.log("🟡 loadMatchView вызван");

    const matchOrig = document.getElementById('match-original');
    const matchTrans = document.getElementById('match-translation');

    if (!matchOrig || !matchTrans) {
        console.warn("Элементы режима сопоставления не найдены");
        return;
    }

    if (!window.currentOriginalText) {
        matchOrig.innerHTML = '<div class="text-gray-400 p-4">Нет текста. Сначала введите текст в простом режиме.</div>';
        matchTrans.innerHTML = '<div class="text-gray-400 p-4">Нет перевода</div>';
        return;
    }

    // Очищаем выделения
    window.selectedChineseWords = window.selectedChineseWords || new Set();
    window.selectedRussianWords = window.selectedRussianWords || new Set();
    window.selectedChineseWords.clear();
    window.selectedRussianWords.clear();

    // ========== ОТОБРАЖАЕМ ПОЛНЫЙ КИТАЙСКИЙ ТЕКСТ ==========
    matchOrig.innerHTML = '<h3 class="font-bold text-lg mb-3">📖 Китайский текст (кликни на слово для выбора):</h3>';
    matchOrig.style.whiteSpace = 'pre-wrap';
    matchOrig.style.wordBreak = 'break-word';
    matchOrig.style.lineHeight = '1.8';
    matchOrig.style.fontSize = '1.2rem';

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

    const wordsToShow = segmentedWords.length ? segmentedWords : window.currentOriginalText.split('');
    let chineseWordIndex = 0;
    window.currentUniqueWords = []; // Массив для хранения всех китайских слов по индексам

    for (let i = 0; i < wordsToShow.length; i++) {
        const token = wordsToShow[i];
        const span = document.createElement('span');
        span.textContent = token;

        if (/[\u4e00-\u9fff]/.test(token)) {
            // Китайское слово - делаем кликабельным
            span.className = 'chinese-word';
            span.style.display = 'inline-block';
            span.style.padding = '2px 4px';
            span.style.margin = '0 2px';
            span.style.borderRadius = '4px';
            span.style.cursor = 'pointer';
            span.style.transition = 'all 0.2s ease';
            span.setAttribute('data-chinese-idx', chineseWordIndex);
            span.setAttribute('data-chinese-word', token);

            // Сохраняем слово в массив
            window.currentUniqueWords[chineseWordIndex] = token;

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
                    window.updateMatchLinkButtonState();
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

        matchOrig.appendChild(span);
    }

    console.log(`✅ Китайский текст отображен, слов: ${chineseWordIndex}`);

    // ========== ОТОБРАЖАЕМ РУССКИЙ ПЕРЕВОД ==========
    matchTrans.innerHTML = '<h3 class="font-bold text-lg mb-3">🌍 Русский перевод (кликни на слово для выбора):</h3>';
    matchTrans.style.whiteSpace = 'pre-wrap';
    matchTrans.style.lineHeight = '1.8';
    matchTrans.style.fontSize = '1.1rem';

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
        window.currentTransPhrases = [];

        for (const token of russianTokens) {
            if (token.type === 'newline') {
                const br = document.createElement('br');
                matchTrans.appendChild(br);
            }
            else if (token.type === 'space') {
                const space = document.createElement('span');
                space.innerHTML = '&nbsp;';
                space.style.width = '8px';
                space.style.display = 'inline';
                matchTrans.appendChild(space);
            }
            else if (token.type === 'punct') {
                const punct = document.createElement('span');
                punct.textContent = token.text;
                punct.style.display = 'inline';
                punct.style.color = '#666';
                punct.style.margin = '0 2px';
                matchTrans.appendChild(punct);
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

                // Сохраняем слово в массив
                window.currentTransPhrases[russianWordIndex] = token.text;

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
                        window.updateMatchLinkButtonState();
                        console.log(`Выбрано русское слово: "${word}"`, Array.from(window.selectedRussianWords));
                    };
                })(russianWordIndex, token.text, wordSpan);

                matchTrans.appendChild(wordSpan);
                matchTrans.appendChild(document.createTextNode(' '));
                russianWordIndex++;
            }
        }

        console.log(`✅ Русский текст отображен, слов: ${russianWordIndex}`);
    } else {
        matchTrans.innerHTML += '<div class="text-gray-400 p-4">Нет перевода</div>';
    }

    // Создаем панель управления для режима сопоставления
    window.createMatchControlPanel();

    // Загружаем существующие связи и подсвечиваем их
    if (window.currentEditId) {
        await window.loadMatchesForMatchView();
    }

    console.log("✅ loadMatchView завершен");
};

// ========== СОЗДАНИЕ ПАНЕЛИ УПРАВЛЕНИЯ ДЛЯ РЕЖИМА СОПОСТАВЛЕНИЯ ==========
window.createMatchControlPanel = function() {
    // Удаляем существующую панель
    const existingPanel = document.getElementById('match-control-panel');
    if (existingPanel) existingPanel.remove();

    const matchContainer = document.getElementById('match-mode');
    if (!matchContainer) return;

    const panel = document.createElement('div');
    panel.id = 'match-control-panel';
    panel.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-xl p-4 z-50 flex gap-3 border border-gray-200';
    panel.innerHTML = `
        <button id="match-link-button" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
            🔗 Привязать выделенные слова
        </button>
        <button onclick="window.clearMatchSelections()" class="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600">
            🗑️ Очистить выделение
        </button>
        <button onclick="window.saveMatchLinks()" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
            💾 Сохранить все связи
        </button>
    `;
    matchContainer.appendChild(panel);

    window.matchLinkButton = document.getElementById('match-link-button');
};

// ========== ОБНОВЛЕНИЕ СОСТОЯНИЯ КНОПКИ В РЕЖИМЕ СОПОСТАВЛЕНИЯ ==========
window.updateMatchLinkButtonState = function() {
    if (window.matchLinkButton) {
        const hasChinese = window.selectedChineseWords.size > 0;
        const hasRussian = window.selectedRussianWords.size > 0;
        window.matchLinkButton.disabled = !(hasChinese && hasRussian);

        if (hasChinese && hasRussian) {
            window.matchLinkButton.classList.add('bg-green-600', 'hover:bg-green-700');
            window.matchLinkButton.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        } else {
            window.matchLinkButton.classList.remove('bg-green-600', 'hover:bg-green-700');
            window.matchLinkButton.classList.add('bg-blue-600', 'hover:bg-blue-700');
        }
    }
};

// ========== ПРИВЯЗКА ВЫДЕЛЕННЫХ СЛОВ В РЕЖИМЕ СОПОСТАВЛЕНИЯ ==========
window.linkMatchSelectedWords = function() {
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
    window.highlightMatchLinkedWords();

    // Очищаем выделения
    window.clearMatchSelections();

    console.log("✅ Связи добавлены");
};

// ========== ПОДСВЕТКА СВЯЗАННЫХ СЛОВ В РЕЖИМЕ СОПОСТАВЛЕНИЯ ==========
window.highlightMatchLinkedWords = function() {
    const matchOrig = document.getElementById('match-original');
    const matchTrans = document.getElementById('match-translation');

    if (matchOrig) {
        const chineseWords = matchOrig.querySelectorAll('.chinese-word');
        chineseWords.forEach((word, idx) => {
            if (window.currentMatches[idx] && window.currentMatches[idx].length > 0) {
                word.style.backgroundColor = '#d1fae5';
                word.style.borderBottom = '2px solid #10b981';
            } else {
                word.style.backgroundColor = '';
                word.style.borderBottom = '';
            }
        });
    }

    if (matchTrans) {
        const russianWords = matchTrans.querySelectorAll('.russian-word');
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

// ========== ОЧИСТКА ВЫДЕЛЕНИЙ В РЕЖИМЕ СОПОСТАВЛЕНИЯ ==========
window.clearMatchSelections = function() {
    window.selectedChineseWords.clear();
    window.selectedRussianWords.clear();

    const matchOrig = document.getElementById('match-original');
    const matchTrans = document.getElementById('match-translation');

    if (matchOrig) {
        const chineseWords = matchOrig.querySelectorAll('.chinese-word');
        chineseWords.forEach(word => {
            word.classList.remove('selected-for-link');
        });
    }

    if (matchTrans) {
        const russianWords = matchTrans.querySelectorAll('.russian-word');
        russianWords.forEach(word => {
            word.classList.remove('selected-for-link');
        });
    }

    window.updateMatchLinkButtonState();
    console.log("Выделения очищены");
};

// ========== ЗАГРУЗКА СУЩЕСТВУЮЩИХ СВЯЗЕЙ ДЛЯ РЕЖИМА СОПОСТАВЛЕНИЯ ==========
window.loadMatchesForMatchView = async function() {
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

        window.highlightMatchLinkedWords();
        console.log("✅ Существующие связи загружены");
    } catch(e) {
        console.error(e);
    }
};

// ========== СОХРАНЕНИЕ ВСЕХ СВЯЗЕЙ ==========
window.saveMatchLinks = async function() {
    if (!window.currentEditId) {
        alert("Сначала сохраните текст в библиотеку!");
        return;
    }

    // Подготавливаем данные для сохранения
    const matchData = {
        words: (window.currentUniqueWords || []).map((w, i) => ({ word: w, position: i })),
        translations: (window.currentTransPhrases || []).map((p, i) => ({ phrase: p, position: i })),
        associations: Object.entries(window.currentMatches)
            .filter(([_, ids]) => ids && ids.length)
            .map(([wIdx, tIds]) => ({ word_id: parseInt(wIdx), translation_ids: tIds }))
    };

    try {
        const response = await fetch(`/api/library/${window.currentEditId}/matches`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(matchData)
        });

        if (response.ok) {
            alert("✅ Все связи сохранены!");
            console.log("Связи сохранены");
        } else {
            alert("❌ Ошибка сохранения");
        }
    } catch(e) {
        console.error("Ошибка сохранения:", e);
        alert("Ошибка сохранения");
    }
};

// ========== ПЕРЕКЛЮЧЕНИЕ НА КНОПКУ ПРИВЯЗКИ ==========
// Назначаем обработчик для кнопки привязки
setTimeout(() => {
    const linkBtn = document.getElementById('match-link-button');
    if (linkBtn) {
        linkBtn.onclick = () => window.linkMatchSelectedWords();
    }
}, 500);
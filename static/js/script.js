console.log("✅ script.js загружен успешно");

let isBlurred = true;
let currentOriginalText = '';
let currentTranslationText = '';
let currentEditId = null;
let currentWordsArray = [];
let currentTransArray = [];
let currentMatches = {};

// ========== ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК ==========
function showTab(tabName) {
    const simpleMode = document.getElementById('simple-mode');
    const parallelMode = document.getElementById('parallel-mode');
    const matchMode = document.getElementById('match-mode');
    const simpleBtn = document.getElementById('tab-simple-btn');
    const parallelBtn = document.getElementById('tab-parallel-btn');
    const matchBtn = document.getElementById('tab-match-btn');

    if (!simpleMode) return;

    simpleMode.classList.add('hidden');
    parallelMode.classList.add('hidden');
    matchMode.classList.add('hidden');

    if (tabName === 'simple') {
        simpleMode.classList.remove('hidden');
        simpleBtn.classList.add('tab-active');
        parallelBtn.classList.remove('tab-active');
        matchBtn.classList.remove('tab-active');
    } else if (tabName === 'parallel') {
        parallelMode.classList.remove('hidden');
        parallelBtn.classList.add('tab-active');
        simpleBtn.classList.remove('tab-active');
        matchBtn.classList.remove('tab-active');
        if (currentOriginalText) {
            loadParallelView();
        }
    } else if (tabName === 'match') {
        matchMode.classList.remove('hidden');
        matchBtn.classList.add('tab-active');
        simpleBtn.classList.remove('tab-active');
        parallelBtn.classList.remove('tab-active');
        if (currentOriginalText) {
            loadMatchView();
        }
    }
}

// ========== ПРАВИЛЬНАЯ РАЗБИВКА КИТАЙСКОГО ТЕКСТА ==========
function splitChineseText(text) {
    // Разбиваем китайский текст на слова, сохраняя знаки препинания и пробелы
    const result = [];
    let current = '';

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const code = char.charCodeAt(0);

        // Китайские символы (4E00-9FFF)
        if (code >= 0x4E00 && code <= 0x9FFF) {
            if (current) {
                result.push(current);
                current = '';
            }
            result.push(char);
        }
        // Пробелы, переносы строк и знаки препинания
        else if (char === ' ' || char === '\n' || char === '\r' ||
                 char === ',' || char === '.' || char === '!' || char === '?' ||
                 char === '，' || char === '。' || char === '！' || char === '？' ||
                 char === '；' || char === '：' || char === '、') {
            if (current) {
                result.push(current);
                current = '';
            }
            result.push(char);
        }
        // Остальные символы (латиница, цифры и т.д.)
        else {
            current += char;
        }
    }

    if (current) {
        result.push(current);
    }

    return result;
}

// ========== ПРОСТОЙ РЕЖИМ ==========
async function processText() {
    const input = document.getElementById('inputText');
    const translationInput = document.getElementById('inputTranslation');

    if (!input) return;

    const text = input.value;
    if (!text.trim()) {
        alert('Пожалуйста, введите текст');
        return;
    }

    currentOriginalText = text;
    currentTranslationText = translationInput ? translationInput.value : '';

    // Разбиваем на слова
    const words = splitChineseText(text);

    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '';

    words.forEach(word => {
        const span = document.createElement('span');
        span.textContent = word;
        span.className = 'word inline-block';

        // Только китайские символы делаем кликабельными
        if (/[\u4e00-\u9fff]/.test(word)) {
            span.style.cursor = 'pointer';
            span.onclick = (function(w) {
                return function() { showTranslationPopup(w); };
            })(word);
        }

        resultDiv.appendChild(span);
    });
}

// ========== ПАРАЛЛЕЛЬНЫЙ РЕЖИМ ==========
function loadParallelView() {
    const origDiv = document.getElementById('original-text');
    const transDiv = document.getElementById('translation-text');

    if (!origDiv || !transDiv) return;

    // Разбиваем оригинал на слова
    const words = splitChineseText(currentOriginalText);
    currentWordsArray = words.filter(w => /[\u4e00-\u9fff]/.test(w));

    // Разбиваем перевод на фразы (по / или по предложениям)
    if (currentTranslationText && currentTranslationText.includes('/')) {
        currentTransArray = currentTranslationText.split('/').map(p => p.trim());
    } else if (currentTranslationText) {
        currentTransArray = [currentTranslationText];
    } else {
        currentTransArray = [];
    }

    // Отображаем оригинал
    origDiv.innerHTML = '';
    let wordIndex = 0;

    words.forEach(word => {
        const span = document.createElement('span');
        span.textContent = word;
        span.className = 'word inline-block';

        if (/[\u4e00-\u9fff]/.test(word)) {
            span.style.cursor = 'pointer';
            span.dataset.wordIndex = wordIndex;
            span.onclick = (function(w, idx) {
                return function() { showWordTranslations(w, idx); };
            })(word, wordIndex);
            wordIndex++;
        }

        origDiv.appendChild(span);
    });

    // Отображаем перевод
    transDiv.innerHTML = '';
    currentTransArray.forEach((phrase, idx) => {
        const span = document.createElement('span');
        span.textContent = phrase;
        span.className = 'trans-phrase inline-block p-2 m-1 rounded';
        span.dataset.transIndex = idx;
        transDiv.appendChild(span);
        transDiv.appendChild(document.createTextNode(' '));
    });

    // Применяем размытие
    if (isBlurred) {
        transDiv.classList.add('blur-sm', 'select-none');
    } else {
        transDiv.classList.remove('blur-sm', 'select-none');
    }

    // Загружаем сохраненные сопоставления
    if (currentEditId) {
        loadMatches();
    }
}

async function showWordTranslations(word, wordIndex) {
    // Ищем сопоставления для этого слова
    let translations = [];
    let fromMatches = false;

    if (currentMatches[wordIndex] && currentMatches[wordIndex].length > 0) {
        translations = currentMatches[wordIndex].map(idx => currentTransArray[idx]);
        fromMatches = true;
    }

    // Если нет сопоставлений, ищем в словаре
    if (translations.length === 0) {
        try {
            const response = await fetch(`/api/dictionary/translate/${encodeURIComponent(word)}`);
            if (response.ok) {
                const data = await response.json();
                if (data.translation) {
                    translations = [data.translation];
                }
            }
        } catch(e) {
            console.error(e);
        }
    }

    showTranslationPopup(word, translations, fromMatches);
}

function toggleBlur() {
    const transDiv = document.getElementById('translation-text');
    if (!transDiv) return;

    isBlurred = !isBlurred;

    if (isBlurred) {
        transDiv.classList.add('blur-sm', 'select-none');
        document.getElementById('blurBtn').textContent = '👁️ Показать перевод';
    } else {
        transDiv.classList.remove('blur-sm', 'select-none');
        document.getElementById('blurBtn').textContent = '🙈 Скрыть перевод';
    }
}

// ========== РЕЖИМ СОПОСТАВЛЕНИЯ ==========
function loadMatchView() {
    const matchOrig = document.getElementById('match-original');
    const matchTrans = document.getElementById('match-translation');

    if (!matchOrig || !matchTrans) return;

    // Получаем слова (только уникальные китайские слова)
    const allWords = splitChineseText(currentOriginalText);
    const uniqueWords = [...new Set(allWords.filter(w => /[\u4e00-\u9fff]/.test(w)))];

    // Получаем фразы перевода
    let transPhrases = [];
    if (currentTranslationText && currentTranslationText.includes('/')) {
        transPhrases = currentTranslationText.split('/').map(p => p.trim());
    } else if (currentTranslationText) {
        transPhrases = [currentTranslationText];
    }

    matchOrig.innerHTML = '<h3 class="font-bold mb-3">Китайские слова:</h3>';
    matchTrans.innerHTML = '<h3 class="font-bold mb-3">Фразы перевода:</h3>';

    // Отображаем слова
    uniqueWords.forEach((word, idx) => {
        const div = document.createElement('div');
        div.className = 'match-word p-3 border rounded-lg mb-2 cursor-pointer hover:bg-blue-50';
        div.dataset.word = word;
        div.dataset.wordId = idx;

        const matchedTrans = currentMatches[idx] || [];
        div.innerHTML = `
            <div class="font-bold text-red-600 text-lg">${word}</div>
            <div class="text-sm text-gray-500 mt-1">
                Связано: ${matchedTrans.length > 0 ? matchedTrans.map(t => `"${transPhrases[t]}"`).join(', ') : 'нет'}
            </div>
            <button class="mt-2 text-xs bg-blue-500 text-white px-2 py-1 rounded" onclick="event.stopPropagation(); editMatches(${idx})">
                ✏️ Редактировать
            </button>
        `;
        matchOrig.appendChild(div);
    });

    // Отображаем фразы перевода
    transPhrases.forEach((phrase, idx) => {
        const div = document.createElement('div');
        div.className = 'p-3 border rounded-lg mb-2 bg-gray-50';
        div.innerHTML = `
            <div class="text-green-600">${phrase}</div>
            <div class="text-xs text-gray-400 mt-1">ID: ${idx}</div>
        `;
        matchTrans.appendChild(div);
    });
}

function editMatches(wordId) {
    const allWords = splitChineseText(currentOriginalText);
    const uniqueWords = [...new Set(allWords.filter(w => /[\u4e00-\u9fff]/.test(w)))];
    const word = uniqueWords[wordId];

    let transPhrases = [];
    if (currentTranslationText && currentTranslationText.includes('/')) {
        transPhrases = currentTranslationText.split('/').map(p => p.trim());
    } else if (currentTranslationText) {
        transPhrases = [currentTranslationText];
    }

    const currentMatchesForWord = currentMatches[wordId] || [];

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-auto">
            <h3 class="font-bold text-xl mb-4">Сопоставить слово: "${word}"</h3>
            <div class="space-y-2">
                ${transPhrases.map((phrase, idx) => `
                    <label class="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input type="checkbox" value="${idx}" 
                            ${currentMatchesForWord.includes(idx) ? 'checked' : ''}
                            class="match-checkbox w-5 h-5">
                        <span class="flex-1">${phrase}</span>
                    </label>
                `).join('')}
            </div>
            <div class="flex gap-3 mt-6">
                <button onclick="saveWordMatches(${wordId})" class="bg-green-600 text-white px-4 py-2 rounded-lg">Сохранить</button>
                <button onclick="this.closest('.fixed').remove()" class="bg-gray-500 text-white px-4 py-2 rounded-lg">Отмена</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    window.saveWordMatches = function(id) {
        const checkboxes = modal.querySelectorAll('.match-checkbox');
        const selectedIds = Array.from(checkboxes)
            .filter(cb => cb.checked)
            .map(cb => parseInt(cb.value));

        currentMatches[id] = selectedIds;
        modal.remove();
        loadMatchView(); // Обновляем отображение
    };
}

// ========== СОХРАНЕНИЕ В БД ==========
async function saveToLibrary() {
    if (!currentOriginalText) {
        alert("Нет текста для сохранения");
        return;
    }

    const title = prompt("Введите название:", new Date().toLocaleString());
    if (!title) return;

    try {
        // Сначала сохраняем текст
        const response = await fetch('/api/library/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: title,
                content: currentOriginalText,
                translation: currentTranslationText || ''
            })
        });

        if (!response.ok) {
            throw new Error('Ошибка сохранения текста');
        }

        const savedText = await response.json();
        currentEditId = savedText.id;

        // Затем сохраняем сопоставления
        if (Object.keys(currentMatches).length > 0) {
            await saveMatchesToServer();
        }

        alert("✅ Текст и сопоставления сохранены!");
        await loadLibrary();

    } catch (err) {
        console.error(err);
        alert("❌ Ошибка: " + err.message);
    }
}

async function saveMatchesToServer() {
    if (!currentEditId) return;

    // Получаем все уникальные слова
    const allWords = splitChineseText(currentOriginalText);
    const uniqueWords = [...new Set(allWords.filter(w => /[\u4e00-\u9fff]/.test(w)))];

    // Получаем фразы перевода
    let transPhrases = [];
    if (currentTranslationText && currentTranslationText.includes('/')) {
        transPhrases = currentTranslationText.split('/').map(p => p.trim());
    } else if (currentTranslationText) {
        transPhrases = [currentTranslationText];
    }

    const matchData = {
        text_id: currentEditId,
        words: uniqueWords.map((word, idx) => ({
            word: word,
            position: idx
        })),
        translations: transPhrases.map((phrase, idx) => ({
            phrase: phrase,
            position: idx
        })),
        associations: Object.entries(currentMatches)
            .filter(([_, transIds]) => transIds.length > 0)
            .map(([wordIdx, transIds]) => ({
                word_id: parseInt(wordIdx),
                translation_ids: transIds
            }))
    };

    try {
        const response = await fetch(`/api/library/${currentEditId}/matches`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(matchData)
        });

        if (!response.ok) {
            console.error('Ошибка сохранения сопоставлений');
        }
    } catch (err) {
        console.error(err);
    }
}

async function loadMatches() {
    if (!currentEditId) return;

    try {
        const response = await fetch(`/api/library/${currentEditId}/matches`);
        if (response.ok) {
            const data = await response.json();

            // Восстанавливаем сопоставления
            currentMatches = {};
            data.words.forEach(word => {
                if (word.translation_ids && word.translation_ids.length > 0) {
                    currentMatches[word.position] = word.translation_ids;
                }
            });

            // Обновляем отображение
            highlightMatchedWords();
        }
    } catch (err) {
        console.error(err);
    }
}

function highlightMatchedWords() {
    const origDiv = document.getElementById('original-text');
    if (!origDiv) return;

    const words = origDiv.querySelectorAll('.word');
    let wordIndex = 0;

    words.forEach(word => {
        if (/[\u4e00-\u9fff]/.test(word.textContent)) {
            if (currentMatches[wordIndex] && currentMatches[wordIndex].length > 0) {
                word.classList.add('matched');
                word.style.borderBottom = '2px solid #10b981';
                word.style.backgroundColor = '#d1fae5';
            }
            wordIndex++;
        }
    });
}

async function updateExistingText() {
    if (!currentEditId) {
        await saveToLibrary();
        return;
    }

    try {
        const response = await fetch(`/api/library/${currentEditId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: currentOriginalText,
                translation: currentTranslationText
            })
        });

        if (response.ok) {
            await saveMatchesToServer();
            alert("✅ Обновлено!");
            await loadLibrary();
        }
    } catch (err) {
        console.error(err);
    }
}

function clearAllMatches() {
    if (confirm("Очистить все сопоставления для этого текста?")) {
        currentMatches = {};
        loadMatchView();
        if (currentEditId) {
            saveMatchesToServer();
        }
        alert("✅ Сопоставления очищены");
    }
}

// ========== ПОПАП ПЕРЕВОДА ==========
function showTranslationPopup(word, translations = [], fromMatches = false) {
    const popup = document.getElementById('popup');
    const popupWord = document.getElementById('popupWord');
    const popupPinyin = document.getElementById('popupPinyin');
    const popupTranslation = document.getElementById('popupTranslation');

    popupWord.textContent = word;

    if (translations.length > 0) {
        popupTranslation.innerHTML = translations.map(t => `• ${t}`).join('<br>');
        if (fromMatches) {
            popupTranslation.innerHTML += '<br><span class="text-green-500 text-sm">(из ваших сопоставлений)</span>';
        }
    } else {
        popupTranslation.innerHTML = '❌ Перевод не найден в словаре<br><br>💡 Перейдите во вкладку "Сопоставить слова", чтобы добавить перевод';
    }

    popupPinyin.textContent = '';
    popup.classList.remove('hidden');
}

function closePopup() {
    document.getElementById('popup').classList.add('hidden');
}

// ========== БИБЛИОТЕКА ==========
async function loadLibrary() {
    try {
        const response = await fetch('/api/library/');
        if (!response.ok) throw new Error('Ошибка');

        const texts = await response.json();
        const libraryList = document.getElementById('libraryList');

        if (!libraryList) return;

        if (texts.length === 0) {
            libraryList.innerHTML = '<div class="text-gray-500 text-center p-4">📭 Пусто</div>';
            return;
        }

        libraryList.innerHTML = '';
        texts.forEach(text => {
            const div = document.createElement('div');
            div.className = `library-item p-3 border rounded cursor-pointer mb-2 transition-all ${currentEditId === text.id ? 'bg-blue-100 border-blue-500' : 'bg-white hover:bg-gray-50'}`;
            div.onclick = () => loadText(text.id);
            div.innerHTML = `
                <div class="font-bold text-sm truncate">📄 ${escapeHtml(text.title)}</div>
                <div class="text-xs text-gray-500 truncate mt-1">${escapeHtml(text.content.substring(0, 60))}</div>
                <div class="text-xs text-gray-400 mt-1">ID: ${text.id}</div>
            `;
            libraryList.appendChild(div);
        });
    } catch (err) {
        console.error(err);
    }
}

async function loadText(id) {
    try {
        const response = await fetch(`/api/library/${id}`);
        if (!response.ok) throw new Error('Ошибка');

        const text = await response.json();

        currentOriginalText = text.content;
        currentTranslationText = text.translation || '';
        currentEditId = text.id;

        // Заполняем поля ввода
        document.getElementById('inputText').value = currentOriginalText;
        document.getElementById('inputTranslation').value = currentTranslationText;

        // Загружаем сопоставления
        await loadMatches();

        // Отображаем в параллельном режиме
        loadParallelView();
        showTab('parallel');

    } catch (err) {
        console.error(err);
        alert("Ошибка загрузки текста");
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Глобальные функции
window.showTab = showTab;
window.processText = processText;
window.saveToLibrary = saveToLibrary;
window.updateExistingText = updateExistingText;
window.loadLibrary = loadLibrary;
window.toggleBlur = toggleBlur;
window.closePopup = closePopup;
window.clearAllMatches = clearAllMatches;
window.editMatches = editMatches;

// Загрузка библиотеки при старте
document.addEventListener('DOMContentLoaded', () => {
    loadLibrary();
    console.log("✅ Готово!");
});
console.log("✅ matches.js загружен");

// ========== РЕЖИМ СОПОСТАВЛЕНИЯ ==========
window.loadMatchView = function() {
    console.log("🟡 loadMatchView вызван");

    const matchOrig = document.getElementById('match-original');
    const matchTrans = document.getElementById('match-translation');

    if (!matchOrig) {
        console.warn("#match-original не найден");
        return;
    }

    if (!window.currentOriginalText) {
        matchOrig.innerHTML = '<div class="text-gray-400 p-4">Нет текста. Сначала введите текст в простом режиме.</div>';
        if (matchTrans) matchTrans.innerHTML = '<div class="text-gray-400 p-4">Нет перевода</div>';
        return;
    }

    // Получаем уникальные китайские слова из сегментированного текста
    let uniqueWords = [];

    if (window.currentSegmentedWords && window.currentSegmentedWords.length > 0) {
        // Используем уже сегментированные слова от jieba
        uniqueWords = [...new Set(window.currentSegmentedWords.filter(w => /[\u4e00-\u9fff]/.test(w)))];
    } else {
        // Fallback: собираем все китайские символы
        const allChinese = window.currentOriginalText.match(/[\u4e00-\u9fff]/g) || [];
        uniqueWords = [...new Set(allChinese)];
    }

    window.currentUniqueWords = uniqueWords;

    // Получаем фразы перевода
    let transPhrases = [];
    if (window.currentTranslationText && window.currentTranslationText.includes('/')) {
        transPhrases = window.currentTranslationText.split('/').map(p => p.trim());
    } else if (window.currentTranslationText) {
        transPhrases = [window.currentTranslationText];
    }
    window.currentTransPhrases = transPhrases;

    // Очищаем и заполняем левую колонку
    matchOrig.innerHTML = '<h3 class="font-bold text-lg mb-3">📖 Китайские слова (кликни для выбора):</h3>';
    matchOrig.style.whiteSpace = 'normal';

    if (uniqueWords.length === 0) {
        matchOrig.innerHTML += '<div class="text-gray-400 p-4">Нет китайских слов для сопоставления</div>';
    } else {
        uniqueWords.forEach((word, idx) => {
            const div = document.createElement('div');
            div.className = 'match-word p-3 border rounded-lg mb-2 cursor-pointer hover:bg-blue-50 transition-colors';
            div.dataset.word = word;
            div.dataset.wordId = idx;

            const matched = window.currentMatches[idx] || [];
            const matchedText = matched.length ? matched.map(t => `"${window.escapeHtml(transPhrases[t])}"`).join(', ') : 'нет';

            div.innerHTML = `
                <div class="font-bold text-red-600 text-lg">${window.escapeHtml(word)}</div>
                <div class="text-sm text-gray-500 mt-1">Связано: ${matchedText}</div>
            `;

            div.onclick = (function(w, id) {
                return function() { window.showMatchModal(w, id); };
            })(word, idx);

            matchOrig.appendChild(div);
        });
    }

    // Заполняем правую колонку (фразы перевода)
    if (matchTrans) {
        matchTrans.innerHTML = '<h3 class="font-bold text-lg mb-3">🌍 Фразы перевода:</h3>';
        matchTrans.style.whiteSpace = 'normal';

        if (transPhrases.length === 0) {
            matchTrans.innerHTML += '<div class="text-gray-400 p-4">Нет перевода. Введите перевод в простом режиме.</div>';
        } else {
            transPhrases.forEach((phrase, idx) => {
                const div = document.createElement('div');
                div.className = 'p-3 border rounded-lg mb-2 bg-gray-50';
                div.innerHTML = `
                    <div class="text-green-600">${window.escapeHtml(phrase)}</div>
                    <div class="text-xs text-gray-400 mt-1">ID: ${idx}</div>
                `;
                matchTrans.appendChild(div);
            });
        }
    }

    // Обновляем список сопоставлений
    window.updateMatchesList();

    console.log("✅ loadMatchView завершен, слов:", uniqueWords.length);
};

// Показать модалку для выбора переводов
window.showMatchModal = function(word, wordId) {
    const transPhrases = window.currentTransPhrases || [];
    const currentSel = window.currentMatches[wordId] || [];

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-auto">
            <h3 class="font-bold text-xl mb-4">Сопоставить слово: "${window.escapeHtml(word)}"</h3>
            <div class="space-y-2">
                ${transPhrases.map((p, i) => `
                    <label class="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input type="checkbox" value="${i}" class="match-checkbox w-5 h-5" ${currentSel.includes(i) ? 'checked' : ''}>
                        <span class="flex-1">${window.escapeHtml(p)}</span>
                    </label>
                `).join('')}
            </div>
            <div class="flex gap-3 mt-6">
                <button onclick="window.saveMatch(${wordId}, this)" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">Сохранить</button>
                <button onclick="this.closest('.fixed').remove()" class="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600">Отмена</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
};

// Сохранить сопоставление для слова
window.saveMatch = function(wordId, btn) {
    const modal = btn.closest('.fixed');
    const checks = modal.querySelectorAll('.match-checkbox');
    const selected = Array.from(checks).filter(c => c.checked).map(c => parseInt(c.value));

    window.currentMatches[wordId] = selected;
    modal.remove();

    // Обновляем отображение
    window.loadMatchView();
    window.highlightMatchedWords();

    // Если есть сохраненный текст, сразу сохраняем на сервер
    if (window.currentEditId) {
        window.saveMatchesToServer();
    }
};

// Обновить список сопоставлений внизу
window.updateMatchesList = function() {
    const listDiv = document.getElementById('matches-list');
    if (!listDiv) return;

    const transPhrases = window.currentTransPhrases || [];
    const entries = Object.entries(window.currentMatches).filter(([_, ids]) => ids && ids.length);

    if (entries.length === 0) {
        listDiv.innerHTML = '<div class="text-gray-500 text-center p-4">Нет сопоставлений. Кликните на слово слева, чтобы добавить.</div>';
        return;
    }

    listDiv.innerHTML = '';
    for (const [wordId, transIds] of entries) {
        const word = window.currentUniqueWords?.[parseInt(wordId)] || '?';
        const translations = transIds.map(id => transPhrases[id] || '?').join(', ');

        const div = document.createElement('div');
        div.className = 'flex items-center justify-between p-3 border rounded-lg bg-gray-50';
        div.innerHTML = `
            <div>
                <span class="font-bold text-red-600">${window.escapeHtml(word)}</span>
                <span class="mx-2">→</span>
                <span class="text-green-600">${window.escapeHtml(translations)}</span>
            </div>
            <button onclick="window.removeMatch(${wordId})" class="text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50">✕</button>
        `;
        listDiv.appendChild(div);
    }
};

// Удалить сопоставление
window.removeMatch = function(wordId) {
    if (confirm('Удалить это сопоставление?')) {
        delete window.currentMatches[wordId];
        window.loadMatchView();
        window.highlightMatchedWords();
        if (window.currentEditId) window.saveMatchesToServer();
    }
};

// ========== СОХРАНЕНИЕ СОПОСТАВЛЕНИЙ НА СЕРВЕР ==========
window.saveMatchesToServer = async function() {
    if (!window.currentEditId) {
        console.warn("Нет currentEditId, текст не сохранен. Сначала сохраните текст.");
        return;
    }

    const uniqueWords = window.currentUniqueWords || [];
    const transPhrases = window.currentTransPhrases || [];

    const matchData = {
        words: uniqueWords.map((w, i) => ({ word: w, position: i })),
        translations: transPhrases.map((p, i) => ({ phrase: p, position: i })),
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
            console.log("✅ Сопоставления сохранены на сервере");
        } else {
            console.error("Ошибка сохранения сопоставлений:", response.status);
        }
    } catch (e) {
        console.error("Ошибка saveMatchesToServer:", e);
    }
};

// ========== ЗАГРУЗИТЬ СОПОСТАВЛЕНИЯ ==========
window.loadMatches = async function() {
    if (!window.currentEditId) {
        console.warn("Нет currentEditId");
        return;
    }

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

        console.log("✅ Сопоставления загружены, всего:", Object.keys(window.currentMatches).length);
        window.highlightMatchedWords();
    } catch (e) {
        console.error("Ошибка loadMatches:", e);
    }
};

// Очистить все сопоставления
window.clearAllMatches = function() {
    if (!confirm('Очистить все сопоставления для этого текста?')) return;
    window.currentMatches = {};
    window.loadMatchView();
    window.highlightMatchedWords();
    if (window.currentEditId) window.saveMatchesToServer();
    alert('✅ Сопоставления очищены');
};
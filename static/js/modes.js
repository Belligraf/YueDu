console.log("✅ modes.js загружен");

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

        simpleBtn?.classList.remove('tab-active');
        parallelBtn?.classList.remove('tab-active');
        matchBtn?.classList.remove('tab-active');

        if (tabName === 'simple') {
            if (simpleMode) simpleMode.classList.remove('hidden');
            simpleBtn?.classList.add('tab-active');
        } else if (tabName === 'parallel') {
            if (parallelMode) parallelMode.classList.remove('hidden');
            parallelBtn?.classList.add('tab-active');
            if (window.currentOriginalText) {
                window.loadParallelView();
            }
        } else if (tabName === 'match') {
            if (matchMode) matchMode.classList.remove('hidden');
            matchBtn?.classList.add('tab-active');
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

    if (!input) return;

    const text = input.value;
    if (!text.trim()) {
        alert('Пожалуйста, введите текст');
        return;
    }

    window.currentOriginalText = text;
    window.currentTranslationText = translationInput?.value || '';

    // Отправляем на сервер для сегментации через jieba
    try {
        const response = await fetch('/api/segment/segment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text })
        });

        if (response.ok) {
            const data = await response.json();
            window.currentSegmentedWords = data.words;
            console.log("✅ Сегментация через jieba:", window.currentSegmentedWords);
        } else {
            console.error("Ошибка сегментации:", response.status);
            window.currentSegmentedWords = [];
        }
    } catch (err) {
        console.error("Ошибка запроса сегментации:", err);
        window.currentSegmentedWords = [];
    }

    const resultDiv = document.getElementById('result');
    if (!resultDiv) return;

    // Отображаем с сегментацией
    window.renderWithSegmentation(resultDiv, text, window.currentSegmentedWords);

    console.log("✅ Текст обработан");
};

// ========== ПАРАЛЛЕЛЬНЫЙ РЕЖИМ ==========
window.loadParallelView = async function() {
    console.log("🟡 loadParallelView вызван");

    const origDiv = document.getElementById('original-text');
    const transDiv = document.getElementById('translation-text');

    if (!origDiv) {
        console.warn("#original-text не найден");
        return;
    }

    if (!window.currentOriginalText) {
        origDiv.innerHTML = '<div class="text-gray-400">Нет текста. Сначала введите текст в простом режиме.</div>';
        if (transDiv) transDiv.innerHTML = '<div class="text-gray-400">Нет перевода</div>';
        return;
    }

    // Получаем сегментированные слова через jieba
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
            console.log("✅ Сегментация для параллельного режима:", segmentedWords);
        } else {
            console.error("Ошибка сегментации:", response.status);
        }
    } catch (err) {
        console.error("Ошибка запроса сегментации:", err);
    }

    // Отрисовываем оригинал с сегментацией
    window.renderWithSegmentation(origDiv, window.currentOriginalText, segmentedWords);

    // Разбиваем перевод на фразы
    if (window.currentTranslationText && window.currentTranslationText.includes('/')) {
        window.currentTransArray = window.currentTranslationText.split('/').map(p => p.trim());
    } else if (window.currentTranslationText) {
        window.currentTransArray = [window.currentTranslationText];
    } else {
        window.currentTransArray = [];
    }

    // Отрисовываем перевод
    if (transDiv) {
        transDiv.innerHTML = '';
        transDiv.style.whiteSpace = 'pre-wrap';
        transDiv.style.lineHeight = '1.8';

        if (window.currentTransArray.length > 0) {
            window.currentTransArray.forEach((phrase, idx) => {
                const span = document.createElement('span');
                span.textContent = phrase;
                span.className = 'trans-phrase';
                span.style.display = 'inline-block';
                span.style.padding = '4px 8px';
                span.style.margin = '2px';
                span.style.borderRadius = '8px';
                span.style.transition = 'all 0.2s ease';
                span.dataset.transIndex = idx;
                transDiv.appendChild(span);
                transDiv.appendChild(document.createTextNode(' '));
            });
        } else {
            transDiv.innerHTML = '<span class="text-gray-400">Нет перевода</span>';
        }

        // Применяем размытие
        if (window.isBlurred) {
            transDiv.classList.add('blur-sm', 'select-none');
        } else {
            transDiv.classList.remove('blur-sm', 'select-none');
        }
    }

    // Подсвечиваем сопоставления
    setTimeout(() => {
        window.highlightMatchedWords();
    }, 100);

    console.log("✅ loadParallelView завершен");
};

// ========== ПОКАЗ ПЕРЕВОДА СЛОВА ==========
window.showWordTranslations = async function(word, wordIndex) {
    console.log(`🔍 Перевод слова: "${word}", индекс: ${wordIndex}`);

    let translations = [];
    let fromMatches = false;

    // 1. Сначала ищем в сохранённых сопоставлениях
    if (window.currentMatches && window.currentMatches[wordIndex] && window.currentMatches[wordIndex].length > 0) {
        const transIds = window.currentMatches[wordIndex];
        translations = transIds.map(idx => window.currentTransArray?.[idx] || '').filter(t => t);
        fromMatches = true;
        console.log("Найдено в сопоставлениях:", translations);
    }

    // 2. Если нет — запрашиваем из словаря
    if (translations.length === 0) {
        try {
            const url = `/api/dictionary/translate/${encodeURIComponent(word)}`;
            const res = await fetch(url);

            if (res.ok) {
                const data = await res.json();
                if (data.translation) {
                    translations = [data.translation];
                    console.log("Найдено в словаре:", translations);
                }
            } else {
                console.log("Слово не найдено в словаре");
            }
        } catch (e) {
            console.error("Ошибка запроса в словарь:", e);
        }
    }

    // Показываем попап
    window.showTranslationPopup(word, translations, fromMatches);
};

// ========== РАЗМЫТИЕ ПЕРЕВОДА ==========
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
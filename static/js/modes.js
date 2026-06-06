console.log("✅ modes.js загружен (общий файл)");

// ====================== ЦВЕТОВОЙ КОНФИГ ======================
window.colorConfig = {
    linked: '#a7f3d0',
    linkedBorder: '#10b981',
    selected: '#fef08a',
    selectedBorder: '#eab308',
    hover: '#fef9c3',
    tempHighlight: '#fef9c3',

    posColors: {
        'noun': '#c5e0b4',
        'verb': '#bdd7ee',
        'adj':  '#f7c6c6',
        'adv':  '#ffd966',
        'pron': '#d5a6bd',
        'num':  '#c5d9f1',
        'conj': '#e2efda',
        'prep': '#fde9a0',
        'intj': '#f9cb9c',
        'part': '#e6c3c3',
        'unknown': 'transparent'
    }
};

// ====================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ======================
window.selectedChineseWords = window.selectedChineseWords || new Set();
window.selectedRussianWords = window.selectedRussianWords || new Set();
window.currentMatches = window.currentMatches || {};
window.currentWordsPos = window.currentWordsPos || [];
window.currentWordsIds = window.currentWordsIds || [];
window.currentWordsArray = [];
window.currentTransArray = [];
window.currentOriginalText = window.currentOriginalText || '';
window.currentTranslationText = window.currentTranslationText || '';
window.currentEditId = window.currentEditId || null;
window.isBlurred = true;
window.highlightEnabled = true;



// ========== ЗАГРУЗКА ТЕКСТА ИЗ БИБЛИОТЕКИ ==========
window.loadTextFromLibrary = async function(id) {
    try {
        const response = await fetch(`/api/library/${id}`);
        if (!response.ok) throw new Error('Ошибка загрузки');

        const text = await response.json();

        window.currentOriginalText = text.content;
        window.currentTranslationText = text.translation || '';
        window.currentEditId = text.id;

        console.log(`✅ Загружен текст из библиотеки: ${text.title}`);

        // Переключаемся на параллельный режим по умолчанию
        if (typeof window.showTab === 'function') {
            await window.showTab('parallel');
        }
    } catch (error) {
        console.error("Ошибка загрузки текста:", error);
        alert("Ошибка загрузки текста");
    }
};

// ========== ЗАГЛУШКИ ДЛЯ ФУНКЦИЙ ИЗ ДРУГИХ ФАЙЛОВ ==========
if (typeof window.showPartMenu !== 'function') {
    window.showPartMenu = function(x, y, idx, word) {
        console.log(`📍 showPartMenu вызван для слова: ${word} (idx=${idx})`);
        alert(`Выбрано слово: "${word}"\n\nМеню частей речи будет доступно после доработки.`);
    };
}
// ====================== ЕДИНЫЙ РЕНДЕРИНГ (вызывается из showTab) ======================
window.refreshCurrentMode = window.refreshCurrentMode || function() {
    console.log("🔄 refreshCurrentMode вызван из modes.js");
    if (window.currentEditId && window.loadTextInMode) {
        // Если текст уже загружен — просто перерендерим текущий режим
    }
};
// ====================== ЧИСТЫЙ И РАБОЧИЙ showTab ======================
window.showTab = async function(tabName) {
    console.log(`🔄 showTab("${tabName}") — АГРЕССИВНЫЙ ФИНАЛЬНЫЙ ВАРИАНТ`);

    const container = document.getElementById('content-container');
    if (!container) return;

    const html = await (await fetch(`/static/modes/${tabName}.html`)).text();
    container.innerHTML = html;

    await new Promise(r => setTimeout(r, 300)); // даём HTML полностью загрузиться

    // Принудительно рисуем текст из БД во всех режимах
    if (window.currentOriginalText && window.currentOriginalText.trim() !== '') {
        window.formatAllText();
    }

    if (tabName === 'match' && typeof window.loadMatchView === 'function') {
        window.loadMatchView();
    }
    if (tabName === 'parallel') {
        document.getElementById('parallel-input-section')?.classList.add('hidden');
        document.getElementById('parallel-reading-section')?.classList.remove('hidden');
        if (typeof window.renderParallelReadingView === 'function') window.renderParallelReadingView();
    }
    if (tabName === 'simple') {
        if (typeof window.processTextForReader === 'function') window.processTextForReader();
    }

    console.log(`✅ ${tabName} полностью загружен с нормальным текстом`);
};

// Инициализация
console.log("✅ modes.js (общий) полностью загружен");
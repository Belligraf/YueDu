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

// ====================== ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК (главная функция) ======================
window.showTab = async function(tabName) {
    console.log(`🔄 showTab: переключаемся на "${tabName}"`);

    const container = document.getElementById('content-container');
    if (!container) {
        console.error("❌ #content-container не найден");
        return;
    }

    try {
        const response = await fetch(`/static/modes/${tabName}.html`);
        if (!response.ok) throw new Error(`Файл ${tabName}.html не найден`);

        const html = await response.text();
        container.innerHTML = html;

        setTimeout(() => {
            const simpleMode = document.getElementById('simple-mode');
            const parallelMode = document.getElementById('parallel-mode');
            const matchMode = document.getElementById('match-mode');

            // Скрываем все режимы
            if (simpleMode) simpleMode.classList.add('hidden');
            if (parallelMode) parallelMode.classList.add('hidden');
            if (matchMode) matchMode.classList.add('hidden');

            // Показываем нужный
            if (tabName === 'simple' && simpleMode) {
                simpleMode.classList.remove('hidden');
                console.log("✅ Показан Простой ридер");
                if (typeof window.processTextForReader === 'function') {
                    window.processTextForReader();
                }
            }
            else if (tabName === 'parallel' && parallelMode) {
                parallelMode.classList.remove('hidden');
                console.log("✅ Показан Параллельный ридер");
                if (window.currentOriginalText && typeof window.loadParallelView === 'function') {
                    window.loadParallelView();
                }
            }
            else if (tabName === 'match' && matchMode) {
                matchMode.classList.remove('hidden');
                console.log("✅ Показан режим Сопоставления");
                if (typeof window.loadMatchView === 'function') {
                    window.loadMatchView();
                } else {
                    console.warn("⚠️ loadMatchView ещё не загружена");
                }
            }
        }, 150);

    } catch (e) {
        console.error(`💥 Ошибка при загрузке ${tabName}:`, e);
        container.innerHTML = `<div class="p-8 text-red-500">Ошибка загрузки режима: ${tabName}</div>`;
    }
};

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

// Инициализация
console.log("✅ modes.js (общий) полностью загружен");
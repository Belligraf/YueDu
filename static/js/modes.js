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

// ====================== ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК ======================
window.showTab = async function(tabName) {
    console.log(`🔄 showTab: переключаемся на "${tabName}"`);

    const container = document.getElementById('content-container');
    if (!container) return;

    try {
        const response = await fetch(`/static/modes/${tabName}.html`);
        const html = await response.text();
        container.innerHTML = html;

        // Даём DOM полностью построиться
        await new Promise(r => setTimeout(r, 80));

        if (window.currentOriginalText && window.currentOriginalText.trim() !== '') {
            console.log(`📥 Найден сохранённый текст (${window.currentOriginalText.length} символов) — показываем в режиме ${tabName}`);

            if (tabName === 'parallel') {
                // Принудительно переключаем на режим ЧТЕНИЯ
                const inputSection = document.getElementById('parallel-input-section');
                const readingSection = document.getElementById('parallel-reading-section');

                if (inputSection) inputSection.classList.add('hidden');
                if (readingSection) readingSection.classList.remove('hidden');

                // Главный вызов
                if (typeof window.renderParallelReadingView === 'function') {
                    await window.renderParallelReadingView();
                } else if (typeof window.displayText === 'function') {
                    await window.displayText('parallel');
                }
            }
            else if (tabName === 'match') {
                if (typeof window.loadMatchView === 'function') window.loadMatchView();
                else if (typeof window.displayText === 'function') window.displayText('match');
            }
            else if (tabName === 'simple') {
                if (typeof window.processTextForReader === 'function') window.processTextForReader();
                else if (typeof window.displayText === 'function') window.displayText('simple');
            }
        }

        console.log(`✅ Режим ${tabName} загружен`);
    } catch (e) {
        console.error("Ошибка showTab:", e);
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
// ====================== ЕДИНЫЙ РЕНДЕРИНГ (вызывается из showTab) ======================
window.refreshCurrentMode = window.refreshCurrentMode || function() {
    console.log("🔄 refreshCurrentMode вызван из modes.js");
    if (window.currentEditId && window.loadTextInMode) {
        // Если текст уже загружен — просто перерендерим текущий режим
    }
};

// Улучшаем showTab
const originalShowTab = window.showTab;
window.showTab = async function(tabName) {
    await originalShowTab(tabName);

    // После загрузки HTML режима сразу применяем текст если он есть
    setTimeout(() => {
        if (window.currentOriginalText && tabName === 'parallel') {
            if (typeof window.initParallelMode === 'function') window.initParallelMode();
        } else if (window.currentOriginalText && tabName === 'match') {
            if (typeof window.loadMatchView === 'function') window.loadMatchView();
        } else if (window.currentOriginalText && tabName === 'simple') {
            if (typeof window.processTextForReader === 'function') window.processTextForReader();
        }
    }, 120);
};

// ====================== ЕДИНЫЙ ВХОД ДЛЯ ОТРИСОВКИ ======================
window.showTab = async function(tabName) {
    console.log(`🔄 showTab: ${tabName}`);

    const container = document.getElementById('content-container');
    if (!container) return;

    try {
        const response = await fetch(`/static/modes/${tabName}.html`);
        const html = await response.text();
        container.innerHTML = html;

        setTimeout(async () => {
            // После загрузки HTML сразу показываем текст из БД
            if (window.currentOriginalText) {
                await window.displayText(tabName);
            }
        }, 80);

    } catch (e) {
        console.error(e);
    }
};

// Инициализация
console.log("✅ modes.js (общий) полностью загружен");
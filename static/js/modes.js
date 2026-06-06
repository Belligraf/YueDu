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

// ====================== МЕНЮ ЧАСТИ РЕЧИ ======================
window.showPartMenu = function(x, y, idx, word) {
    // Убираем старое меню
    const old = document.getElementById('pos-context-menu');
    if (old) old.remove();

    const cfg = window.colorConfig || {};
    const posLabels = {
        'noun': '🟢 Существительное',
        'verb': '🔵 Глагол',
        'adj':  '🟠 Прилагательное',
        'adv':  '🟡 Наречие',
        'pron': '🟣 Местоимение',
        'num':  '🔷 Числительное',
        'conj': '🌿 Союз',
        'prep': '🌸 Предлог',
        'intj': '🔶 Междометие',
        'part': '💜 Частица',
        'unknown': '⬜ Сбросить'
    };

    const menu = document.createElement('div');
    menu.id = 'pos-context-menu';
    menu.style.cssText = `position:fixed;left:${x}px;top:${y}px;background:white;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,0.2);z-index:99999;min-width:200px;padding:6px 0;border:1px solid #e5e7eb;`;

    const header = document.createElement('div');
    header.style.cssText = 'padding:8px 14px;font-weight:700;font-size:1.1em;border-bottom:1px solid #f3f4f6;color:#374151;';
    header.textContent = `"${word}"`;
    menu.appendChild(header);

    Object.entries(posLabels).forEach(([pos, label]) => {
        const item = document.createElement('div');
        const color = (pos !== 'unknown' && cfg.posColors?.[pos]) ? cfg.posColors[pos] : 'transparent';
        const isCurrent = window.currentWordsPos?.[idx] === pos;
        item.style.cssText = `padding:8px 14px;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:0.95em;${isCurrent ? 'font-weight:700;' : ''}`;
        item.innerHTML = `<span style="display:inline-block;width:14px;height:14px;background:${color};border-radius:3px;border:1px solid #ccc;flex-shrink:0;"></span>${label}${isCurrent ? ' ✓' : ''}`;
        item.onmouseenter = () => item.style.background = '#f3f4f6';
        item.onmouseleave = () => item.style.background = '';
        item.onclick = () => {
            menu.remove();
            window.applyPosToWord(idx, pos);
        };
        menu.appendChild(item);
    });

    // Не вылезать за экран
    document.body.appendChild(menu);
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) menu.style.left = (x - rect.width) + 'px';
    if (rect.bottom > window.innerHeight) menu.style.top = (y - rect.height) + 'px';

    // Закрыть по клику снаружи
    setTimeout(() => {
        document.addEventListener('click', function closeMenu() {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        }, { once: true });
    }, 0);
};

// Применить часть речи к слову и сохранить в БД
window.applyPosToWord = async function(idx, pos) {
    if (!window.currentWordsPos) window.currentWordsPos = [];
    if (pos === 'unknown') {
        delete window.currentWordsPos[idx];
    } else {
        window.currentWordsPos[idx] = pos;
    }

    // Применяем цвет визуально
    document.querySelectorAll(`.chinese-word[data-idx="${idx}"]`).forEach(span => {
        const cfg = window.colorConfig || {};
        const isLinked = window.currentMatches?.[idx]?.length > 0;
        if (pos !== 'unknown' && cfg.posColors?.[pos]) {
            span.style.backgroundColor = cfg.posColors[pos];
            if (isLinked) span.style.borderBottom = `2px solid ${cfg.linkedBorder || '#10b981'}`;
        } else {
            span.style.backgroundColor = isLinked ? (cfg.linked || '#a7f3d0') : '';
            span.style.borderBottom = isLinked ? `2px solid ${cfg.linkedBorder || '#10b981'}` : '';
        }
    });

    // Перекрашиваем связанные русские слова
    if (window.highlightLinkedWords) window.highlightLinkedWords();

    // Сохраняем в БД
    if (!window.currentEditId) return;

    try {
        let wordId = window.currentWordsIds?.[idx];

        // Если wordId нет — сначала сохраняем все слова/связи в БД, потом перезагружаем ID
        if (!wordId) {
            console.log("⚠️ wordId не найден, сначала сохраняем слова в БД...");
            if (window.saveAllLinksToDB) await window.saveAllLinksToDB();
            if (window.loadMatchesFromDB) await window.loadMatchesFromDB();
            wordId = window.currentWordsIds?.[idx];
        }

        if (!wordId) {
            console.warn(`Не удалось получить wordId для idx=${idx}`);
            return;
        }

        await fetch(`/api/library/words/${wordId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ part_of_speech: pos === 'unknown' ? null : pos })
        });
        console.log(`✅ POS сохранён: слово idx=${idx} wordId=${wordId} → ${pos}`);
    } catch (e) {
        console.error("Ошибка сохранения POS:", e);
    }
};
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

    await new Promise(r => setTimeout(r, 100)); // даём HTML загрузиться

    if (tabName === 'match') {
        // loadMatchView сам вызывает formatAllText и навешивает обработчики
        if (typeof window.loadMatchView === 'function') await window.loadMatchView();
    } else if (tabName === 'parallel') {
        document.getElementById('parallel-input-section')?.classList.add('hidden');
        document.getElementById('parallel-reading-section')?.classList.remove('hidden');
        if (typeof window.renderParallelReadingView === 'function') window.renderParallelReadingView();
    } else if (tabName === 'simple') {
        if (typeof window.processTextForReader === 'function') window.processTextForReader();
    } else {
        if (window.currentOriginalText && window.currentOriginalText.trim() !== '') {
            window.formatAllText();
        }
    }

    console.log(`✅ ${tabName} полностью загружен с нормальным текстом`);
};

// Инициализация
console.log("✅ modes.js (общий) полностью загружен");

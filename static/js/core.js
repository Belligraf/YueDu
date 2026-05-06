console.log("✅ core.js загружен");

// Глобальные переменные
window.isBlurred = true;
window.currentOriginalText = '';
window.currentTranslationText = '';
window.currentEditId = null;
window.currentWordsArray = [];
window.currentTransArray = [];
window.currentMatches = {};
window.currentSegmentedWords = [];
window.loadMatches = window.loadMatchesFromDB;



// ========== РАЗБИВКА КИТАЙСКОГО ТЕКСТА (совместимость) ==========
window.splitChineseText = function(text) {
    if (!text) return [];
    // Просто разбиваем на символы для совместимости, но лучше использовать jieba
    return text.split('');
};

// ========== СОХРАНЕНИЕ ФОРМАТИРОВАНИЯ ==========
window.renderWithSegmentation = function(container, text, segmentedWords) {
    if (!container || !text) return;

    container.innerHTML = '';
    container.style.whiteSpace = 'pre-wrap';
    container.style.wordBreak = 'break-word';
    container.style.lineHeight = '1.8';
    container.style.fontSize = '1.25rem';

    if (!segmentedWords || segmentedWords.length === 0) {
        // Если нет сегментации, отображаем с сохранением пробелов и переносов
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (i > 0) {
                const br = document.createElement('br');
                container.appendChild(br);
            }
            const lineSpan = document.createElement('span');
            lineSpan.style.whiteSpace = 'pre-wrap';
            lineSpan.textContent = lines[i];
            container.appendChild(lineSpan);
        }
        return;
    }

    let wordIndex = 0;
    let lastWasNewline = false;

    for (let i = 0; i < segmentedWords.length; i++) {
        const token = segmentedWords[i];
        const span = document.createElement('span');

        const isChinese = /[\u4e00-\u9fff]/.test(token);
        const isNewline = token === '\n';
        const isSpace = token === ' ' || token === '\t';

        if (isNewline) {
            // Перенос строки
            const br = document.createElement('br');
            container.appendChild(br);
            lastWasNewline = true;
            continue;
        } else if (isSpace) {
            // Пробел
            span.innerHTML = '&nbsp;';
            span.style.display = 'inline';
            span.style.width = '4px';
            lastWasNewline = false;
        } else if (isChinese) {
            // Китайское слово
            span.textContent = token;
            span.className = 'chinese-word';
            span.setAttribute('data-word-idx', wordIndex);
            span.style.display = 'inline';
            span.style.cursor = 'pointer';
            span.style.padding = '2px 4px';
            span.style.margin = '0 1px';
            span.style.borderRadius = '6px';
            span.style.transition = 'all 0.2s ease';

            span.onclick = (function(w, idx) {
                return function() { window.showWordTranslations(w, idx); };
            })(token, wordIndex);

            span.onmouseenter = (function(idx) {
                return function() {
                    const matchedTrans = window.currentMatches[idx];
                    if (matchedTrans && matchedTrans.length > 0) {
                        window.highlightTranslationByIndex(matchedTrans[0]);
                    }
                };
            })(wordIndex);

            span.onmouseleave = function() {
                window.clearTranslationHighlight();
            };

            wordIndex++;
            lastWasNewline = false;
        } else {
            // Пунктуация или другие символы
            span.textContent = token;
            span.style.display = 'inline';
            span.style.color = '#666';
            lastWasNewline = false;
        }

        if (!isNewline) {
            container.appendChild(span);
        }
    }

    // Сохраняем массив китайских слов для сопоставлений
    window.currentWordsArray = [];
    const allSpans = container.querySelectorAll('.chinese-word');
    allSpans.forEach(span => {
        window.currentWordsArray.push(span.textContent);
    });

    console.log(`✅ Отрисовано ${window.currentWordsArray.length} китайских слов`);
};

// Подсветка сопоставленных слов
window.highlightMatchedWords = function() {
    const orig = document.getElementById('original-text');
    if (!orig) return;

    let idx = 0;
    const words = orig.querySelectorAll('.chinese-word');

    words.forEach(word => {
        if (window.currentMatches && window.currentMatches[idx] && window.currentMatches[idx].length) {
            word.classList.add('matched');
            word.style.backgroundColor = '#d1fae5';
            word.style.borderBottom = '2px solid #10b981';
        } else {
            word.classList.remove('matched');
            word.style.backgroundColor = '';
            word.style.borderBottom = '';
        }
        idx++;
    });
};

// Подсветка перевода при наведении
window.highlightTranslationByIndex = function(transIndex) {
    const transDiv = document.getElementById('translation-text');
    if (!transDiv) return;

    const transSpans = transDiv.querySelectorAll('.trans-phrase');
    transSpans.forEach((span, idx) => {
        if (idx === transIndex) {
            span.classList.add('highlight');
            span.style.backgroundColor = '#fef08a';
            span.style.fontWeight = 'bold';
            span.style.transform = 'scale(1.02)';
        }
    });
};

window.clearTranslationHighlight = function() {
    const transDiv = document.getElementById('translation-text');
    if (!transDiv) return;

    const transSpans = transDiv.querySelectorAll('.trans-phrase');
    transSpans.forEach(span => {
        span.classList.remove('highlight');
        span.style.backgroundColor = '';
        span.style.fontWeight = '';
        span.style.transform = '';
    });
};

window.escapeHtml = function(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};


window.posColors = {
    'noun': '#c5e0b4',      // существительное
    'verb': '#bdd7ee',      // глагол
    'adj': '#f7c6c6',       // прилагательное
    'adv': '#ffd966',       // наречие
    'pron': '#d5a6bd',      // местоимение
    'num': '#c5d9f1',       // числительное
    'conj': '#e2efda',      // союз
    'prep': '#fde9a0',      // предлог
    'intj': '#f9cb9c',      // междометие
    'part': '#e6c3c3',      // частица
    'unknown': 'transparent'
};

window.applyPosHighlight = function(element, posTag) {
    if (!element) return;
    // Убираем старые pos-классы
    element.classList.forEach(cls => {
        if (cls.startsWith('pos-')) element.classList.remove(cls);
    });
    // Убираем inline background, если он был
    if (posTag === 'unknown' || !posTag || !window.posColors[posTag]) {
        element.style.backgroundColor = '';
        return;
    }
    element.style.backgroundColor = window.posColors[posTag];
    element.classList.add(`pos-${posTag}`);
};
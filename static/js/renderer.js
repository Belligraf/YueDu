console.log("✅ renderer.js — с поддержкой russian-word");

const CONTAINER_STYLE = `
    white-space: pre-wrap !important;
    word-break: break-word !important;
    overflow-wrap: break-word !important;
    line-height: 1.7 !important;
    font-size: 1.32rem;
    padding: 20px;
    background: white;
    border-radius: 16px;
    min-height: 420px;
    max-width: 100%;
    overflow-x: auto;
    letter-spacing: normal;
    display: block;
`;

// ── Китайский текст ──────────────────────────────────────────────
window.displayChineseText = function(containerId, text) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.style.cssText = CONTAINER_STYLE;
    if (!text) { container.innerHTML = 'Текст отсутствует'; return; }

    let chIdx = 0;
    let html = '';
    for (const char of text) {
        if (/[\u4e00-\u9fff]/.test(char)) {
            const idx = chIdx++;
            html += `<span class="chinese-word" data-idx="${idx}" onclick="window.showTranslationFromDictionary('${char}',event);event.stopImmediatePropagation();" oncontextmenu="event.preventDefault();if(window.showPartMenu)window.showPartMenu(event.clientX,event.clientY,${idx},'${char}');">${char}</span>`;
        } else if (char === '\n') {
            html += '<br>';
        } else if (char === ' ') {
            html += '&nbsp;';
        } else {
            html += char;
        }
    }
    container.innerHTML = html;
};

// ── Русский текст — разбивает на russian-word spans ──────────────
window.displayRussianText = function(containerId, text) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.style.cssText = CONTAINER_STYLE;
    if (!text) { container.innerHTML = 'Текст отсутствует'; return; }

    let ruIdx = 0;
    let html = '';
    let wordBuf = '';

    const flushWord = () => {
        if (!wordBuf) return;
        html += `<span class="russian-word" data-idx="${ruIdx++}">${wordBuf}</span>`;
        wordBuf = '';
    };

    for (const char of text) {
        if (/[а-яА-ЯёЁa-zA-Z0-9]/.test(char)) {
            wordBuf += char;
        } else {
            flushWord();
            if (char === '\n') html += '<br>';
            else if (char === ' ') html += '<span style="display:inline"> </span>';
            else html += `<span style="color:#666;display:inline">${char}</span>`;
        }
    }
    flushWord();

    container.innerHTML = html;
};

// ── Универсальный вызов (определяет сторону по флагу) ────────────
window.displayExactText = function(containerId, text, isChineseSide = true) {
    if (isChineseSide) {
        window.displayChineseText(containerId, text);
    } else {
        window.displayRussianText(containerId, text);
    }
};

window.formatAllText = function() {
    console.log("🔄 formatAllText");
    window.displayChineseText('match-original',             window.currentOriginalText);
    window.displayChineseText('parallel-original-reading',  window.currentOriginalText);
    window.displayChineseText('reader-content',             window.currentOriginalText);
    window.displayRussianText('parallel-translation-reading', window.currentTranslationText);
    window.displayRussianText('match-translation',          window.currentTranslationText);
};

window.formatCurrentText = window.formatAllText;
console.log("✅ renderer.js готов");

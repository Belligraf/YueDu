console.log("✅ renderer.js — ФИНАЛЬНЫЙ ГОРИЗОНТАЛЬНЫЙ ВАРИАНТ (как в БД)");

window.displayExactText = function(containerId, text, isChineseSide = true) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.style.cssText = `
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

    if (!text) {
        container.innerHTML = "Текст отсутствует";
        return;
    }

    let chIdx = 0;
    let html = '';
    for (let char of text) {
        if (/[\u4e00-\u9fff]/.test(char)) {
            const idx = chIdx++;
            html += `<span class="chinese-word" data-idx="${idx}" onclick="window.showTranslationFromDictionary('${char}', event); event.stopImmediatePropagation();" oncontextmenu="event.preventDefault(); if(window.showPartMenu) window.showPartMenu(event.clientX, event.clientY, ${idx}, '${char}');">${char}</span>`;
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

window.formatAllText = function() {
    console.log("🔄 formatAllText — принудительно как в БД");
    window.displayExactText('match-original', window.currentOriginalText, true);
    window.displayExactText('parallel-original-reading', window.currentOriginalText, true);
    window.displayExactText('reader-content', window.currentOriginalText, true);
    window.displayExactText('parallel-translation-reading', window.currentTranslationText, false);
    window.displayExactText('match-translation', window.currentTranslationText, false);
};

window.formatCurrentText = window.formatAllText;
console.log("✅ renderer.js готов — текст теперь горизонтальный");

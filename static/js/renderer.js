console.log("✅ renderer.js — УПРОЩЁННАЯ УНИВЕРСАЛЬНАЯ ОТРИСОВКА (сохраняет формат из БД)");

// ====================== ГЛАВНАЯ ФУНКЦИЯ ======================
window.displayText = function(mode = 'parallel') {
    console.log(`📺 displayText → режим ${mode}`);

    const origText = window.currentOriginalText || '';
    const transText = window.currentTranslationText || '';

    if (!origText) {
        console.warn("⚠️ Нет currentOriginalText");
        return;
    }

    if (mode === 'parallel') {
        // === ПАРАЛЛЕЛЬНЫЙ РИДЕР ===
        const origContainer = document.getElementById('parallel-original-reading');
        const transContainer = document.getElementById('parallel-translation-reading');

        if (origContainer) renderPreserveFormat(origContainer, origText, true);   // китайский + клики
        if (transContainer) renderPreserveFormat(transContainer, transText, false); // русский

    } else if (mode === 'match') {
        const origContainer = document.getElementById('match-original');
        const transContainer = document.getElementById('match-translation');
        if (origContainer) renderPreserveFormat(origContainer, origText, true);
        if (transContainer) renderPreserveFormat(transContainer, transText, false);

    } else if (mode === 'simple') {
        const container = document.getElementById('reader-content');
        if (container) renderPreserveFormat(container, origText, true);
    }

    console.log("✅ Текст успешно отображён с сохранением оригинального форматирования");
};


// ====================== САМАЯ НАДЁЖНАЯ ФУНКЦИЯ ОТРИСОВКИ ======================
function renderPreserveFormat(container, fullText, isChinese = true) {
    if (!container) return;

    container.innerHTML = '';

    // Самое важное — сохраняем ВСЁ форматирование из БД
    container.style.whiteSpace = 'pre-wrap';
    container.style.wordBreak = 'break-word';
    container.style.lineHeight = '1.9';
    container.style.fontSize = isChinese ? '1.3rem' : '1.15rem';
    container.style.padding = '28px';
    container.style.backgroundColor = '#ffffff';
    container.style.borderRadius = '16px';
    container.style.boxShadow = '0 10px 15px -3px rgb(0 0 0 / 0.1)';

    if (!fullText) return;

    // Разбиваем по строкам, сохраняя все \n
    const lines = fullText.split('\n');

    lines.forEach((line, lineIndex) => {
        if (lineIndex > 0) {
            const br = document.createElement('br');
            container.appendChild(br);
        }

        if (isChinese) {
            // Для китайского — оборачиваем каждое иероглиф в span (чтобы клик работал)
            let html = '';
            for (let char of line) {
                if (/[\u4e00-\u9fff]/.test(char)) {
                    html += `<span class="chinese-word" style="display:inline; margin:0 1px; padding:2px 4px; cursor:pointer;" onclick="window.showTranslationFromDictionary('${char}')">${char}</span>`;
                } else {
                    html += char === ' ' ? '&nbsp;' : char;
                }
            }
            const tempDiv = document.createElement('span');
            tempDiv.innerHTML = html;
            container.appendChild(tempDiv);
        }
        else {
            // Для русского — просто вставляем текст (можно кликать по словам позже)
            const span = document.createElement('span');
            span.textContent = line;
            container.appendChild(span);
        }
    });
}

console.log("✅ renderer.js готов — теперь формат из БД сохраняется 100%");
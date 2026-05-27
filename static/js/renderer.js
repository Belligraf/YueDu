console.log("✅ renderer.js загружен — общие функции отрисовки");

// ======================================================
// ОБЩИЕ ФУНКЦИИ ОТРИСОВКИ ТЕКСТА
// Используются в parallel.js и matches.js
// ======================================================

/**
 * Отрисовывает китайский текст
 */
window.renderChineseText = function(container, segmentedWords, options = {}) {
    if (!container) return;
    container.innerHTML = '';
    container.style.whiteSpace = 'pre-wrap';
    container.style.lineHeight = '1.8';
    container.style.fontSize = '1.25rem';

    const {
        onWordClick = null,
        onRightClick = null,
        highlightLinked = true
    } = options;

    let wordIndex = 0;

    (segmentedWords || []).forEach(token => {
        if (/[\u4e00-\u9fff]/.test(token)) {
            const span = document.createElement('span');
            span.textContent = token;
            span.className = 'chinese-word';
            span.style.cssText = 'display:inline; margin:0; padding:2px 3px; cursor:pointer;';
            span.setAttribute('data-idx', wordIndex);

            if (onWordClick) {
                span.onclick = (e) => {
                    e.stopPropagation();
                    onWordClick(token, wordIndex, span, e);
                };
            }

            if (onRightClick) {
                span.oncontextmenu = (e) => {
                    e.preventDefault();
                    onRightClick(e, wordIndex, token);
                };
            }

            // Hover подсветка связанных русских слов
            if (highlightLinked) {
                span.onmouseenter = () => {
                    if (window.currentMatches?.[wordIndex]) {
                        const linked = window.currentMatches[wordIndex];
                        document.querySelectorAll('.russian-word').forEach(ru => {
                            if (linked.includes(parseInt(ru.getAttribute('data-idx')))) {
                                ru.classList.add('temp-highlight');
                            }
                        });
                    }
                };
                span.onmouseleave = () => {
                    document.querySelectorAll('.russian-word').forEach(ru =>
                        ru.classList.remove('temp-highlight')
                    );
                };
            }

            container.appendChild(span);
            wordIndex++;
        } else if (token === '\n') {
            container.appendChild(document.createElement('br'));
        } else {
            const span = document.createElement('span');
            span.textContent = token;
            span.style.display = 'inline';
            container.appendChild(span);
        }
    });

    window.currentWordsArray = segmentedWords?.filter(w => /[\u4e00-\u9fff]/.test(w)) || [];
};

/**
 * Отрисовывает русский текст
 */
window.renderRussianText = function(container, translationText, options = {}) {
    if (!container || !translationText) return;
    container.innerHTML = '';
    container.style.whiteSpace = 'pre-wrap';
    container.style.lineHeight = '1.8';

    const {
        onWordClick = null,
        highlightLinked = true
    } = options;

    let wordIndex = 0;
    let currentWord = '';
    window.currentTransArray = [];

    for (let i = 0; i < translationText.length; i++) {
        const char = translationText[i];

        if (/[а-яА-Яa-zA-Z0-9]/.test(char)) {
            currentWord += char;
        } else {
            if (currentWord) {
                const span = document.createElement('span');
                span.textContent = currentWord;
                span.className = 'russian-word';
                span.style.cssText = 'display:inline; margin:0; padding:2px 2px; cursor:pointer;';
                span.setAttribute('data-idx', wordIndex);
                window.currentTransArray[wordIndex] = currentWord;

                if (onWordClick) {
                    span.onclick = (e) => {
                        e.stopPropagation();
                        onWordClick(currentWord, wordIndex, span, e);
                    };
                }

                if (highlightLinked) {
                    span.onmouseenter = () => {
                        if (window.currentMatches) {
                            Object.entries(window.currentMatches).forEach(([chIdx, ruIds]) => {
                                if (ruIds.includes(wordIndex)) {
                                    const ch = document.querySelector(`.chinese-word[data-idx='${chIdx}']`);
                                    if (ch) ch.classList.add('temp-highlight');
                                }
                            });
                        }
                    };
                    span.onmouseleave = () => {
                        document.querySelectorAll('.chinese-word').forEach(ch =>
                            ch.classList.remove('temp-highlight')
                        );
                    };
                }

                container.appendChild(span);
                wordIndex++;
                currentWord = '';
            }

            if (char === ' ') {
                const s = document.createElement('span');
                s.innerHTML = '&nbsp;';
                container.appendChild(s);
            } else if (char === '\n') {
                container.appendChild(document.createElement('br'));
            } else {
                const p = document.createElement('span');
                p.textContent = char;
                p.style.color = '#666';
                container.appendChild(p);
            }
        }
    }

    if (currentWord) {
        const span = document.createElement('span');
        span.textContent = currentWord;
        span.className = 'russian-word';
        span.setAttribute('data-idx', wordIndex);
        container.appendChild(span);
    }
};

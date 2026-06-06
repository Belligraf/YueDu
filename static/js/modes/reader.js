console.log("✅ simple-mode.js загружен (простой ридер)");

// ====================== ПРОСТОЙ РЕЖИМ — РИДЕР ======================
window.processText = async function() {
    const input = document.getElementById('inputText');
    const resultDiv = document.getElementById('result');

    if (!input || !resultDiv) return;

    const text = input.value.trim();
    if (!text) {
        alert('Введите китайский текст');
        return;
    }

    window.currentOriginalText = text;
    window.currentTranslationText = document.getElementById('inputTranslation')?.value.trim() || '';

    try {
        const response = await fetch('/api/segment/segment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text })
        });

        const data = await response.json();
        window.currentSegmentedWords = data.words || [];
    } catch (err) {
        console.error("Ошибка сегментации:", err);
        window.currentSegmentedWords = text.split('');
    }

    // === КРАСИВАЯ ОТРИСОВКА С КЛИКАМИ ===
    resultDiv.innerHTML = window.currentSegmentedWords
        .map(token => {
            if (/[\u4e00-\u9fff]/.test(token)) {
                return `<span class="chinese-word inline-block px-2 py-1 mx-0.5 my-1 rounded-lg bg-white border border-gray-200 hover:bg-blue-50 cursor-pointer transition-all"
                            onclick="window.showTranslationFromDictionary('${token}')">
                            ${token}
                        </span>`;
            }
            else if (token === '\n') {
                return '<br><br>';
            }
            else {
                return token;
            }
        })
        .join('');

    console.log("✅ Ридер: текст разбит и готов к чтению");
};

window.processTextForReader = function() {
    const contentDiv = document.getElementById('reader-content');
    if (!contentDiv) return;

    if (window.currentOriginalText && window.currentOriginalText.trim() !== '') {
        // Используем единый точный рендерер как в Parallel и Match
        window.displayExactText('reader-content', window.currentOriginalText, true);
    } else {
        contentDiv.innerHTML = '';
    }
};

// ========== ПОКАЗ ПЕРЕВОДА (простой попап) ==========
window.showTranslationFromDictionary = async function(word, event = null) {
    try {
        const res = await fetch(`/api/dictionary/translate/${encodeURIComponent(word)}`);
        const data = await res.json();
        const translationText = data.translation || "Перевод не найден";
        window.showTranslationPopup(word, [translationText], false, event ? event.clientX : null, event ? event.clientY : null);
    } catch (e) {
        console.error(e);
        showSimpleTranslationPopup(word, "Ошибка при получении перевода");
    }
};

// Простой и надёжный попап
function showSimpleTranslationPopup(word, translation) {
    const oldPopup = document.getElementById('simple-popup');
    if (oldPopup) oldPopup.remove();

    const popup = document.createElement('div');
    popup.id = 'simple-popup';
    popup.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    `;

    popup.innerHTML = `
        <div style="background: white; border-radius: 16px; padding: 24px; max-width: 420px; width: 90%; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
            <div style="font-size: 22px; font-weight: 700; margin-bottom: 12px; color: #1f2937;">
                ${word}
            </div>
            <div style="font-size: 16px; color: #374151; line-height: 1.6; white-space: pre-wrap;">
                ${translation}
            </div>
            <div style="margin-top: 20px; text-align: right;">
                <button onclick="document.getElementById('simple-popup').remove()"
                        style="background: #3b82f6; color: white; border: none; padding: 8px 20px; border-radius: 8px; cursor: pointer;">
                    Закрыть
                </button>
            </div>
        </div>
    `;

    popup.onclick = function(e) {
        if (e.target === popup) popup.remove();
    };
    document.body.appendChild(popup);
}

console.log("✅ simple-mode.js полностью загружен");
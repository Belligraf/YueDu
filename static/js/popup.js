console.log("✅ popup.js — всплывающий рядом со словом (финал)");

window.showTranslationPopup = function(word, translations = [], fromMatches = false, clientX = null, clientY = null) {
    console.log("📖 Попап для:", word);

    let old = document.getElementById('popup');
    if (old) old.remove();

    const popup = document.createElement('div');
    popup.id = 'popup';
    popup.style.cssText = `
        position: fixed !important;
        background: white;
        border-radius: 14px;
        box-shadow: 0 20px 50px -12px rgba(0,0,0,0.55);
        z-index: 2147483647 !important;
        width: 340px;
        max-height: 520px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        border: 1px solid #cbd5e1;
    `;

    let content = translations && translations.length ?
        translations.map(t => `
            <div style="margin-bottom:16px; padding:15px; background:#f8fafc; border-radius:10px; font-size:16px; line-height:1.6; white-space:pre-wrap;">
                ${t.replace(/\n/g, '<br>')}
            </div>
        `).join('') :
        `<div style="padding:50px 20px; text-align:center; color:#ef4444;">Перевод не найден</div>`;

    popup.innerHTML = `
        <div style="padding:14px 18px; background:#f1f5f9; border-bottom:1px solid #e2e8f0; font-size:20px; font-weight:700; display:flex; justify-content:space-between; align-items:center;">
            ${word}
            <span onclick="window.closePopup()" style="cursor:pointer; font-size:30px; color:#64748b;">×</span>
        </div>
        <div style="flex:1; padding:18px; overflow-y:auto; max-height:420px; font-size:16px; line-height:1.65;">
            ${content}
        </div>
    `;

    document.body.appendChild(popup);

    // Позиционирование рядом с кликом
    const width = 340;
    let x = clientX ? clientX + 15 : window.innerWidth / 2 - width/2;
    let y = clientY ? clientY + 10 : window.innerHeight / 2 - 200;

    // Не вылезать за экран
    if (x + width > window.innerWidth) x = window.innerWidth - width - 20;
    if (y + 500 > window.innerHeight) y = window.innerHeight - 520;
    if (x < 10) x = 10;
    if (y < 10) y = 10;

    popup.style.left = x + 'px';
    popup.style.top = y + 'px';
};

window.closePopup = function() {
    const p = document.getElementById('popup');
    if (p) p.remove();
};

document.addEventListener('keydown', e => { if (e.key === "Escape") window.closePopup(); });
document.addEventListener('click', e => {
    const p = document.getElementById('popup');
    if (p && e.target === p) window.closePopup();
});
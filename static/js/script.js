console.log("✅ script.js загружен успешно");

async function processText() {
    console.log("🟡 Функция processText вызвана");
    const input = document.getElementById('inputText');
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    try {
        const response = await fetch('/segment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text })
        });
        const data = await response.json();
        renderWords(data.words);
    } catch (err) {
        console.error("Ошибка сегментации:", err);
    }
}

function renderWords(words) {
    const div = document.getElementById('result');
    div.innerHTML = '';
    words.forEach(w => {
        const s = document.createElement('span');
        s.textContent = w + " ";
        s.className = "cursor-pointer hover:bg-yellow-200 px-1 rounded transition-colors";
        s.onclick = () => showTranslation(w);
        div.appendChild(s);
    });
}

async function showTranslation(word) {
    console.log("🔍 Перевод слова:", word);
    try {
        const res = await fetch(`/translate/${encodeURIComponent(word)}`);
        const data = await res.json();

        document.getElementById('popupWord').textContent = word;
        document.getElementById('popupPinyin').textContent = data.pinyin || '';

        // Ключевое исправление для HTML тегов
        document.getElementById('popupTranslation').innerHTML = data.translation || 'Перевод не найден';

        document.getElementById('popup').classList.remove('hidden');
    } catch (err) {
        console.error("Ошибка перевода:", err);
    }
}

function closePopup() {
    document.getElementById('popup').classList.add('hidden');
}
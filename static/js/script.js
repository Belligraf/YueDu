async function processText() {
    const text = document.getElementById('inputText').value.trim();
    if (!text) return;

    const res = await fetch('/segment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
    });
    const data = await res.json();

    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '';

    data.words.forEach(word => {
        if (word.trim() === '') return;

        const span = document.createElement('span');
        span.textContent = word + ' ';
        span.className = 'cursor-pointer hover:bg-yellow-200 px-1 rounded transition-colors';
        span.onclick = () => showTranslation(word);
        resultDiv.appendChild(span);
    });
}

async function showTranslation(word) {
    const res = await fetch(`/translate/${encodeURIComponent(word)}`);
    const data = await res.json();

    document.getElementById('popupWord').textContent = word;
    document.getElementById('popupPinyin').textContent = data.pinyin || '';
    document.getElementById('popupTranslation').textContent = data.translation || 'Нет перевода';

    document.getElementById('popup').classList.remove('hidden');
}

function closePopup() {
    document.getElementById('popup').classList.add('hidden');
}
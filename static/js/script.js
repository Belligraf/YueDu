async function showTranslation(word) {
    const res = await fetch(`/translate/${encodeURIComponent(word)}`);
    const data = await res.json();

    document.getElementById('popupWord').textContent = word;
    document.getElementById('popupPinyin').textContent = data.pinyin || '';

    // ВНИМАНИЕ: Здесь должно быть .innerHTML
    // Если здесь написано .textContent, браузер просто напечатает теги <b> как текст
    document.getElementById('popupTranslation').innerHTML = data.translation || 'Нет перевода';

    document.getElementById('popup').classList.remove('hidden');
}
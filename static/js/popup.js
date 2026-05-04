console.log("✅ popup.js загружен");

// Глобальная функция показа попапа
window.showTranslationPopup = function(word, translations = [], fromMatches = false) {
  console.log("📖 Показ попапа для:", word);

  const popup = document.getElementById('popup');
  const popupWord = document.getElementById('popupWord');
  const popupTranslation = document.getElementById('popupTranslation');

  if (!popup) {
    console.error("Popup element not found");
    return;
  }

  if (popupWord) popupWord.textContent = word;

  if (popupTranslation) {
    if (translations && translations.length > 0) {
      popupTranslation.innerHTML = translations.map(t => `• ${t}`).join('<br>');
      if (fromMatches) {
        popupTranslation.innerHTML += '<br><br><span class="text-green-500 text-sm">✓ Из ваших сопоставлений</span>';
      }
    } else {
      popupTranslation.innerHTML = `
        <div class="text-red-500 font-bold">❌ Перевод не найден</div>
        <br>
        <div class="text-gray-700">💡 <strong>Как добавить перевод:</strong></div>
        <div class="text-gray-600 mt-2">1. Перейдите во вкладку <b class="text-purple-600">«Сопоставить слова»</b></div>
        <div class="text-gray-600">2. Нажмите на слово, которое хотите перевести</div>
        <div class="text-gray-600">3. Выберите нужные фразы перевода</div>
        <div class="text-gray-600">4. Нажмите <b>«Сохранить»</b></div>
        <div class="text-gray-600 mt-2">5. Сохраните текст, чтобы сопоставления не потерялись</div>
      `;
    }
  }

  popup.classList.remove('hidden');
};

window.closePopup = function() {
  const popup = document.getElementById('popup');
  if (popup) popup.classList.add('hidden');
};

// Закрытие по клику вне попапа
document.addEventListener('click', function(event) {
  const popup = document.getElementById('popup');
  if (!popup || popup.classList.contains('hidden')) return;

  if (event.target === popup) {
    window.closePopup();
  }
});
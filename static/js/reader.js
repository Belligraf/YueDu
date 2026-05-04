function renderParallelView(original, translation) {
    const origContainer = document.getElementById('original-view');
    const transContainer = document.getElementById('translation-view');

    // Очистка
    origContainer.innerHTML = '';
    transContainer.innerHTML = '';

    const origParts = original.split('/');
    const transParts = translation.split('/');

    origParts.forEach((part, i) => {
        const span = document.createElement('span');
        span.textContent = part.trim() + " ";
        span.onmouseenter = () => highlight(i, true);
        span.onmouseleave = () => highlight(i, false);
        origContainer.appendChild(span);
    });

    transParts.forEach((part, i) => {
        const span = document.createElement('span');
        span.textContent = part.trim() + " ";
        span.id = `ru-part-${i}`;
        span.className = "blur-sm transition-all"; // Начальное состояние - заблюрено
        transContainer.appendChild(span);
    });
}

function highlight(index, active) {
    const target = document.getElementById(`ru-part-${index}`);
    if (target) {
        if (active) {
            target.classList.remove('blur-sm');
            target.classList.add('bg-yellow-200');
        } else {
            target.classList.add('blur-sm');
            target.classList.remove('bg-yellow-200');
        }
    }
}
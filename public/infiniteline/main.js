const container = document.getElementById('main-container');
let isAnimating = false;

document.body.addEventListener('click', () => {
    if (isAnimating) return;
    isAnimating = true;

    const newLineGroup = document.createElement('div');
    newLineGroup.className = 'line-group new';
    newLineGroup.innerHTML = `
        <div class="segment left"></div>
        <div class="segment right"></div>
    `;
    container.appendChild(newLineGroup);

    newLineGroup.offsetHeight;

    newLineGroup.style.transition = 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.8s';
    newLineGroup.style.transform = 'translateY(0) scaleX(0.3333)';
    newLineGroup.style.opacity = '1';

    setTimeout(() => {
        const initialLine = container.querySelector('.line-group.initial');

        initialLine.style.transition = 'transform 1s cubic-bezier(0.6, 0, 0.4, 1), opacity 1s';
        initialLine.style.transform = 'scaleX(3)';
        initialLine.style.opacity = '0';

        newLineGroup.style.transition = 'transform 1s cubic-bezier(0.6, 0, 0.4, 1)';
        newLineGroup.style.transform = 'scaleX(1)';

        setTimeout(() => {
            initialLine.remove();
            newLineGroup.classList.remove('new');
            newLineGroup.classList.add('initial');
            newLineGroup.style.transition = 'none';

            isAnimating = false;
        }, 1000);
    }, 850);
});

// js/ui/digitalDisplay.js

// Зберігаємо стан анімації для кожного Digital Display
const digitalDisplayAnimationState = new Map(); // { id: { currentDisplayValue: 0, targetValue: 0, animationFrameId: null } }

function renderDigitalDisplay(instrumentData, addCommonInstrumentControls) {
    const { id, name, x, y, width, height, currentValue, unit, textColor, backgroundColor, font, fontSize } = instrumentData;

    const instrumentDiv = document.createElement('div');
    instrumentDiv.id = `instrument-${id}`;
    instrumentDiv.className = 'instrument digital-display-instrument';
    instrumentDiv.style.left = `${x}px`;
    instrumentDiv.style.top = `${y}px`;
    instrumentDiv.style.width = `${width}px`;
    instrumentDiv.style.height = `${height}px`;
    instrumentDiv.style.backgroundColor = backgroundColor; // Встановлюємо фон для всього інструмента
    instrumentDiv.dataset.id = id;
    instrumentDiv.dataset.type = 'DIGITAL_DISPLAY';

    // Обгортка для вмісту
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'instrument-content-wrapper';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'digital-display-content';
    contentDiv.style.color = textColor;
    // Переконайтеся, що шрифт 'Segment7' або інший вказаний шрифт завантажено через CSS @font-face
    contentDiv.style.fontFamily = `'${font}', var(--font-stack)`; // Додаємо var(--font-stack) як резервний
    contentDiv.style.fontSize = `${fontSize}px`;

    contentWrapper.appendChild(contentDiv);
    instrumentDiv.appendChild(contentWrapper);

    // Зберігаємо конфігурацію для оновлень
    // backgroundColor зберігається на instrumentDiv, тому не потрібен в config для contentDiv
    instrumentDiv.dataset.config = JSON.stringify({ unit, textColor, font, fontSize });

    // Ініціалізація стану анімації
    digitalDisplayAnimationState.set(id, {
        currentDisplayValue: currentValue,
        targetValue: currentValue,
        animationFrameId: null
    });

    // Початкове встановлення тексту (без анімації, оскільки current === target)
    updateDigitalDisplayContentText(contentDiv, currentValue, unit);

    addCommonInstrumentControls(instrumentDiv, name, instrumentData);

    return instrumentDiv;
}

function updateDigitalDisplay(instrumentDiv, newValue) {
    const contentDiv = instrumentDiv.querySelector('.digital-display-content');
    if (!contentDiv) {
        console.error("Content div not found for digital display update:", instrumentDiv.id);
        return;
    }

    const id = instrumentDiv.dataset.id;
    const state = digitalDisplayAnimationState.get(id);
    if (!state) {
        console.error("Animation state not found for digital display:", id);
        return;
    }

    state.targetValue = parseFloat(newValue) || 0;

    // Якщо анімація ще не запущена, запускаємо її
    if (state.animationFrameId === null) {
        animateDigitalDisplayValue(id, contentDiv);
    }
}

function animateDigitalDisplayValue(id, contentDiv) {
    const state = digitalDisplayAnimationState.get(id);
    if (!state) return;

    const instrumentDiv = contentDiv.closest('.instrument');
    if (!instrumentDiv || !instrumentDiv.dataset.config) {
        console.error("Config not found for animation on digital display:", id);
        if (state.animationFrameId) cancelAnimationFrame(state.animationFrameId);
        state.animationFrameId = null;
        return;
    }
    const config = JSON.parse(instrumentDiv.dataset.config);

    const easingFactor = 0.1; // Швидкість "перерахунку" числа
    const difference = state.targetValue - state.currentDisplayValue;

    // Якщо різниця мала, встановлюємо точне значення і зупиняємо анімацію
    // Поріг залежить від того, наскільки плавною має бути зупинка.
    // Для цілих чисел, 0.01 може бути достатньо, якщо ви округлюєте до цілого.
    if (Math.abs(difference) < 0.01) {
        state.currentDisplayValue = state.targetValue;
        updateDigitalDisplayContentText(contentDiv, state.currentDisplayValue, config.unit);
        if (state.animationFrameId) cancelAnimationFrame(state.animationFrameId);
        state.animationFrameId = null;
    } else {
        state.currentDisplayValue += difference * easingFactor;
        updateDigitalDisplayContentText(contentDiv, state.currentDisplayValue, config.unit);
        state.animationFrameId = requestAnimationFrame(() => animateDigitalDisplayValue(id, contentDiv));
    }
}

// Функція для форматування та встановлення тексту
function updateDigitalDisplayContentText(contentDiv, value, unit) {
    // Визначаємо, скільки знаків після коми (0 для більшості випадків, 1 або 2 для напруги, тощо)
    // Це можна зробити більш гнучким, передаючи точність у конфігурації
    let precision = 0;
    if (unit && (unit.toLowerCase() === 'v' || unit.toLowerCase() === 'a')) {
        precision = 2;
    } else if (unit && (unit.toLowerCase().includes('°'))) { // Для температур
        precision = 1;
    }
    contentDiv.textContent = `${value.toFixed(precision)} ${unit}`;
}

// Попередня функція updateDigitalDisplayContent тепер не потрібна,
// її роль виконує updateDigitalDisplayContentText
// function updateDigitalDisplayContent(contentDiv, value, unit) { /* ... */ }
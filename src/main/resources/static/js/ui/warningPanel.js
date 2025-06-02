// js/ui/warningPanel.js

// Зберігаємо стан анімації для кожного Warning Panel
const warningPanelAnimationState = new Map(); // { id: { animationFrameId: null, currentColorRgb: [r,g,b], targetColorRgb: [r,g,b] } }

function renderWarningPanel(instrumentData, addCommonInstrumentControls) {
    const { id, name, x, y, width, height, currentValue, unit, ranges } = instrumentData;

    const instrumentDiv = document.createElement('div');
    instrumentDiv.id = `instrument-${id}`;
    instrumentDiv.className = 'instrument warning-panel-instrument';
    instrumentDiv.style.left = `${x}px`;
    instrumentDiv.style.top = `${y}px`;
    instrumentDiv.style.width = `${width}px`;
    instrumentDiv.style.height = `${height}px`;
    instrumentDiv.dataset.id = id;
    instrumentDiv.dataset.type = 'WARNING_PANEL';

    // Обгортка для вмісту інструмента для кращого вирівнювання згідно з CSS
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'instrument-content-wrapper';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'warning-panel-content';

    contentWrapper.appendChild(contentDiv);
    instrumentDiv.appendChild(contentWrapper);

    // Зберігаємо діапазони та одиницю виміру в dataset для легкого доступу
    instrumentDiv.dataset.ranges = JSON.stringify(ranges || []);
    instrumentDiv.dataset.unit = unit;

    // Визначаємо початковий текст та колір на основі currentValue
    const initialDisplay = getDisplayForValue(currentValue, ranges || [], unit);
    // Конвертуємо початковий колір фону в RGB для анімації
    const initialColorRgbArray = hexToRgb(initialDisplay.backgroundColor);
    const initialRgb = initialColorRgbArray ? [...initialColorRgbArray] : [85, 85, 85]; // Default to #555 if conversion fails

    // Ініціалізуємо стан анімації для цієї панелі
    warningPanelAnimationState.set(id, {
        animationFrameId: null,
        currentColorRgb: [...initialRgb], // Поточний колір для анімації
        targetColorRgb: [...initialRgb],  // Цільовий колір (спочатку такий самий)
    });

    // Початкове встановлення тексту та кольорів
    contentDiv.textContent = initialDisplay.text;
    contentDiv.style.backgroundColor = initialDisplay.backgroundColor;
    contentDiv.style.color = getContrastingTextColor(initialDisplay.backgroundColor);

    // Додаємо загальні контрольні елементи
    addCommonInstrumentControls(instrumentDiv, name, instrumentData);

    return instrumentDiv;
}

function updateWarningPanel(instrumentDiv, newValue) {
    const contentDiv = instrumentDiv.querySelector('.warning-panel-content');
    if (!contentDiv) {
        console.error("Content div not found for warning panel update:", instrumentDiv.id);
        return;
    }

    const id = instrumentDiv.dataset.id;
    const ranges = JSON.parse(instrumentDiv.dataset.ranges);
    const unit = instrumentDiv.dataset.unit;
    const state = warningPanelAnimationState.get(id);

    if (!state) {
        console.error("Animation state not found for warning panel:", id);
        return;
    }

    // Визначаємо новий текст та цільовий колір фону
    const newDisplay = getDisplayForValue(parseFloat(newValue) || 0, ranges, unit);

    // Оновлюємо текст миттєво
    contentDiv.textContent = newDisplay.text;
    // Оновлюємо колір тексту миттєво, щоб він відповідав новому цільовому фону
    contentDiv.style.color = getContrastingTextColor(newDisplay.backgroundColor);

    // Встановлюємо новий цільовий колір фону (в RGB) для анімації
    const targetRgbArray = hexToRgb(newDisplay.backgroundColor);
    state.targetColorRgb = targetRgbArray ? [...targetRgbArray] : [85, 85, 85]; // Default to #555

    // Запускаємо анімацію зміни кольору, якщо вона ще не активна
    if (state.animationFrameId === null) {
        animateWarningPanelColor(id, contentDiv);
    }
}

// Допоміжна функція для визначення тексту та кольору на основі значення
function getDisplayForValue(value, ranges, unit) {
    let activeWarning = null;
    for (const range of ranges) {
        if (value >= range.min && value <= range.max) {
            activeWarning = range;
            break;
        }
    }

    if (activeWarning) {
        // Використовуємо toFixed(0) для цілих чисел, можна налаштувати точність
        return {
            text: `${activeWarning.message} (${value.toFixed(0)} ${unit})`,
            backgroundColor: activeWarning.color,
        };
    } else {
        return {
            text: `Value: ${value.toFixed(0)} ${unit}`,
            backgroundColor: '#555555', // Стандартний темно-сірий фон
        };
    }
}

function animateWarningPanelColor(id, contentDiv) {
    const state = warningPanelAnimationState.get(id);
    if (!state) return; // Перевірка, чи існує стан

    const easingFactor = 0.07; // Коефіцієнт плавності (0.01 - дуже плавно, 0.2 - швидко)
    let animationIsActive = false; // Прапорець, чи потрібна ще анімація

    // Анімуємо кожен компонент кольору (R, G, B)
    for (let i = 0; i < 3; i++) {
        const difference = state.targetColorRgb[i] - state.currentColorRgb[i];
        // Якщо різниця достатньо велика, продовжуємо анімацію для цього компонента
        if (Math.abs(difference) > 0.5) { // Поріг для кольорів (0-255)
            state.currentColorRgb[i] += difference * easingFactor;
            animationIsActive = true;
        } else {
            // Якщо різниця мала, встановлюємо точне цільове значення для компонента
            state.currentColorRgb[i] = state.targetColorRgb[i];
        }
    }

    // Встановлюємо новий проміжний колір фону
    contentDiv.style.backgroundColor = `rgb(${Math.round(state.currentColorRgb[0])}, ${Math.round(state.currentColorRgb[1])}, ${Math.round(state.currentColorRgb[2])})`;

    if (animationIsActive) {
        // Якщо хоча б один компонент ще анімується, продовжуємо
        state.animationFrameId = requestAnimationFrame(() => animateWarningPanelColor(id, contentDiv));
    } else {
        // Анімація завершена, встановлюємо точний кінцевий колір
        contentDiv.style.backgroundColor = `rgb(${state.targetColorRgb[0]}, ${state.targetColorRgb[1]}, ${state.targetColorRgb[2]})`;
        if (state.animationFrameId) { // Перевіряємо, чи був ID перед скасуванням
            cancelAnimationFrame(state.animationFrameId);
        }
        state.animationFrameId = null; // Скидаємо ID, позначаючи, що анімація не активна
    }
}

// Допоміжна функція для перетворення HEX-кольору в масив RGB [r, g, b]
function hexToRgb(hex) {
    if (!hex || typeof hex !== 'string' || hex.charAt(0) !== '#') {
        // console.warn("Invalid hex color provided to hexToRgb:", hex);
        return null; // Повертаємо null для некоректних значень
    }
    // Розгортаємо короткі HEX (наприклад, #F00 в #FF0000)
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : null;
}

// Допоміжна функція для отримання контрастного кольору тексту (білий або чорний)
function getContrastingTextColor(hexBgColor) {
    const rgbColor = hexToRgb(hexBgColor);
    if (!rgbColor) {
        return '#FFFFFF'; // Стандартний білий текст, якщо колір фону невалідний
    }

    const [r, g, b] = rgbColor;
    // Формула для розрахунку відносної яскравості (згідно з WCAG)
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

    // Якщо яскравість > 0.5 (або інший поріг, наприклад 0.6), фон вважається світлим,
    // тому текст має бути темним. Інакше - світлим.
    return luminance > 0.6 ? '#000000' : '#FFFFFF';
}
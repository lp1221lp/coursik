// js/ui/gauge.js
// Зберігаємо поточне значення та ID анімації для кожного індикатора
const gaugeAnimationState = new Map(); // { id: { currentDisplayValue: 0, targetValue: 0, animationFrameId: null } }

function renderGauge(instrumentData, addCommonInstrumentControls) {
    const { id, name, x, y, width, height, currentValue, unit, minValue, maxValue, dialColor, needleColor, valueTextColor, labelFont } = instrumentData;

    const instrumentDiv = document.createElement('div');
    instrumentDiv.id = `instrument-${id}`;
    instrumentDiv.className = 'instrument gauge-instrument';
    instrumentDiv.style.left = `${x}px`;
    instrumentDiv.style.top = `${y}px`;
    instrumentDiv.style.width = `${width}px`;
    instrumentDiv.style.height = `${height}px`;
    instrumentDiv.dataset.id = id;
    instrumentDiv.dataset.type = 'GAUGE';

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'instrument-content-wrapper';

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.className = 'gauge-canvas';

    contentWrapper.appendChild(canvas);
    instrumentDiv.appendChild(contentWrapper);

    const configForDataset = { minValue, maxValue, dialColor, needleColor, valueTextColor, labelFont, unit, width, height };
    instrumentDiv.dataset.config = JSON.stringify(configForDataset);

    gaugeAnimationState.set(id, {
        currentDisplayValue: currentValue,
        targetValue: currentValue,
        animationFrameId: null
    });

    drawGaugeFrame(canvas, configForDataset);
    drawNeedleAndText(canvas, currentValue, configForDataset);

    addCommonInstrumentControls(instrumentDiv, name, instrumentData);

    return instrumentDiv;
}

function updateGaugeDisplay(instrumentDiv, newValue) {
    const canvas = instrumentDiv.querySelector('.gauge-canvas');
    if (!canvas) {
        console.error("Canvas not found for gauge update:", instrumentDiv.id);
        return;
    }

    const id = instrumentDiv.dataset.id;
    const state = gaugeAnimationState.get(id);
    if (!state) {
        console.error("Animation state not found for gauge:", id);
        return;
    }

    state.targetValue = parseFloat(newValue) || 0;

    if (state.animationFrameId === null) {
        animateGauge(id, canvas);
    }
}

function animateGauge(id, canvas) {
    const state = gaugeAnimationState.get(id);
    if (!state) return;

    const instrumentDiv = canvas.closest('.instrument');
    if (!instrumentDiv || !instrumentDiv.dataset.config) {
        console.error("Config not found for animation on gauge:", id);
        if (state.animationFrameId) cancelAnimationFrame(state.animationFrameId);
        state.animationFrameId = null;
        return;
    }

    const config = JSON.parse(instrumentDiv.dataset.config);
    const easingFactor = 0.08;

    state.currentDisplayValue += (state.targetValue - state.currentDisplayValue) * easingFactor;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawGaugeFrame(canvas, config);
    drawNeedleAndText(canvas, state.currentDisplayValue, config);

    const difference = Math.abs(state.targetValue - state.currentDisplayValue);
    if (difference < 0.05) {
        state.currentDisplayValue = state.targetValue;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawGaugeFrame(canvas, config);
        drawNeedleAndText(canvas, state.currentDisplayValue, config);

        if (state.animationFrameId) {
            cancelAnimationFrame(state.animationFrameId);
        }
        state.animationFrameId = null;
    } else {
        state.animationFrameId = requestAnimationFrame(() => animateGauge(id, canvas));
    }
}

function drawGaugeFrame(canvas, config) {
    const { minValue, maxValue, dialColor, valueTextColor, labelFont, width, height } = config;
    const ctx = canvas.getContext('2d');
    const centerX = width / 2;
    const centerY = height * 0.55;
    const radius = Math.min(width, height * 0.85) / 2 * 0.9;

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI * 0.8, Math.PI * 0.2);
    ctx.lineWidth = radius * 0.2;
    ctx.strokeStyle = dialColor;
    ctx.stroke();

    const numTicks = 5;
    const angleRange = Math.PI * 1.4;
    const startAngle = Math.PI * 0.8;

    ctx.font = `${radius * 0.15}px ${labelFont}`;
    ctx.fillStyle = valueTextColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= numTicks; i++) {
        const tickValue = minValue + (maxValue - minValue) * (i / numTicks);
        const angle = startAngle + (angleRange / numTicks) * i;

        const tickX1 = centerX + Math.cos(angle) * radius * 0.92;
        const tickY1 = centerY + Math.sin(angle) * radius * 0.92;
        const tickX2 = centerX + Math.cos(angle) * radius;
        const tickY2 = centerY + Math.sin(angle) * radius;

        ctx.beginPath();
        ctx.moveTo(tickX1, tickY1);
        ctx.lineTo(tickX2, tickY2);
        ctx.strokeStyle = valueTextColor;
        ctx.lineWidth = Math.max(1, radius * 0.015);
        ctx.stroke();

        const labelRadius = radius * 0.72;
        const labelX = centerX + Math.cos(angle) * labelRadius;
        const labelY = centerY + Math.sin(angle) * labelRadius;
        ctx.fillText(Math.round(tickValue), labelX, labelY);
    }
}

function drawNeedleAndText(canvas, value, config) {
    const { minValue, maxValue, needleColor, valueTextColor, labelFont, unit, width, height } = config;
    const ctx = canvas.getContext('2d');
    const centerX = width / 2;
    const centerY = height * 0.55;
    const radius = Math.min(width, height * 0.85) / 2 * 0.9;

    const angleRange = Math.PI * 1.4;
    const startAngle = Math.PI * 0.8;

    const clampedValue = Math.max(minValue, Math.min(maxValue, value));
    const normalized = (clampedValue - minValue) / (maxValue - minValue);
    const angle = startAngle + normalized * angleRange;

    const needleLength = radius * 0.9;
    const needleX = centerX + Math.cos(angle) * needleLength;
    const needleY = centerY + Math.sin(angle) * needleLength;

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(needleX, needleY);
    ctx.strokeStyle = needleColor;
    ctx.lineWidth = radius * 0.05;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.07, 0, 2 * Math.PI);
    ctx.fillStyle = needleColor;
    ctx.fill();

    ctx.font = `${radius * 0.2}px ${labelFont}`;
    ctx.fillStyle = valueTextColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const displayText = `${Math.round(clampedValue)}${unit ? ` ${unit}` : ''}`;
    ctx.fillText(displayText, centerX, centerY + radius * 0.35);
}

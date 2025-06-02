document.addEventListener('DOMContentLoaded', () => {
    // ... (DOM елементи залишаються без змін) ...
    const dashboardPanel = document.getElementById('dashboard-panel');
    const addInstrumentBtn = document.getElementById('addInstrumentBtn');
    const instrumentModal = document.getElementById('instrumentModal');
    const closeModalBtn = instrumentModal.querySelector('.close-button');
    const instrumentForm = document.getElementById('instrumentForm');
    const instrumentTypeSelect = document.getElementById('instrumentType');

    const gaugeFields = document.getElementById('gaugeFields');
    const digitalDisplayFields = document.getElementById('digitalDisplayFields');
    const warningPanelFields = document.getElementById('warningPanelFields');
    const warningRangesContainer = document.getElementById('warningRangesContainer');
    const addWarningRangeBtn = document.getElementById('addWarningRangeBtn');

    let instrumentsMap = new Map();
    let ws;

    function connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        ws = new WebSocket(`${protocol}//${window.location.host}/ws/dashboard`);

        ws.onopen = () => console.log('WebSocket connected');

        // main.js -> ws.onmessage
        ws.onmessage = (event) => {
            try {
                console.log("WebSocket message received (raw):", event.data); // Лог сирих даних
                const message = JSON.parse(event.data);
                console.log("WebSocket message parsed:", message); // Лог розпарсеного повідомлення

                if (message.instrumentClass === 'VALUE_UPDATE') {
                    const { id, value } = message.update;
                    console.log(`VALUE_UPDATE received for id: ${id}, new value: ${value}`);

                    const instrumentDiv = document.getElementById(`instrument-${id}`);
                    if (instrumentDiv) {
                        console.log(`Found instrumentDiv for id: ${id}`);
                        const instrumentData = instrumentsMap.get(id); // ID тут має бути тим, що прийшло з WS (_id)
                        if (instrumentData) {
                            console.log(`Found instrumentData in map for id: ${id}. Old value: ${instrumentData.currentValue}`);
                            instrumentData.currentValue = value;
                            console.log(`Updated instrumentData.currentValue to: ${instrumentData.currentValue}`);

                            // Перевіряємо, що instrumentData.instrumentClass є
                            if (!instrumentData.instrumentClass) {
                                console.error("instrumentClass is missing in instrumentData from map for ID:", id, instrumentData);
                                return;
                            }

                            switch (instrumentData.instrumentClass) {
                                case 'GAUGE':
                                    console.log(`Calling updateGaugeDisplay for id: ${id}`);
                                    updateGaugeDisplay(instrumentDiv, value);
                                    break;
                                case 'DIGITAL_DISPLAY':
                                    console.log(`Calling updateDigitalDisplay for id: ${id}`);
                                    updateDigitalDisplay(instrumentDiv, value);
                                    break;
                                case 'WARNING_PANEL':
                                    console.log(`Calling updateWarningPanel for id: ${id}`);
                                    updateWarningPanel(instrumentDiv, value);
                                    break;
                                default:
                                    console.error("Unknown instrumentClass in ws.onmessage switch:", instrumentData.instrumentClass);
                            }
                        } else {
                            console.warn(`No instrumentData found in instrumentsMap for id: ${id}`);
                        }
                    } else {
                        console.warn(`No instrumentDiv found on page for id: ${id}`);
                    }
                } else if (message.instrumentClass === 'FULL_STATE') {
                    // ...
                } else {
                    console.warn("Received unknown WebSocket message type:", message);
                }
            } catch (error) {
                console.error('Error processing WebSocket message:', error);
            }
        };
        ws.onerror = (error) => console.error('WebSocket error:', error);
        ws.onclose = () => {
            console.log('WebSocket disconnected. Attempting to reconnect...');
            setTimeout(connectWebSocket, 3000);
        };
    }

    function addCommonInstrumentControls(instrumentDiv, name, instrumentData) {
        // instrumentData тут вже має поле 'id', яке є значенням _id з сервера
        const header = document.createElement('div');
        header.className = 'instrument-header';
        header.textContent = name;
        instrumentDiv.prepend(header);

        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'instrument-controls';

        const editBtn = document.createElement('button');
        editBtn.textContent = '⚙️';
        editBtn.title = 'Edit Instrument';
        editBtn.onclick = (e) => {
            e.stopPropagation();
            openModalForEdit(instrumentData.id); // Передаємо клієнтський 'id' (який є _id)
        };
        controlsDiv.appendChild(editBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑️';
        deleteBtn.title = 'Delete Instrument';
        deleteBtn.onclick = async (e) => {
            e.stopPropagation();
            if (confirm(`Are you sure you want to delete "${name}"?`)) {
                try {
                    await deleteInstrument(instrumentData.id); // Викликаємо API з клієнтським 'id'
                    instrumentDiv.remove();
                    instrumentsMap.delete(instrumentData.id);
                } catch (error) {
                    console.error('Failed to delete instrument:', error);
                    alert(`Error: ${error.message}`);
                }
            }
        };
        controlsDiv.appendChild(deleteBtn);
        instrumentDiv.appendChild(controlsDiv);
    }

    function renderInstrument(instrumentData) { // instrumentData тут вже має поле 'id'
        let instrumentDiv;
        // console.log("Rendering instrument:", instrumentData); // Закоментовано, бо вже є в loadInstruments
        if (!instrumentData || typeof instrumentData.instrumentClass === 'undefined') {
            console.error('Unknown or invalid instrument data (renderInstrument):', instrumentData);
            return null;
        }
        switch (instrumentData.instrumentClass) {
            case 'GAUGE':
                instrumentDiv = renderGauge(instrumentData, addCommonInstrumentControls);
                break;
            case 'DIGITAL_DISPLAY':
                instrumentDiv = renderDigitalDisplay(instrumentData, addCommonInstrumentControls);
                break;
            case 'WARNING_PANEL':
                instrumentDiv = renderWarningPanel(instrumentData, addCommonInstrumentControls);
                break;
            default:
                console.error('Unknown instrument class in renderInstrument:', instrumentData.instrumentClass);
                return null;
        }
        if (instrumentDiv) {
            makeDraggable(instrumentDiv);
        }
        return instrumentDiv;
    }

    async function loadInstruments() {
        try {
            const instrumentsFromServer = await fetchInstruments();
            console.log("Data received by loadInstruments (from fetchInstruments):", JSON.parse(JSON.stringify(instrumentsFromServer)));

            dashboardPanel.innerHTML = '';
            instrumentsMap.clear();

            if (Array.isArray(instrumentsFromServer)) {
                instrumentsFromServer.forEach(serverInstr => {
                    if (serverInstr && serverInstr._id) { // Перевіряємо наявність _id з сервера
                        const clientInstrumentData = { ...serverInstr };
                        clientInstrumentData.id = serverInstr._id; // Мапимо _id на id для використання на клієнті
                        // delete clientInstrumentData._id; // Опціонально: видалити _id, якщо не потрібен

                        // Узгоджуємо поле типу, яке очікує renderInstrument
                        if (!clientInstrumentData.instrumentClass && clientInstrumentData.type) {
                            clientInstrumentData.instrumentClass = clientInstrumentData.type;
                        }
                        // Можна видалити поле type, якщо воно дублює instrumentClass і не використовується
                        // delete clientInstrumentData.type;

                        instrumentsMap.set(clientInstrumentData.id, clientInstrumentData); // Зберігаємо за 'id'

                        console.log("Processing clientInstrumentData for render:", clientInstrumentData);
                        const instrumentElement = renderInstrument(clientInstrumentData); // Передаємо адаптований об'єкт

                        if (instrumentElement) {
                            dashboardPanel.appendChild(instrumentElement);
                        }
                    } else {
                        console.warn("Received invalid instrument data from server (missing _id):", serverInstr);
                    }
                });
            } else {
                console.error('fetchInstruments did not return an array:', instrumentsFromServer);
            }
        } catch (error) {
            console.error('Failed to load instruments:', error);
            dashboardPanel.innerHTML = `<p class="error">Error loading instruments: ${error.message}</p>`;
        }
    }


    function makeDraggable(element) {
        let offsetX, offsetY, isDragging = false;
        element.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.closest('.instrument-controls')) return;
            isDragging = true;
            offsetX = e.clientX - element.offsetLeft;
            offsetY = e.clientY - element.offsetTop;
            element.style.zIndex = 1000;
            e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const newX = e.clientX - offsetX;
            const newY = e.clientY - offsetY;
            const parentRect = dashboardPanel.getBoundingClientRect();
            const elemRect = element.getBoundingClientRect();
            element.style.left = `${Math.max(0, Math.min(newX, parentRect.width - elemRect.width))}px`;
            element.style.top = `${Math.max(0, Math.min(newY, parentRect.height - elemRect.height))}px`;
        });
        document.addEventListener('mouseup', async () => {
            if (!isDragging) return;
            isDragging = false;
            element.style.zIndex = '';
            const instrumentId = element.dataset.id;
            const instrumentData = instrumentsMap.get(instrumentId);
            if (instrumentData) {
                instrumentData.x = parseInt(element.style.left, 10);
                instrumentData.y = parseInt(element.style.top, 10);
                try {
                    // Зберігаємо оновлені дані, включаючи позицію
                    const fullInstrumentDataToUpdate = { ...instrumentData };
                    // Додаємо instrumentClass, якщо його немає (для PUT він потрібен)
                    if (!fullInstrumentDataToUpdate.instrumentClass) {
                        fullInstrumentDataToUpdate.instrumentClass = fullInstrumentDataToUpdate.type;
                    }
                    await updateInstrument(instrumentId, fullInstrumentDataToUpdate);
                } catch (error) {
                    console.error('Failed to update instrument position:', error);
                }
            }
        });
    }


    addInstrumentBtn.onclick = () => openModalForAdd();
    closeModalBtn.onclick = () => instrumentModal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target == instrumentModal) instrumentModal.style.display = 'none';
    };
    instrumentTypeSelect.onchange = () => updateVisibleFields(instrumentTypeSelect.value);

    function updateVisibleFields(type) {
        gaugeFields.style.display = type === 'GAUGE' ? 'block' : 'none';
        digitalDisplayFields.style.display = type === 'DIGITAL_DISPLAY' ? 'block' : 'none';
        warningPanelFields.style.display = type === 'WARNING_PANEL' ? 'block' : 'none';
    }

    function openModalForAdd() {
        document.getElementById('modalTitle').textContent = 'Add Instrument';
        instrumentForm.reset();
        document.getElementById('instrumentId').value = ''; // Для нового ID порожній
        updateVisibleFields(instrumentTypeSelect.value);
        warningRangesContainer.innerHTML = '';
        instrumentModal.style.display = 'block';
    }

    async function openModalForEdit(id) { // 'id' тут - це _id з сервера
        try {
            const instrumentFromServer = await fetchInstrument(id); // Запит з _id
            if (!instrumentFromServer) {
                alert('Instrument not found!');
                return;
            }

            // Адаптуємо дані з сервера для форми
            const instrumentToEdit = { ...instrumentFromServer };
            if (instrumentFromServer._id && typeof instrumentFromServer.id === 'undefined') {
                instrumentToEdit.id = instrumentFromServer._id; // Встановлюємо клієнтський 'id'
            }
            // Переконуємося, що instrumentClass є
            if (!instrumentToEdit.instrumentClass && instrumentToEdit.type) {
                instrumentToEdit.instrumentClass = instrumentToEdit.type;
            }


            document.getElementById('modalTitle').textContent = 'Edit Instrument';
            instrumentForm.reset();
            warningRangesContainer.innerHTML = '';

            document.getElementById('instrumentId').value = instrumentToEdit.id; // Встановлюємо КЛІЄНТСЬКИЙ 'id' у форму
            document.getElementById('instrumentName').value = instrumentToEdit.name;
            document.getElementById('instrumentType').value = instrumentToEdit.instrumentClass;
            document.getElementById('instrumentX').value = instrumentToEdit.x;
            document.getElementById('instrumentY').value = instrumentToEdit.y;
            document.getElementById('instrumentWidth').value = instrumentToEdit.width;
            document.getElementById('instrumentHeight').value = instrumentToEdit.height;
            document.getElementById('instrumentUnit').value = instrumentToEdit.unit || "";
            document.getElementById('instrumentDataSource').value = instrumentToEdit.dataSource || '';
            document.getElementById('instrumentUpdateInterval').value = instrumentToEdit.updateIntervalMs || 2000;

            updateVisibleFields(instrumentToEdit.instrumentClass);

            switch (instrumentToEdit.instrumentClass) {
                case 'GAUGE':
                    document.getElementById('gaugeMinValue').value = instrumentToEdit.minValue;
                    document.getElementById('gaugeMaxValue').value = instrumentToEdit.maxValue;
                    document.getElementById('gaugeDialColor').value = instrumentToEdit.dialColor || '#f0f0f0';
                    document.getElementById('gaugeNeedleColor').value = instrumentToEdit.needleColor || '#cc0000';
                    // Додайте інші поля, якщо вони є у формі (valueTextColor, labelFont)
                    break;
                case 'DIGITAL_DISPLAY':
                    document.getElementById('digitalTextColor').value = instrumentToEdit.textColor || '#00ff00';
                    document.getElementById('digitalBgColor').value = instrumentToEdit.backgroundColor || '#000000';
                    document.getElementById('digitalFontSize').value = instrumentToEdit.fontSize || 24;
                    break;
                case 'WARNING_PANEL':
                    (instrumentToEdit.ranges || []).forEach(range => addWarningRangeToForm(range));
                    break;
            }
            instrumentModal.style.display = 'block';
        } catch (error) {
            console.error('Failed to open edit modal:', error);
            alert(`Error: ${error.message}`);
        }
    }

    instrumentForm.onsubmit = async (event) => {
        event.preventDefault();
        const currentInstrumentIdFromForm = document.getElementById('instrumentId').value; // Це наш клієнтський 'id' (_id з сервера)
        const type = document.getElementById('instrumentType').value;

        const commonData = { /* ... ваш код збору commonData ... */ };
        commonData.name = document.getElementById('instrumentName').value;
        commonData.x = parseInt(document.getElementById('instrumentX').value);
        commonData.y = parseInt(document.getElementById('instrumentY').value);
        commonData.width = parseInt(document.getElementById('instrumentWidth').value);
        commonData.height = parseInt(document.getElementById('instrumentHeight').value);
        commonData.unit = document.getElementById('instrumentUnit').value;
        commonData.dataSource = document.getElementById('instrumentDataSource').value || null;
        commonData.updateIntervalMs = parseInt(document.getElementById('instrumentUpdateInterval').value) || null;


        let specificData = { /* ... ваш код збору specificData ... */ };
        switch (type) {
            case 'GAUGE':
                specificData = {
                    minValue: parseFloat(document.getElementById('gaugeMinValue').value),
                    maxValue: parseFloat(document.getElementById('gaugeMaxValue').value),
                    dialColor: document.getElementById('gaugeDialColor').value,
                    needleColor: document.getElementById('gaugeNeedleColor').value,
                    // Додайте valueTextColor, labelFont, якщо вони є у формі
                };
                break;
            case 'DIGITAL_DISPLAY':
                specificData = {
                    textColor: document.getElementById('digitalTextColor').value,
                    backgroundColor: document.getElementById('digitalBgColor').value,
                    fontSize: parseInt(document.getElementById('digitalFontSize').value),
                };
                break;
            case 'WARNING_PANEL':
                const ranges = [];
                document.querySelectorAll('.warning-range-item').forEach(item => {
                    ranges.push({
                        id: item.dataset.rangeId || `new_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                        min: parseFloat(item.querySelector('.range-min').value),
                        max: parseFloat(item.querySelector('.range-max').value),
                        message: item.querySelector('.range-message').value,
                        level: item.querySelector('.range-level').value,
                        color: item.querySelector('.range-color').value,
                    });
                });
                specificData = { ranges: ranges };
                break;
        }


        const instrumentDataToSend = { ...commonData, ...specificData };
        instrumentDataToSend.instrumentClass = type;

        // Визначаємо, чи це операція оновлення
        const isUpdate = currentInstrumentIdFromForm && currentInstrumentIdFromForm !== "";

        if (isUpdate) {
            // Для оновлення, сервер очікує ID в URL, а в тілі може бути ID (який мапиться на _id).
            // Наш InstrumentService->updateInstrument використовує ID з URL для фільтра,
            // і ID з тіла для даних, що оновлюються (і копіює ID з URL в результат).
            instrumentDataToSend.id = currentInstrumentIdFromForm; // Надсилаємо 'id' в тілі (який є _id)
            console.log("Data to send for UPDATE:", JSON.stringify(instrumentDataToSend, null, 2));
            try {
                await updateInstrument(currentInstrumentIdFromForm, instrumentDataToSend); // ID для URL
            } catch (error) {
                console.error('Failed to save instrument (update):', error);
                alert(`Error: ${error.message}`);
                return; // Зупиняємо подальше виконання, якщо була помилка
            }
        } else {
            // Для створення, 'id' не надсилається. Сервер згенерує _id.
            console.log("Data to send for ADD:", JSON.stringify(instrumentDataToSend, null, 2));
            try {
                await addInstrument(instrumentDataToSend);
            } catch (error) {
                console.error('Failed to save instrument (add):', error);
                alert(`Error: ${error.message}`);
                return; // Зупиняємо подальше виконання
            }
        }

        instrumentModal.style.display = 'none';
        loadInstruments(); // Перезавантажуємо інструменти після успішного збереження
    };

    // ... (addWarningRangeToForm, rangeIdCounter) ...
    addWarningRangeBtn.onclick = () => addWarningRangeToForm();
    let rangeIdCounter = 0;
    function addWarningRangeToForm(rangeData = {}) { /* ... ваш код ... */ }


    loadInstruments();
    connectWebSocket();
});
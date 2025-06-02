const API_BASE_URL = '/api/instruments'; // Ktor serves from root

async function fetchInstruments() {
    const response = await fetch(API_BASE_URL);
    if (!response.ok) throw new Error(`Failed to fetch instruments: ${response.statusText}`);
    return response.json();
}

async function fetchInstrument(id) {
    const response = await fetch(`${API_BASE_URL}/${id}`);
    if (!response.ok) throw new Error(`Failed to fetch instrument ${id}: ${response.statusText}`);
    return response.json();
}

async function addInstrument(instrumentData) {
    console.log(instrumentData)
    console.log('zalupa')
    const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(instrumentData),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to add instrument: ${response.statusText} - ${errorText}`);
    }
    return response.json();
}

async function updateInstrument(id, instrumentData) {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(instrumentData),
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update instrument: ${response.statusText} - ${errorText}`);
    }
    return response.json();
}

async function deleteInstrument(id) {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'DELETE',
    });
    if (!response.ok && response.status !== 204) { // 204 No Content is OK
        throw new Error(`Failed to delete instrument ${id}: ${response.statusText}`);
    }
    // No content for successful delete, so no response.json()
    return response.status === 204 || response.ok;
}
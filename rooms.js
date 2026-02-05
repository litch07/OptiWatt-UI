// ==========================================
// OPTIWATT ROOMS & APPLIANCES MANAGEMENT
// Complete with ALL New Features
// ==========================================

let currentRoomId = null;
let currentApplianceId = null;
let applianceTimerInterval = null;
const COST_PER_KWH = 0.15;
const ADMIN_PASSWORD = 'admin';

// ==========================================
// INITIALIZATION
// ==========================================

document.addEventListener("DOMContentLoaded", function () {
    initializeTheme();
    checkMonthlyReset();
    loadRooms();
    renderRoomsList();
    startApplianceTimers();
});

function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
        updateThemeUI(true);
    } else {
        document.documentElement.classList.remove('dark');
        updateThemeUI(false);
    }
}

function updateThemeUI(isDark) {
    const themeToggle = document.getElementById('themeToggle');
    const themeLabel = document.getElementById('themeLabel');
    if (themeToggle && themeLabel) {
        themeToggle.querySelector('.icon-size').textContent = isDark ? '☀️' : '🌙';
        themeLabel.textContent = isDark ? 'Light Mode' : 'Dark Mode';
    }
}

// ==========================================
// MONTHLY RESET HOOK
// ==========================================

function checkMonthlyReset() {
    const lastReset = localStorage.getItem('optiwatt_last_monthly_reset');
    const now = new Date();
    const currentMonth = now.getFullYear() + '-' + (now.getMonth() + 1);
    
    if (lastReset !== currentMonth) {
        const rooms = getRooms();
        rooms.forEach(room => {
            if (room.appliances) {
                room.appliances.forEach(app => {
                    app.monthlyRuntime = 0;
                });
            }
        });
        saveRooms(rooms);
        localStorage.setItem('optiwatt_last_monthly_reset', currentMonth);
        console.log('Monthly runtime reset completed');
    }
}

// ==========================================
// DATA MANAGEMENT
// ==========================================

function getRooms() {
    const saved = localStorage.getItem('optiwatt_rooms');
    return saved ? JSON.parse(saved) : [];
}

function saveRooms(rooms) {
    localStorage.setItem('optiwatt_rooms', JSON.stringify(rooms));
}

function loadRooms() {
    const rooms = getRooms();
    if (rooms.length === 0) {
        const defaultRoom = {
            id: generateId(),
            name: 'Living Room',
            microcontrollerId: 'ESP32_DEFAULT',
            trackingType: 'both',
            dailyGoal: 15.0,
            monthlyGoal: 450,
            occupied: true,
            automation: false,
            appliances: []
        };
        saveRooms([defaultRoom]);
    }
}

function generateId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ==========================================
// ROOMS LIST VIEW
// ==========================================

function renderRoomsList() {
    const grid = document.getElementById('roomsGrid');
    const rooms = getRooms();
    
    if (rooms.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-16">
                <div class="text-6xl mb-4">🏠</div>
                <h3 class="text-xl font-bold text-gray-800 dark:text-white mb-2">No rooms yet</h3>
                <p class="text-gray-600 dark:text-gray-400">Click "Add Room" to get started</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = rooms.map(room => {
        const applianceCount = room.appliances ? room.appliances.length : 0;
        const currentPower = room.appliances 
            ? room.appliances.filter(a => a.status).reduce((sum, a) => sum + (a.currentPower || 0), 0)
            : 0;
        const occupancyColor = room.occupied ? 'bg-green-500' : 'bg-red-500';
        const occupancyText = room.occupied ? 'Occupied' : 'Vacant';
        
        const simulatedDailyUsage = (currentPower / 1000) * 8;
        const simulatedMonthlyUsage = simulatedDailyUsage * 30;
        
        const dailyProgress = room.trackingType !== 'monthly' 
            ? Math.min((simulatedDailyUsage / room.dailyGoal) * 100, 100) 
            : 0;
        const monthlyProgress = room.trackingType !== 'daily'
            ? Math.min((simulatedMonthlyUsage / room.monthlyGoal) * 100, 100)
            : 0;
        
        const progressSection = room.trackingType === 'both' ? `
            <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div class="mb-3">
                    <div class="flex justify-between text-xs mb-1">
                        <span class="text-gray-600 dark:text-gray-400">Daily: ${simulatedDailyUsage.toFixed(1)}/${room.dailyGoal} kWh</span>
                        <span class="font-semibold ${dailyProgress > 90 ? 'text-red-600' : 'text-primary'}">${dailyProgress.toFixed(0)}%</span>
                    </div>
                    <div class="bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div class="h-full transition-all duration-500 ${dailyProgress > 100 ? 'bg-red-600' : 'bg-primary'}" style="width: ${dailyProgress}%"></div>
                    </div>
                </div>
                <div>
                    <div class="flex justify-between text-xs mb-1">
                        <span class="text-gray-600 dark:text-gray-400">Monthly: ${simulatedMonthlyUsage.toFixed(0)}/${room.monthlyGoal} kWh</span>
                        <span class="font-semibold ${monthlyProgress > 90 ? 'text-red-600' : 'text-secondary'}">${monthlyProgress.toFixed(0)}%</span>
                    </div>
                    <div class="bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div class="h-full transition-all duration-500 ${monthlyProgress > 100 ? 'bg-red-600' : 'bg-secondary'}" style="width: ${monthlyProgress}%"></div>
                    </div>
                </div>
            </div>
        ` : room.trackingType === 'daily' ? `
            <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div class="flex justify-between text-xs mb-1">
                    <span class="text-gray-600 dark:text-gray-400">Daily: ${simulatedDailyUsage.toFixed(1)}/${room.dailyGoal} kWh</span>
                    <span class="font-semibold ${dailyProgress > 90 ? 'text-red-600' : 'text-primary'}">${dailyProgress.toFixed(0)}%</span>
                </div>
                <div class="bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div class="h-full transition-all duration-500 ${dailyProgress > 100 ? 'bg-red-600' : 'bg-primary'}" style="width: ${dailyProgress}%"></div>
                </div>
            </div>
        ` : `
            <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div class="flex justify-between text-xs mb-1">
                    <span class="text-gray-600 dark:text-gray-400">Monthly: ${simulatedMonthlyUsage.toFixed(0)}/${room.monthlyGoal} kWh</span>
                    <span class="font-semibold ${monthlyProgress > 90 ? 'text-red-600' : 'text-secondary'}">${monthlyProgress.toFixed(0)}%</span>
                </div>
                <div class="bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div class="h-full transition-all duration-500 ${monthlyProgress > 100 ? 'bg-red-600' : 'bg-secondary'}" style="width: ${monthlyProgress}%"></div>
                </div>
            </div>
        `;
        
        return `
            <div onclick="openRoomDetails('${room.id}')" class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 hover:shadow-lg transition cursor-pointer">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-xl font-bold text-gray-800 dark:text-white">${room.name}</h3>
                    <span class="text-3xl">🏠</span>
                </div>
                <div class="space-y-3">
                    <div class="flex items-center">
                        <span class="w-3 h-3 rounded-full ${occupancyColor} mr-2"></span>
                        <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">${occupancyText}</span>
                    </div>
                    <div class="flex justify-between text-sm">
                        <span class="text-gray-600 dark:text-gray-400">Appliances:</span>
                        <span class="font-semibold text-gray-800 dark:text-white">${applianceCount}</span>
                    </div>
                    <div class="flex justify-between text-sm">
                        <span class="text-gray-600 dark:text-gray-400">Current Power:</span>
                        <span class="font-semibold text-primary">${currentPower} W</span>
                    </div>
                    <div class="flex justify-between text-sm">
                        <span class="text-gray-600 dark:text-gray-400">MCU ID:</span>
                        <span class="font-semibold text-gray-800 dark:text-white text-xs">${room.microcontrollerId || 'N/A'}</span>
                    </div>
                </div>
                ${progressSection}
            </div>
        `;
    }).join('');
}

// ==========================================
// ROOM DETAILS VIEW
// ==========================================

function openRoomDetails(roomId) {
    currentRoomId = roomId;
    const room = getRooms().find(r => r.id === roomId);
    if (!room) return;
    
    document.getElementById('roomsListView').classList.add('hidden');
    document.getElementById('roomDetailsView').classList.remove('hidden');
    document.getElementById('roomDetailsName').textContent = room.name;
    document.getElementById('roomMicrocontrollerId').textContent = room.microcontrollerId || 'N/A';
    
    updateRoomStats(room);
    renderAppliances(room);
    renderApplianceCostAnalysis(room);
}

function closeRoomDetails() {
    currentRoomId = null;
    document.getElementById('roomDetailsView').classList.add('hidden');
    document.getElementById('roomsListView').classList.remove('hidden');
    renderRoomsList();
}

function updateRoomStats(room) {
    const currentPower = room.appliances 
        ? room.appliances.filter(a => a.status).reduce((sum, a) => sum + (a.currentPower || 0), 0)
        : 0;
    
    document.getElementById('roomCurrentPower').textContent = currentPower + ' W';
    document.getElementById('roomTrackingType').textContent = room.trackingType.charAt(0).toUpperCase() + room.trackingType.slice(1);
    document.getElementById('roomApplianceCount').textContent = room.appliances ? room.appliances.length : 0;
    
    const occupancyEl = document.getElementById('roomOccupancy');
    const occupancyColor = room.occupied ? 'bg-green-500' : 'bg-red-500';
    const occupancyText = room.occupied ? 'Occupied' : 'Vacant';
    occupancyEl.innerHTML = `
        <span class="w-3 h-3 rounded-full ${occupancyColor} mr-2"></span>
        <span class="text-lg font-bold text-gray-800 dark:text-white">${occupancyText}</span>
    `;
    
    const automationBtn = document.getElementById('roomAutomationBtn');
    automationBtn.textContent = room.automation ? '🤖 Room Automation: ON' : '🤖 Room Automation: OFF';
    automationBtn.className = room.automation 
        ? 'px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition'
        : 'px-4 py-3 bg-secondary hover:bg-secondary/90 text-white font-semibold rounded-lg transition';
    
    updateRoomGoalProgress(room);
}

// ==========================================
// ROOM GOAL PROGRESS
// ==========================================

function updateRoomGoalProgress(room) {
    const container = document.getElementById('roomGoalProgressContent');
    if (!container) return;
    
    const currentPower = room.appliances 
        ? room.appliances.filter(a => a.status).reduce((sum, a) => sum + (a.currentPower || 0), 0)
        : 0;
    
    const simulatedDailyUsage = (currentPower / 1000) * 8;
    const simulatedMonthlyUsage = simulatedDailyUsage * 30;
    
    const dailyProgress = Math.min((simulatedDailyUsage / room.dailyGoal) * 100, 100);
    const monthlyProgress = Math.min((simulatedMonthlyUsage / room.monthlyGoal) * 100, 100);
    
    let html = '';
    
    if (room.trackingType === 'daily' || room.trackingType === 'both') {
        html += `
            <div class="mb-4">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-gray-700 dark:text-gray-300 font-semibold">Daily Goal</span>
                    <span class="text-lg font-bold ${dailyProgress > 100 ? 'text-red-600' : 'text-primary'}">
                        ${simulatedDailyUsage.toFixed(1)}/${room.dailyGoal} kWh
                    </span>
                </div>
                <div class="bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                    <div class="h-full transition-all duration-500 ${dailyProgress > 100 ? 'bg-red-600' : 'bg-primary'}" style="width: ${dailyProgress}%"></div>
                </div>
                <div class="flex justify-between text-sm mt-1">
                    <span class="text-gray-600 dark:text-gray-400">${dailyProgress.toFixed(0)}% used</span>
                    <span class="${dailyProgress > 100 ? 'text-red-600 font-semibold' : 'text-gray-600 dark:text-gray-400'}">
                        ${dailyProgress > 100 ? 'Over goal!' : 'On track'}
                    </span>
                </div>
            </div>
        `;
    }
    
    if (room.trackingType === 'monthly' || room.trackingType === 'both') {
        html += `
            <div>
                <div class="flex justify-between items-center mb-2">
                    <span class="text-gray-700 dark:text-gray-300 font-semibold">Monthly Goal</span>
                    <span class="text-lg font-bold ${monthlyProgress > 100 ? 'text-red-600' : 'text-secondary'}">
                        ${simulatedMonthlyUsage.toFixed(0)}/${room.monthlyGoal} kWh
                    </span>
                </div>
                <div class="bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                    <div class="h-full transition-all duration-500 ${monthlyProgress > 100 ? 'bg-red-600' : 'bg-secondary'}" style="width: ${monthlyProgress}%"></div>
                </div>
                <div class="flex justify-between text-sm mt-1">
                    <span class="text-gray-600 dark:text-gray-400">${monthlyProgress.toFixed(0)}% used</span>
                    <span class="${monthlyProgress > 100 ? 'text-red-600 font-semibold' : 'text-gray-600 dark:text-gray-400'}">
                        ${monthlyProgress > 100 ? 'Over goal!' : 'On track'}
                    </span>
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// ==========================================
// APPLIANCE COST ANALYSIS (NEW FEATURE)
// ==========================================

function renderApplianceCostAnalysis(room) {
    const container = document.getElementById('applianceCostAnalysis');
    if (!container || !room.appliances || room.appliances.length === 0) {
        if (container) {
            container.innerHTML = '<p class="text-gray-600 dark:text-gray-400">No appliances to analyze</p>';
        }
        return;
    }
    
    // Calculate cost for each appliance
    const appliancesCost = room.appliances.map(app => {
        const dailyKwh = (app.dailyRuntime / 1000 / 60 / 60) * (app.currentPower || 0) / 1000;
        const monthlyKwh = (app.monthlyRuntime / 1000 / 60 / 60) * (app.currentPower || 0) / 1000;
        const dailyCost = dailyKwh * COST_PER_KWH;
        const monthlyCost = monthlyKwh * COST_PER_KWH;
        
        return {
            name: app.name,
            dailyKwh: dailyKwh,
            monthlyKwh: monthlyKwh,
            dailyCost: dailyCost,
            monthlyCost: monthlyCost,
            currentPower: app.currentPower || 0
        };
    }).sort((a, b) => b.monthlyCost - a.monthlyCost);
    
    const html = `
        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead>
                    <tr class="border-b border-gray-200 dark:border-gray-700">
                        <th class="text-left py-2 px-2 text-gray-700 dark:text-gray-300">Appliance</th>
                        <th class="text-right py-2 px-2 text-gray-700 dark:text-gray-300">Power</th>
                        <th class="text-right py-2 px-2 text-gray-700 dark:text-gray-300">Daily Cost</th>
                        <th class="text-right py-2 px-2 text-gray-700 dark:text-gray-300">Monthly Cost</th>
                    </tr>
                </thead>
                <tbody>
                    ${appliancesCost.map((app, index) => `
                        <tr class="border-b border-gray-100 dark:border-gray-800 ${index === 0 ? 'bg-red-50 dark:bg-red-900/20' : ''}">
                            <td class="py-2 px-2 font-semibold text-gray-800 dark:text-white">
                                ${app.name}
                                ${index === 0 ? '<span class="text-red-600 text-xs ml-1">🔥 Highest</span>' : ''}
                            </td>
                            <td class="text-right py-2 px-2 text-gray-700 dark:text-gray-300">${app.currentPower} W</td>
                            <td class="text-right py-2 px-2 font-semibold ${index === 0 ? 'text-red-600' : 'text-gray-800 dark:text-white'}">
                                $${app.dailyCost.toFixed(2)}
                            </td>
                            <td class="text-right py-2 px-2 font-bold ${index === 0 ? 'text-red-600 text-lg' : 'text-gray-800 dark:text-white'}">
                                $${app.monthlyCost.toFixed(2)}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr class="border-t-2 border-gray-300 dark:border-gray-600 font-bold">
                        <td class="py-2 px-2 text-gray-800 dark:text-white">Total</td>
                        <td class="text-right py-2 px-2 text-gray-700 dark:text-gray-300">
                            ${appliancesCost.reduce((sum, a) => sum + a.currentPower, 0)} W
                        </td>
                        <td class="text-right py-2 px-2 text-primary">
                            $${appliancesCost.reduce((sum, a) => sum + a.dailyCost, 0).toFixed(2)}
                        </td>
                        <td class="text-right py-2 px-2 text-primary text-lg">
                            $${appliancesCost.reduce((sum, a) => sum + a.monthlyCost, 0).toFixed(2)}
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;
    
    container.innerHTML = html;
}

// ==========================================
// APPLIANCES RENDERING WITH EDIT/RESET BUTTONS
// ==========================================

function renderAppliances(room) {
    const grid = document.getElementById('appliancesGrid');
    
    if (!room.appliances || room.appliances.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-8">
                <div class="text-5xl mb-3">💡</div>
                <p class="text-gray-600 dark:text-gray-400">No appliances yet</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = room.appliances.map(app => {
        const statusColor = app.status ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
        const statusText = app.status ? 'ON' : 'OFF';
        const onSince = app.status && app.onSince ? formatOnSince(app.onSince) : 'N/A';
        const dailyRuntime = formatDuration(app.dailyRuntime || 0);
        const monthlyRuntime = formatDuration(app.monthlyRuntime || 0);
        
        return `
            <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div class="flex items-center justify-between mb-3">
                    <h4 class="font-bold text-gray-800 dark:text-white">${app.name}</h4>
                    <button onclick="toggleAppliance('${app.id}')" class="px-3 py-1 rounded-lg font-semibold transition text-sm ${statusColor}">
                        ${statusText}
                    </button>
                </div>
                <div class="space-y-2 text-xs text-gray-600 dark:text-gray-400 mb-3">
                    <div class="flex justify-between">
                        <span>Relay:</span>
                        <span class="font-semibold">CH${app.relayChannel}</span>
                    </div>
                    <div class="flex justify-between">
                        <span>PZEM:</span>
                        <span class="font-semibold">${app.pzemAddress}</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Power:</span>
                        <span class="font-semibold text-primary">${app.currentPower || 0} W</span>
                    </div>
                    <div class="flex justify-between">
                        <span>On Since:</span>
                        <span class="font-semibold" id="onSince_${app.id}">${onSince}</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Daily Runtime:</span>
                        <span class="font-semibold">${dailyRuntime}</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Monthly Runtime:</span>
                        <span class="font-semibold">${monthlyRuntime}</span>
                    </div>
                </div>
                <div class="space-y-2 mb-3">
                    <label class="flex items-center text-xs">
                        <input type="checkbox" ${app.automation ? 'checked' : ''} onchange="toggleApplianceAutomation('${app.id}')" class="w-4 h-4 mr-2">
                        <span class="text-gray-700 dark:text-gray-300">Automation</span>
                    </label>
                    <label class="flex items-center text-xs">
                        <input type="checkbox" ${app.sleepExempt ? 'checked' : ''} onchange="toggleSleepExempt('${app.id}')" class="w-4 h-4 mr-2">
                        <span class="text-gray-700 dark:text-gray-300">Sleep Exempt</span>
                    </label>
                </div>
                <div class="grid grid-cols-2 gap-2 mb-2">
                    <button onclick="openEditApplianceModal('${app.id}')" class="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition">
                        ✏️ Edit
                    </button>
                    <button onclick="openResetApplianceDataModal('${app.id}')" class="px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs font-semibold transition">
                        🔄 Reset
                    </button>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <button onclick="exportAppliance('${app.id}')" class="px-2 py-1 bg-secondary hover:bg-secondary/90 text-white rounded text-xs font-semibold transition">
                        📊 Export
                    </button>
                    <button onclick="removeAppliance('${app.id}')" class="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold transition">
                        🗑️ Remove
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// ==========================================
// ADD ROOM
// ==========================================

function openAddRoomModal() {
    document.getElementById('addRoomModal').classList.remove('hidden');
    updateNewRoomGoalCost();
}

function closeAddRoomModal() {
    document.getElementById('addRoomModal').classList.add('hidden');
    document.getElementById('addRoomForm').reset();
}

function updateNewRoomGoalCost() {
    const daily = parseFloat(document.getElementById('newRoomDailyGoal')?.value) || 0;
    const monthly = parseFloat(document.getElementById('newRoomMonthlyGoal')?.value) || 0;
    
    if (document.getElementById('newDailyGoalCost')) {
        document.getElementById('newDailyGoalCost').textContent = (daily * COST_PER_KWH).toFixed(2);
    }
    if (document.getElementById('newMonthlyGoalCost')) {
        document.getElementById('newMonthlyGoalCost').textContent = (monthly * COST_PER_KWH).toFixed(2);
    }
}

function saveNewRoom(event) {
    event.preventDefault();
    
    const password = document.getElementById('addRoomPassword').value;
    if (password !== ADMIN_PASSWORD) {
        showErrorMessage('Incorrect password');
        return;
    }
    
    const name = document.getElementById('newRoomName').value;
    const microcontrollerId = document.getElementById('newRoomMicrocontrollerId').value;
    const trackingType = document.getElementById('newRoomTracking').value;
    const dailyGoal = parseFloat(document.getElementById('newRoomDailyGoal').value);
    const monthlyGoal = parseFloat(document.getElementById('newRoomMonthlyGoal').value);
    
    const rooms = getRooms();
    const newRoom = {
        id: generateId(),
        name: name,
        microcontrollerId: microcontrollerId,
        trackingType: trackingType,
        dailyGoal: dailyGoal,
        monthlyGoal: monthlyGoal,
        occupied: true,
        automation: false,
        appliances: []
    };
    
    rooms.push(newRoom);
    saveRooms(rooms);
    closeAddRoomModal();
    renderRoomsList();
    showSuccessMessage('Room added successfully');
    notifyEvent('systemNotices', `Room "${name}" created with MCU ${microcontrollerId}`);
}

// ==========================================
// EDIT ROOM NAME
// ==========================================

function openEditRoomNameModal() {
    if (!currentRoomId) return;
    const room = getRooms().find(r => r.id === currentRoomId);
    if (!room) return;
    
    document.getElementById('editRoomNameInput').value = room.name;
    document.getElementById('editRoomNameModal').classList.remove('hidden');
}

function closeEditRoomNameModal() {
    document.getElementById('editRoomNameModal').classList.add('hidden');
    document.getElementById('editRoomNameForm').reset();
}

function saveRoomName(event) {
    event.preventDefault();
    
    if (!currentRoomId) return;
    const rooms = getRooms();
    const room = rooms.find(r => r.id === currentRoomId);
    if (!room) return;
    
    const newName = document.getElementById('editRoomNameInput').value;
    room.name = newName;
    saveRooms(rooms);
    document.getElementById('roomDetailsName').textContent = newName;
    closeEditRoomNameModal();
    showSuccessMessage('Room name updated');
}

// ==========================================
// EDIT MICROCONTROLLER ID (NEW)
// ==========================================

function openEditMicrocontrollerModal() {
    if (!currentRoomId) return;
    const room = getRooms().find(r => r.id === currentRoomId);
    if (!room) return;
    
    document.getElementById('editMicrocontrollerInput').value = room.microcontrollerId || '';
    document.getElementById('editMicrocontrollerModal').classList.remove('hidden');
}

function closeEditMicrocontrollerModal() {
    document.getElementById('editMicrocontrollerModal').classList.add('hidden');
    document.getElementById('editMicrocontrollerForm').reset();
}

function saveMicrocontrollerId(event) {
    event.preventDefault();
    
    const password = document.getElementById('editMicrocontrollerPassword').value;
    if (password !== ADMIN_PASSWORD) {
        showErrorMessage('Incorrect password');
        return;
    }
    
    if (!currentRoomId) return;
    const rooms = getRooms();
    const room = rooms.find(r => r.id === currentRoomId);
    if (!room) return;
    
    const newMcuId = document.getElementById('editMicrocontrollerInput').value;
    room.microcontrollerId = newMcuId;
    
    saveRooms(rooms);
    document.getElementById('roomMicrocontrollerId').textContent = newMcuId;
    closeEditMicrocontrollerModal();
    showSuccessMessage('Microcontroller ID updated');
    notifyEvent('systemNotices', `MCU ID updated for ${room.name}: ${newMcuId}`);
}

// ==========================================
// SET GOALS
// ==========================================

function openSetGoalsModal() {
    if (!currentRoomId) return;
    const room = getRooms().find(r => r.id === currentRoomId);
    if (!room) return;
    
    document.getElementById('editTrackingType').value = room.trackingType;
    document.getElementById('editDailyGoal').value = room.dailyGoal;
    document.getElementById('editMonthlyGoal').value = room.monthlyGoal;
    updateGoalCostDisplay();
    
    document.getElementById('setGoalsModal').classList.remove('hidden');
}

function closeSetGoalsModal() {
    document.getElementById('setGoalsModal').classList.add('hidden');
}

function updateGoalCostDisplay() {
    const daily = parseFloat(document.getElementById('editDailyGoal')?.value) || 0;
    const monthly = parseFloat(document.getElementById('editMonthlyGoal')?.value) || 0;
    
    if (document.getElementById('editDailyGoalCost')) {
        document.getElementById('editDailyGoalCost').textContent = (daily * COST_PER_KWH).toFixed(2);
    }
    if (document.getElementById('editMonthlyGoalCost')) {
        document.getElementById('editMonthlyGoalCost').textContent = (monthly * COST_PER_KWH).toFixed(2);
    }
}

function saveRoomGoals(event) {
    event.preventDefault();
    
    if (!currentRoomId) return;
    const rooms = getRooms();
    const room = rooms.find(r => r.id === currentRoomId);
    if (!room) return;
    
    room.trackingType = document.getElementById('editTrackingType').value;
    room.dailyGoal = parseFloat(document.getElementById('editDailyGoal').value);
    room.monthlyGoal = parseFloat(document.getElementById('editMonthlyGoal').value);
    
    saveRooms(rooms);
    closeSetGoalsModal();
    updateRoomStats(room);
    showSuccessMessage('Room goals updated');
}

// ==========================================
// ROOM ACTIONS
// ==========================================

function toggleRoomOccupancy() {
    if (!currentRoomId) return;
    const rooms = getRooms();
    const room = rooms.find(r => r.id === currentRoomId);
    if (!room) return;
    
    room.occupied = !room.occupied;
    saveRooms(rooms);
    updateRoomStats(room);
    
    const status = room.occupied ? 'Occupied' : 'Vacant';
    showSuccessMessage(`Room marked as ${status}`);
    notifyEvent('roomVacancy', `${room.name} is now ${status}`);
}

function toggleRoomAutomation() {
    if (!currentRoomId) return;
    const rooms = getRooms();
    const room = rooms.find(r => r.id === currentRoomId);
    if (!room) return;
    
    room.automation = !room.automation;
    saveRooms(rooms);
    updateRoomStats(room);
    
    const status = room.automation ? 'enabled' : 'disabled';
    showSuccessMessage(`Room automation ${status}`);
    
    if (room.automation && room.appliances) {
        room.appliances.forEach(app => {
            if (app.automation && !app.status) {
                app.status = true;
                app.currentPower = Math.floor(Math.random() * 300) + 50;
                app.onSince = Date.now();
            }
        });
        saveRooms(rooms);
        renderAppliances(room);
    }
}

// ==========================================
// DELETE ROOM
// ==========================================

function openDeleteRoomModal() {
    document.getElementById('deleteRoomModal').classList.remove('hidden');
}

function closeDeleteRoomModal() {
    document.getElementById('deleteRoomModal').classList.add('hidden');
    document.getElementById('deleteRoomForm').reset();
}

function confirmDeleteRoom(event) {
    event.preventDefault();
    
    const password = document.getElementById('deleteRoomPassword').value;
    if (password !== ADMIN_PASSWORD) {
        showErrorMessage('Incorrect password');
        return;
    }
    
    if (!currentRoomId) return;
    const rooms = getRooms();
    const roomIndex = rooms.findIndex(r => r.id === currentRoomId);
    if (roomIndex === -1) return;
    
    const roomName = rooms[roomIndex].name;
    rooms.splice(roomIndex, 1);
    saveRooms(rooms);
    
    closeDeleteRoomModal();
    closeRoomDetails();
    showSuccessMessage(`Room "${roomName}" deleted`);
}

// ==========================================
// RESET ROOM DATA
// ==========================================

function openResetRoomDataModal() {
    document.getElementById('resetRoomDataModal').classList.remove('hidden');
}

function closeResetRoomDataModal() {
    document.getElementById('resetRoomDataModal').classList.add('hidden');
    document.getElementById('resetRoomDataForm').reset();
}

function confirmResetRoomData(event) {
    event.preventDefault();
    
    const password = document.getElementById('resetRoomDataPassword').value;
    if (password !== ADMIN_PASSWORD) {
        showErrorMessage('Incorrect password');
        return;
    }
    
    if (!currentRoomId) return;
    const rooms = getRooms();
    const room = rooms.find(r => r.id === currentRoomId);
    if (!room || !room.appliances) return;
    
    room.appliances.forEach(app => {
        app.dailyRuntime = 0;
        app.monthlyRuntime = 0;
        if (!app.status) {
            app.onSince = null;
        }
    });
    
    saveRooms(rooms);
    closeResetRoomDataModal();
    renderAppliances(room);
    renderApplianceCostAnalysis(room);
    showSuccessMessage('Room data reset successfully');
}

// ==========================================
// ADD APPLIANCE
// ==========================================

function openAddApplianceModal() {
    if (!currentRoomId) return;
    document.getElementById('addApplianceModal').classList.remove('hidden');
}

function closeAddApplianceModal() {
    document.getElementById('addApplianceModal').classList.add('hidden');
    document.getElementById('addApplianceForm').reset();
}

function saveAppliance(event) {
    event.preventDefault();
    
    if (!currentRoomId) return;
    const rooms = getRooms();
    const room = rooms.find(r => r.id === currentRoomId);
    if (!room) return;
    
    const name = document.getElementById('applianceName').value;
    const relayChannel = parseInt(document.getElementById('relayChannel').value);
    const pzemAddress = document.getElementById('pzemAddress').value;
    const automation = document.getElementById('applianceAutomation').checked;
    const sleepExempt = document.getElementById('applianceSleepExempt').checked;
    
    if (!room.appliances) room.appliances = [];
    
    const newAppliance = {
        id: generateId(),
        name: name,
        relayChannel: relayChannel,
        pzemAddress: pzemAddress,
        status: false,
        currentPower: 0,
        automation: automation,
        sleepExempt: sleepExempt,
        onSince: null,
        dailyRuntime: 0,
        monthlyRuntime: 0
    };
    
    room.appliances.push(newAppliance);
    saveRooms(rooms);
    closeAddApplianceModal();
    renderAppliances(room);
    updateRoomStats(room);
    renderApplianceCostAnalysis(room);
    showSuccessMessage('Appliance added successfully');
}

// ==========================================
// EDIT APPLIANCE (NEW)
// ==========================================

function openEditApplianceModal(applianceId) {
    if (!currentRoomId) return;
    const room = getRooms().find(r => r.id === currentRoomId);
    if (!room) return;
    
    const appliance = room.appliances.find(a => a.id === applianceId);
    if (!appliance) return;
    
    currentApplianceId = applianceId;
    document.getElementById('editApplianceName').value = appliance.name;
    document.getElementById('editRelayChannel').value = appliance.relayChannel;
    document.getElementById('editPzemAddress').value = appliance.pzemAddress;
    document.getElementById('editApplianceModal').classList.remove('hidden');
}

function closeEditApplianceModal() {
    document.getElementById('editApplianceModal').classList.add('hidden');
    document.getElementById('editApplianceForm').reset();
    currentApplianceId = null;
}

function saveEditedAppliance(event) {
    event.preventDefault();
    
    if (!currentRoomId || !currentApplianceId) return;
    const rooms = getRooms();
    const room = rooms.find(r => r.id === currentRoomId);
    if (!room) return;
    
    const appliance = room.appliances.find(a => a.id === currentApplianceId);
    if (!appliance) return;
    
    appliance.name = document.getElementById('editApplianceName').value;
    appliance.relayChannel = parseInt(document.getElementById('editRelayChannel').value);
    appliance.pzemAddress = document.getElementById('editPzemAddress').value;
    
    saveRooms(rooms);
    closeEditApplianceModal();
    renderAppliances(room);
    renderApplianceCostAnalysis(room);
    showSuccessMessage('Appliance updated successfully');
}

// ==========================================
// RESET APPLIANCE DATA (NEW)
// ==========================================

function openResetApplianceDataModal(applianceId) {
    currentApplianceId = applianceId;
    document.getElementById('resetApplianceDataModal').classList.remove('hidden');
}

function closeResetApplianceDataModal() {
    document.getElementById('resetApplianceDataModal').classList.add('hidden');
    currentApplianceId = null;
}

function confirmResetApplianceData() {
    if (!currentRoomId || !currentApplianceId) return;
    const rooms = getRooms();
    const room = rooms.find(r => r.id === currentRoomId);
    if (!room) return;
    
    const appliance = room.appliances.find(a => a.id === currentApplianceId);
    if (!appliance) return;
    
    appliance.dailyRuntime = 0;
    appliance.monthlyRuntime = 0;
    if (!appliance.status) {
        appliance.onSince = null;
    }
    
    saveRooms(rooms);
    closeResetApplianceDataModal();
    renderAppliances(room);
    renderApplianceCostAnalysis(room);
    showSuccessMessage(`${appliance.name} data reset successfully`);
}

// ==========================================
// APPLIANCE ACTIONS
// ==========================================

function toggleAppliance(applianceId) {
    if (!currentRoomId) return;
    const rooms = getRooms();
    const room = rooms.find(r => r.id === currentRoomId);
    if (!room) return;
    
    const appliance = room.appliances.find(a => a.id === applianceId);
    if (!appliance) return;
    
    appliance.status = !appliance.status;
    
    if (appliance.status) {
        appliance.currentPower = Math.floor(Math.random() * 300) + 50;
        appliance.onSince = Date.now();
        notifyEvent('deviceToggled', `${appliance.name} in ${room.name} turned ON`);
    } else {
        if (appliance.onSince) {
            const runtime = Date.now() - appliance.onSince;
            appliance.dailyRuntime = (appliance.dailyRuntime || 0) + runtime;
            appliance.monthlyRuntime = (appliance.monthlyRuntime || 0) + runtime;
        }
        appliance.currentPower = 0;
        appliance.onSince = null;
        notifyEvent('deviceToggled', `${appliance.name} in ${room.name} turned OFF`);
    }
    
    saveRooms(rooms);
    renderAppliances(room);
    updateRoomStats(room);
    renderApplianceCostAnalysis(room);
}

function toggleApplianceAutomation(applianceId) {
    if (!currentRoomId) return;
    const rooms = getRooms();
    const room = rooms.find(r => r.id === currentRoomId);
    if (!room) return;
    
    const appliance = room.appliances.find(a => a.id === applianceId);
    if (!appliance) return;
    
    appliance.automation = !appliance.automation;
    saveRooms(rooms);
    showSuccessMessage(`Automation ${appliance.automation ? 'enabled' : 'disabled'} for ${appliance.name}`);
}

function toggleSleepExempt(applianceId) {
    if (!currentRoomId) return;
    const rooms = getRooms();
    const room = rooms.find(r => r.id === currentRoomId);
    if (!room) return;
    
    const appliance = room.appliances.find(a => a.id === applianceId);
    if (!appliance) return;
    
    appliance.sleepExempt = !appliance.sleepExempt;
    saveRooms(rooms);
    showSuccessMessage(`Sleep exemption ${appliance.sleepExempt ? 'enabled' : 'disabled'} for ${appliance.name}`);
}

function removeAppliance(applianceId) {
    if (!confirm('Remove this appliance?')) return;
    
    if (!currentRoomId) return;
    const rooms = getRooms();
    const room = rooms.find(r => r.id === currentRoomId);
    if (!room) return;
    
    const index = room.appliances.findIndex(a => a.id === applianceId);
    if (index === -1) return;
    
    const applianceName = room.appliances[index].name;
    room.appliances.splice(index, 1);
    saveRooms(rooms);
    renderAppliances(room);
    updateRoomStats(room);
    renderApplianceCostAnalysis(room);
    showSuccessMessage(`${applianceName} removed`);
}

// ==========================================
// EXPORT FUNCTIONS
// ==========================================

function openRoomExportModal() {
    document.getElementById('roomExportModal').classList.remove('hidden');
}

function closeRoomExportModal() {
    document.getElementById('roomExportModal').classList.add('hidden');
}

function exportRoomToCSV() {
    if (!currentRoomId) return;
    const room = getRooms().find(r => r.id === currentRoomId);
    if (!room) return;
    
    const csvContent = [
        ['OptiWatt Room Export'],
        ['Export Date:', new Date().toLocaleString()],
        [''],
        ['Room Information'],
        ['Name', room.name],
        ['Microcontroller ID', room.microcontrollerId || 'N/A'],
        ['Tracking Type', room.trackingType],
        ['Daily Goal (kWh)', room.dailyGoal],
        ['Monthly Goal (kWh)', room.monthlyGoal],
        ['Occupied', room.occupied ? 'Yes' : 'No'],
        ['Automation', room.automation ? 'Enabled' : 'Disabled'],
        [''],
        ['Appliances'],
        ['Name', 'Relay', 'PZEM', 'Status', 'Power (W)', 'Daily Runtime', 'Monthly Runtime']
    ];
    
    if (room.appliances) {
        room.appliances.forEach(app => {
            csvContent.push([
                app.name,
                'CH' + app.relayChannel,
                app.pzemAddress,
                app.status ? 'ON' : 'OFF',
                app.currentPower || 0,
                formatDuration(app.dailyRuntime || 0),
                formatDuration(app.monthlyRuntime || 0)
            ]);
        });
    }
    
    const csv = csvContent.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `optiwatt-room-${room.name}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showSuccessMessage('Room data exported to CSV');
    closeRoomExportModal();
}

function printRoomReport() {
    if (!currentRoomId) return;
    const room = getRooms().find(r => r.id === currentRoomId);
    if (!room) return;
    
    const appliancesTable = room.appliances && room.appliances.length > 0
        ? room.appliances.map(app => `
            <tr>
                <td>${app.name}</td>
                <td>CH${app.relayChannel}</td>
                <td>${app.pzemAddress}</td>
                <td>${app.status ? 'ON' : 'OFF'}</td>
                <td>${app.currentPower || 0} W</td>
                <td>${formatDuration(app.dailyRuntime || 0)}</td>
                <td>${formatDuration(app.monthlyRuntime || 0)}</td>
            </tr>
        `).join('')
        : '<tr><td colspan="7" style="text-align: center;">No appliances</td></tr>';
    
    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(`
        <html>
        <head>
            <title>OptiWatt Room Report - ${room.name}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; }
                h1 { color: #10B981; }
                h2 { color: #3B82F6; margin-top: 30px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { padding: 12px; border: 1px solid #ddd; text-align: left; }
                th { background-color: #10B981; color: white; }
                .info { margin: 10px 0; }
            </style>
        </head>
        <body>
            <h1>OptiWatt Room Report</h1>
            <p><strong>Export Date:</strong> ${new Date().toLocaleString()}</p>
            
            <h2>Room Information</h2>
            <div class="info"><strong>Name:</strong> ${room.name}</div>
            <div class="info"><strong>Microcontroller ID:</strong> ${room.microcontrollerId || 'N/A'}</div>
            <div class="info"><strong>Tracking Type:</strong> ${room.trackingType}</div>
            <div class="info"><strong>Daily Goal:</strong> ${room.dailyGoal} kWh</div>
            <div class="info"><strong>Monthly Goal:</strong> ${room.monthlyGoal} kWh</div>
            <div class="info"><strong>Occupied:</strong> ${room.occupied ? 'Yes' : 'No'}</div>
            <div class="info"><strong>Automation:</strong> ${room.automation ? 'Enabled' : 'Disabled'}</div>
            
            <h2>Appliances</h2>
            <table>
                <tr>
                    <th>Name</th>
                    <th>Relay</th>
                    <th>PZEM</th>
                    <th>Status</th>
                    <th>Power</th>
                    <th>Daily Runtime</th>
                    <th>Monthly Runtime</th>
                </tr>
                ${appliancesTable}
            </table>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
    
    closeRoomExportModal();
}

function exportAppliance(applianceId) {
    if (!currentRoomId) return;
    const room = getRooms().find(r => r.id === currentRoomId);
    if (!room) return;
    
    const appliance = room.appliances.find(a => a.id === applianceId);
    if (!appliance) return;
    
    const csvContent = [
        ['OptiWatt Appliance Export'],
        ['Export Date:', new Date().toLocaleString()],
        [''],
        ['Appliance', appliance.name],
        ['Room', room.name],
        ['Relay Channel', 'CH' + appliance.relayChannel],
        ['PZEM Address', appliance.pzemAddress],
        ['Status', appliance.status ? 'ON' : 'OFF'],
        ['Current Power (W)', appliance.currentPower || 0],
        ['On Since', appliance.onSince ? new Date(appliance.onSince).toLocaleString() : 'N/A'],
        ['Daily Runtime', formatDuration(appliance.dailyRuntime || 0)],
        ['Monthly Runtime', formatDuration(appliance.monthlyRuntime || 0)],
        ['Automation', appliance.automation ? 'Enabled' : 'Disabled'],
        ['Sleep Exempt', appliance.sleepExempt ? 'Yes' : 'No']
    ];
    
    const csv = csvContent.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `optiwatt-appliance-${appliance.name}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showSuccessMessage(`${appliance.name} data exported`);
}

// ==========================================
// LIVE TIMERS
// ==========================================

function startApplianceTimers() {
    if (applianceTimerInterval) clearInterval(applianceTimerInterval);
    
    applianceTimerInterval = setInterval(() => {
        if (!currentRoomId) return;
        const room = getRooms().find(r => r.id === currentRoomId);
        if (!room || !room.appliances) return;
        
        room.appliances.forEach(app => {
            if (app.status && app.onSince) {
                const el = document.getElementById(`onSince_${app.id}`);
                if (el) {
                    el.textContent = formatOnSince(app.onSince);
                }
            }
        });
    }, 1000);
}

// ==========================================
// SMART BACK NAVIGATION
// ==========================================

function goBack() {
    if (currentRoomId !== null) {
        closeRoomDetails();
    } else {
        window.location.href = 'dashboard.html';
    }
}

// ==========================================
// THEME TOGGLE (FIXED)
// ==========================================

function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.classList.contains('dark');
    
    if (isDark) {
        html.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        updateThemeUI(false);
    } else {
        html.classList.add('dark');
        localStorage.setItem('theme', 'dark');
        updateThemeUI(true);
    }
}

// ==========================================
// SETTINGS MODAL FUNCTIONS
// ==========================================

function openSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.classList.remove('hidden');
        // Load settings from script.js if available
        if (typeof updateGlobalAutomationToggle === 'function') updateGlobalAutomationToggle();
        if (typeof updateVacancySleepToggle === 'function') updateVacancySleepToggle();
        if (typeof updateScheduledSleepToggle === 'function') updateScheduledSleepToggle();
        if (typeof updateNotificationUI === 'function') updateNotificationUI();
    }
}

function closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function switchSettingsTab(tabName) {
    document.querySelectorAll('.settings-tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });
    
    document.querySelectorAll('.settings-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    const activeContent = document.getElementById(tabName + 'Tab');
    if (activeContent) {
        activeContent.classList.remove('hidden');
    }
    
    const titles = {
        password: 'Password',
        automation: 'Automation',
        energyCost: 'Energy Cost',
        notifications: 'Notifications',
        exportLogs: 'Export Logs',
        reset: 'Reset'
    };
    
    const titleEl = document.getElementById('settingsTitle');
    if (titleEl) {
        titleEl.textContent = titles[tabName] || 'Settings';
    }
}

function changePassword(event) {
    event.preventDefault();
    const currentPass = document.getElementById('currentPassword').value;
    const newPass = document.getElementById('newPassword').value;
    const confirmPass = document.getElementById('confirmPassword').value;
    
    if (currentPass !== ADMIN_PASSWORD) {
        showErrorMessage('Current password is incorrect');
        return;
    }
    
    if (newPass !== confirmPass) {
        showErrorMessage('Passwords do not match');
        return;
    }
    
    if (newPass.length < 6) {
        showErrorMessage('Password must be at least 6 characters');
        return;
    }
    
    showSuccessMessage('Password changed successfully (Note: This is a demo - passwords are not actually stored)');
    event.target.reset();
}

// ==========================================
// HEADER FUNCTIONS
// ==========================================

function toggleNotificationsPanel() {
    const panel = document.getElementById('notificationsPanel');
    if (panel) {
        panel.classList.toggle('hidden');
    }
}

function toggleProfileMenu() {
    const menu = document.getElementById('profileMenu');
    if (menu) {
        menu.classList.toggle('hidden');
    }
}

function confirmLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('optiwatt_session');
        window.location.href = 'login.html';
    }
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

function formatOnSince(timestamp) {
    const elapsed = Date.now() - timestamp;
    return formatDuration(elapsed);
}

function notifyEvent(type, message) {
    const prefs = JSON.parse(localStorage.getItem('optiwatt_notification_prefs') || '{}');
    if (prefs[type] === false) return;
    
    const sessionKey = 'notif_' + type + '_' + message;
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, 'true');
    
    showSuccessMessage(message);
}

function showSuccessMessage(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-24 right-4 z-50 px-6 py-4 rounded-lg shadow-2xl fade-in bg-primary text-white font-semibold';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.transition = 'opacity 0.5s';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

function showErrorMessage(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-24 right-4 z-50 px-6 py-4 rounded-lg shadow-2xl fade-in bg-red-600 text-white font-semibold';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.transition = 'opacity 0.5s';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// ==========================================
// FALLBACK FUNCTIONS (If script.js not loaded)
// ==========================================

if (typeof updateGlobalAutomationToggle === 'undefined') {
    window.updateGlobalAutomationToggle = function() {
        console.log('Global automation toggle - managed by script.js');
    };
}

if (typeof updateVacancySleepToggle === 'undefined') {
    window.updateVacancySleepToggle = function() {
        console.log('Vacancy sleep toggle - managed by script.js');
    };
}

if (typeof updateScheduledSleepToggle === 'undefined') {
    window.updateScheduledSleepToggle = function() {
        console.log('Scheduled sleep toggle - managed by script.js');
    };
}

if (typeof updateNotificationUI === 'undefined') {
    window.updateNotificationUI = function() {
        console.log('Notification UI - managed by script.js');
    };
}

// ==========================================
// END OF rooms.js
// ==========================================

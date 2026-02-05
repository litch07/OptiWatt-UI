// ==========================================
// OPTIWATT SMART ENERGY MANAGEMENT SYSTEM
// Complete with Settings Modal & All Features - BUG FIXED
// ==========================================

let currentGoalInputType = 'kwh'; // Track input type for goal modal

tailwind.config = {
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: '#16A34A',
                secondary: '#F97316',
                accent: '#F59E0B',
                danger: '#EF4444'
            }
        }
    }
};

const AppConfig = {
    costPerKwh: 0.15,
    deploymentDate: new Date('2025-10-06'),
    currentYear: new Date().getFullYear(),
    vacancySleepEnabled: false,
    vacancyDelayMinutes: 10,
    scheduledSleepEnabled: false,
    sleepStartTime: '22:00',
    sleepEndTime: '06:00',
    sleepExemptDevices: [],
    automation: false
};

const AppState = {
    rooms: [],
    devices: [],
    currentGraphView: 'daily',
    selectedYear: new Date().getFullYear(),
    theme: localStorage.getItem('theme') || 'light',
    editingRoomId: null,
    currentEditGoalType: null,
    updateInterval: null
};

const EnergyData = {
    hourly: [],
    daily: [],
    monthly: [],
    yearly: []
};

const NotificationPreferences = {
    houseGoalExceeded: true,
    roomGoalExceeded: true,
    dailyGoalExceeded: true,
    monthlyGoalExceeded: true,
    roomVacancy: true,
    deviceToggled: false,
    systemNotices: true
};

const DismissedNotifications = new Set();

// ==========================================
// INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    checkSession();
    loadUserProfile();
    updateBrandLink();
    initializeApp();
    loadSavedData();
    loadSettings();
    loadNotificationPreferences();
    loadGlobalAutomationState();
    setupEventListeners();
    
    if (document.getElementById('energyChart')) {
        setTimeout(() => {
            initializeChart();
            initializeYearSelector();
        }, 100);
        startAutoUpdate();
    }
    
    updateDashboard();
    showWelcomeMessageOnce();
    updateThemeLabel();
});

window.addEventListener('beforeunload', () => {
    stopAutoUpdate();
});

// ==========================================
// SESSION & AUTHENTICATION
// ==========================================

function checkSession() {
    const session = localStorage.getItem('optiwatt_session');
    if (!session && window.location.pathname.indexOf('login.html') === -1) {
        window.location.href = 'login.html';
        return;
    }
    if (session) {
        const data = JSON.parse(session);
        if (data.expiresAt < Date.now()) {
            localStorage.removeItem('optiwatt_session');
            sessionStorage.removeItem('optiwatt_welcome_shown');
            window.location.href = 'login.html';
        }
    }
}

function loadUserProfile() {
    const session = localStorage.getItem('optiwatt_session');
    if (session) {
        const data = JSON.parse(session);
        const profileName = document.getElementById('profileName');
        const profileEmail = document.getElementById('profileEmail');
        if (profileName) {
            profileName.textContent = data.username || 'Admin';
        }
        if (profileEmail) {
            const email = data.email || `${data.username || 'admin'}@example.com`;
            profileEmail.textContent = email;
        }
    }
}

function updateBrandLink() {
    const link = document.getElementById('brandLink');
    if (!link) return;
    const session = localStorage.getItem('optiwatt_session');
    if (session) {
        const data = JSON.parse(session);
        if (data.expiresAt > Date.now()) {
            link.href = 'dashboard.html';
            return;
        }
    }
    link.href = 'index.html';
}

function toggleProfileMenu() {
    const menu = document.getElementById('profileMenu');
    const btn = document.getElementById('profileMenuBtn');
    const isHidden = menu.classList.contains('hidden');
    closeNotificationsPanel();
    
    if (isHidden) {
        menu.classList.remove('hidden');
        btn.setAttribute('aria-expanded', 'true');
    } else {
        menu.classList.add('hidden');
        btn.setAttribute('aria-expanded', 'false');
    }
}

function closeProfileMenu() {
    const menu = document.getElementById('profileMenu');
    const btn = document.getElementById('profileMenuBtn');
    if (menu && !menu.classList.contains('hidden')) {
        menu.classList.add('hidden');
        btn?.setAttribute('aria-expanded', 'false');
    }
}

document.addEventListener('click', (e) => {
    const menu = document.getElementById('profileMenu');
    const btn = document.getElementById('profileMenuBtn');
    if (menu && btn && !menu.contains(e.target) && !btn.contains(e.target)) {
        closeProfileMenu();
    }
    
    const notifPanel = document.getElementById('notificationsPanel');
    const notifBtn = e.target.closest('button[onclick*="toggleNotificationsPanel"]');
    if (notifPanel && !notifPanel.contains(e.target) && !notifBtn) {
        closeNotificationsPanel();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeProfileMenu();
        closeNotificationsPanel();
        closeSettingsModal();
    }
});

function confirmLogout() {
    if (confirm('Are you sure you want to logout?')) {
        stopAutoUpdate();
        localStorage.removeItem('optiwatt_session');
        sessionStorage.removeItem('optiwatt_welcome_shown');
        window.location.href = 'login.html';
    }
}

// ==========================================
// APP INITIALIZATION
// ==========================================

function initializeApp() {
    if (AppState.theme === 'dark') {
        document.documentElement.classList.add('dark');
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.querySelector('.icon-size').innerHTML = '☀️';
        }
    }
    
    generateSampleEnergyData();
    
    const savedYear = localStorage.getItem('optiwatt_selected_year');
    if (savedYear) {
        AppState.selectedYear = parseInt(savedYear);
    }
    
    console.log('OptiWatt initialized');
}

function generateSampleEnergyData() {
    // Generate hourly data for today
    EnergyData.hourly = Array.from({length: 24}, (_, i) => {
        const base = 0.3;
        const peak = (i >= 6 && i <= 9) || (i >= 18 && i <= 22) ? 1.8 : 1.0;
        return {
            hour: i,
            value: (base + Math.random() * 0.4) * peak
        };
    });
    
    // Generate daily data for the week
    EnergyData.daily = Array.from({length: 7}, (_, i) => ({
        day: i + 1,
        value: 10 + Math.random() * 8
    }));
    
    // Generate monthly data for 30 days
    EnergyData.monthly = Array.from({length: 30}, (_, i) => ({
        day: i + 1,
        value: 12 + Math.random() * 6
    }));
    
    // Generate yearly data for 12 months
    EnergyData.yearly = Array.from({length: 12}, (_, i) => ({
        month: i,
        value: 350 + Math.random() * 150
    }));
}

function showWelcomeMessageOnce() {
    const welcomeShown = sessionStorage.getItem('optiwatt_welcome_shown');
    if (!welcomeShown && document.getElementById('loginAlert')) {
        const alertEl = document.getElementById('loginAlert');
        const lastLogin = new Date(Date.now() - 3600000).toLocaleString();
        const lastLoginEl = document.getElementById('lastLoginTime');
        if (lastLoginEl) {
            lastLoginEl.textContent = lastLogin;
        }
        
        alertEl.classList.remove('hidden');
        sessionStorage.setItem('optiwatt_welcome_shown', 'true');
        
        setTimeout(() => {
            alertEl.style.transition = 'opacity 0.5s';
            alertEl.style.opacity = '0';
            setTimeout(() => {
                alertEl.classList.add('hidden');
                alertEl.style.opacity = '1';
            }, 500);
        }, 5000);
    }
}

// ==========================================
// AUTO UPDATE (5-second interval)
// ==========================================

function startAutoUpdate() {
    stopAutoUpdate();
    AppState.updateInterval = setInterval(() => {
        updateDashboardMetrics();
    }, 5000);
}

function stopAutoUpdate() {
    if (AppState.updateInterval) {
        clearInterval(AppState.updateInterval);
        AppState.updateInterval = null;
    }
}

function updateDashboardMetrics() {
    const room = AppState.rooms[0];
    if (!room) return;
    
    // Simulate usage with slight variations
    const todayKwh = 8.5 + Math.random() * 5;
    const todayCost = todayKwh * AppConfig.costPerKwh;
    
    // Update Today's Usage
    const todayKwhEl = document.getElementById('todayKwh');
    const todayCostEl = document.getElementById('todayCost');
    const todayProgressEl = document.getElementById('todayProgress');
    const todayBarEl = document.getElementById('todayBar');
    const todayStatusEl = document.getElementById('todayStatus');
    
    if (todayKwhEl) todayKwhEl.textContent = todayKwh.toFixed(2);
    if (todayCostEl) todayCostEl.textContent = todayCost.toFixed(2);
    if (todayProgressEl) todayProgressEl.textContent = `${todayKwh.toFixed(1)}/${room.dailyGoal.toFixed(1)} kWh`;
    
    const dailyProgress = Math.min((todayKwh / room.dailyGoal) * 100, 100);
    if (todayBarEl) todayBarEl.style.width = dailyProgress + '%';
    if (todayStatusEl) todayStatusEl.textContent = todayKwh > room.dailyGoal ? '⚠️ Over goal' : 'On track';
    
    // Update This Month's Usage
    const currentDay = new Date().getDate();
    const monthKwh = todayKwh * currentDay;
    const monthCost = monthKwh * AppConfig.costPerKwh;
    
    const monthKwhEl = document.getElementById('monthKwh');
    const monthCostEl = document.getElementById('monthCost');
    const monthProgressEl = document.getElementById('monthProgress');
    const monthBarEl = document.getElementById('monthBar');
    const monthStatusEl = document.getElementById('monthStatus');
    
    if (monthKwhEl) monthKwhEl.textContent = monthKwh.toFixed(2);
    if (monthCostEl) monthCostEl.textContent = monthCost.toFixed(2);
    if (monthProgressEl) monthProgressEl.textContent = `${monthKwh.toFixed(0)}/${room.monthlyGoal} kWh`;
    
    const monthProgress = Math.min((monthKwh / room.monthlyGoal) * 100, 100);
    if (monthBarEl) monthBarEl.style.width = monthProgress + '%';
    if (monthStatusEl) monthStatusEl.textContent = monthKwh > room.monthlyGoal ? '⚠️ Over goal' : 'On track';
    
    // Update Estimated Monthly Cost
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const avgDaily = monthKwh / currentDay;
    const estimated = (avgDaily * daysInMonth) * AppConfig.costPerKwh;
    const estimatedCostEl = document.getElementById('estimatedCost');
    if (estimatedCostEl) estimatedCostEl.textContent = '$' + estimated.toFixed(2);
}

// ==========================================
// GLOBAL AUTOMATION
// ==========================================

function loadGlobalAutomationState() {
    const saved = localStorage.getItem('optiwatt_automation');
    AppConfig.automation = saved === 'true';
    updateGlobalAutomationToggle();
}

function toggleGlobalAutomation() {
    AppConfig.automation = !AppConfig.automation;
    localStorage.setItem('optiwatt_automation', AppConfig.automation);
    updateGlobalAutomationToggle();
    showSuccessMessage(AppConfig.automation ? 'Global Automation enabled' : 'Global Automation disabled');
}

function updateGlobalAutomationToggle() {
    const toggle = document.getElementById('globalAutomationToggle');
    if (toggle) {
        if (AppConfig.automation) {
            toggle.classList.add('active');
        } else {
            toggle.classList.remove('active');
        }
    }
}

// ==========================================
// SETTINGS MODAL
// ==========================================

function openSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.classList.remove('hidden');
        // Sync all toggle states
        updateGlobalAutomationToggle();
        updateVacancySleepToggle();
        updateScheduledSleepToggle();
        updateNotificationUI();
        
        // Set input values
        const vacancyTimerValue = document.getElementById('vacancyTimerValue');
        const vacancySlider = document.querySelector('#vacancyTimer input[type="range"]');
        if (vacancyTimerValue) vacancyTimerValue.textContent = AppConfig.vacancyDelayMinutes;
        if (vacancySlider) vacancySlider.value = AppConfig.vacancyDelayMinutes;
        
        const sleepStartInput = document.getElementById('sleepStartTime');
        const sleepEndInput = document.getElementById('sleepEndTime');
        if (sleepStartInput) sleepStartInput.value = AppConfig.sleepStartTime;
        if (sleepEndInput) sleepEndInput.value = AppConfig.sleepEndTime;
    }
}

function closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function switchSettingsTab(tabName) {
    // Update sidebar buttons
    document.querySelectorAll('.settings-tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });
    
    // Update content panels
    document.querySelectorAll('.settings-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    const activeContent = document.getElementById(tabName + 'Tab');
    if (activeContent) {
        activeContent.classList.remove('hidden');
    }
    
    // Update title
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

// Password Change
function changePassword(event) {
    event.preventDefault();
    
    const currentPass = document.getElementById('currentPassword').value;
    const newPass = document.getElementById('newPassword').value;
    const confirmPass = document.getElementById('confirmPassword').value;
    
    if (newPass !== confirmPass) {
        showErrorMessage('Passwords do not match');
        return;
    }
    
    if (newPass.length < 6) {
        showErrorMessage('Password must be at least 6 characters');
        return;
    }
    
    // In a real app, this would call an API
    showSuccessMessage('Password changed successfully');
    event.target.reset();
}

// Vacancy Sleep
function toggleVacancySleep() {
    AppConfig.vacancySleepEnabled = !AppConfig.vacancySleepEnabled;
    updateVacancySleepToggle();
    saveSettings();
    
    const timerSection = document.getElementById('vacancyTimer');
    if (timerSection) {
        if (AppConfig.vacancySleepEnabled) {
            timerSection.classList.remove('hidden');
        } else {
            timerSection.classList.add('hidden');
        }
    }
    
    showSuccessMessage(AppConfig.vacancySleepEnabled ? 'Vacancy Sleep enabled' : 'Vacancy Sleep disabled');
}

function updateVacancySleepToggle() {
    const toggle = document.getElementById('vacancySleepToggle');
    if (toggle) {
        if (AppConfig.vacancySleepEnabled) {
            toggle.classList.add('active');
        } else {
            toggle.classList.remove('active');
        }
    }
}

function updateVacancyTimer(value) {
    AppConfig.vacancyDelayMinutes = parseInt(value);
    const display = document.getElementById('vacancyTimerValue');
    if (display) {
        display.textContent = value;
    }
    saveSettings();
}

// Scheduled Sleep
function toggleScheduledSleep() {
    AppConfig.scheduledSleepEnabled = !AppConfig.scheduledSleepEnabled;
    updateScheduledSleepToggle();
    saveSettings();
    
    const configSection = document.getElementById('scheduledSleepConfig');
    if (configSection) {
        if (AppConfig.scheduledSleepEnabled) {
            configSection.classList.remove('hidden');
        } else {
            configSection.classList.add('hidden');
        }
    }
    
    showSuccessMessage(AppConfig.scheduledSleepEnabled ? 'Scheduled Sleep enabled' : 'Scheduled Sleep disabled');
}

function updateScheduledSleepToggle() {
    const toggle = document.getElementById('scheduledSleepToggle');
    if (toggle) {
        if (AppConfig.scheduledSleepEnabled) {
            toggle.classList.add('active');
        } else {
            toggle.classList.remove('active');
        }
    }
}

function updateSleepSchedule() {
    const startInput = document.getElementById('sleepStartTime');
    const endInput = document.getElementById('sleepEndTime');
    
    if (startInput) AppConfig.sleepStartTime = startInput.value;
    if (endInput) AppConfig.sleepEndTime = endInput.value;
    
    saveSettings();
    showSuccessMessage('Sleep schedule updated');
}

function toggleExemptionsSection() {
    const section = document.getElementById('sleepExemptions');
    if (section) {
        if (section.classList.contains('hidden')) {
            section.classList.remove('hidden');
            renderSleepExemptDevices();
        } else {
            section.classList.add('hidden');
        }
    }
}

function renderSleepExemptDevices() {
    const container = document.getElementById('sleepExemptDevicesList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (AppState.devices.length === 0) {
        container.innerHTML = '<p class="text-gray-600 dark:text-gray-400 text-sm">No devices available</p>';
        return;
    }
    
    AppState.devices.forEach(device => {
        const isExempt = AppConfig.sleepExemptDevices.includes(device.id);
        const item = document.createElement('label');
        item.className = 'flex items-center p-3 bg-white dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition';
        item.innerHTML = `
            <input type="checkbox" ${isExempt ? 'checked' : ''} onchange="toggleDeviceExemption('${device.id}')" class="w-5 h-5 mr-3">
            <div>
                <div class="font-semibold text-gray-800 dark:text-white">${device.name}</div>
                <div class="text-xs text-gray-600 dark:text-gray-400">${device.roomName} • ${device.wattage || 100}W</div>
            </div>
        `;
        container.appendChild(item);
    });
}

function toggleDeviceExemption(deviceId) {
    const index = AppConfig.sleepExemptDevices.indexOf(deviceId);
    if (index > -1) {
        AppConfig.sleepExemptDevices.splice(index, 1);
    } else {
        AppConfig.sleepExemptDevices.push(deviceId);
    }
    saveSettings();
}

// Notification Preferences
function updateNotificationUI() {
    const checks = {
        notifHouseGoal: 'houseGoalExceeded',
        notifRoomGoal: 'roomGoalExceeded',
        notifDailyGoal: 'dailyGoalExceeded',
        notifMonthlyGoal: 'monthlyGoalExceeded',
        notifVacancy: 'roomVacancy',
        notifDevice: 'deviceToggled',
        notifSystem: 'systemNotices'
    };
    
    Object.entries(checks).forEach(([id, key]) => {
        const el = document.getElementById(id);
        if (el) el.checked = NotificationPreferences[key];
    });
}

function toggleNotificationPref(prefKey) {
    NotificationPreferences[prefKey] = !NotificationPreferences[prefKey];
    saveNotificationPreferences();
    showSuccessMessage('Notification preferences updated');
}

function loadNotificationPreferences() {
    const saved = localStorage.getItem('optiwatt_notification_prefs');
    if (saved) {
        Object.assign(NotificationPreferences, JSON.parse(saved));
    }
    updateNotificationUI();
}

function saveNotificationPreferences() {
    localStorage.setItem('optiwatt_notification_prefs', JSON.stringify(NotificationPreferences));
}

// Export Functions
function exportToCSV() {
    const room = AppState.rooms[0];
    if (!room) {
        showErrorMessage('No data to export');
        return;
    }
    
    const csvContent = [
        ['OptiWatt Energy Usage Report'],
        ['Generated:', new Date().toLocaleString()],
        [''],
        ['Metric', 'Value'],
        ['Daily Goal', room.dailyGoal + ' kWh'],
        ['Monthly Goal', room.monthlyGoal + ' kWh'],
        ['Cost per kWh', '$' + AppConfig.costPerKwh],
        ['Total Rooms', AppState.rooms.length],
        ['Active Devices', AppState.devices.filter(d => d.status).length]
    ];
    
    const csv = csvContent.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'optiwatt-export-' + Date.now() + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    
    showSuccessMessage('Data exported successfully');
}

function printReport() {
    const room = AppState.rooms[0];
    if (!room) {
        showErrorMessage('No data to print');
        return;
    }
    
    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(`
        <html>
        <head>
            <title>OptiWatt Report</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; }
                h1 { color: #10B981; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { padding: 12px; border: 1px solid #ddd; text-align: left; }
                th { background-color: #10B981; color: white; }
            </style>
        </head>
        <body>
            <h1>OptiWatt Energy Usage Report</h1>
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            <table>
                <tr><th>Metric</th><th>Value</th></tr>
                <tr><td>Daily Goal</td><td>${room.dailyGoal} kWh</td></tr>
                <tr><td>Monthly Goal</td><td>${room.monthlyGoal} kWh</td></tr>
                <tr><td>Cost per kWh</td><td>$${AppConfig.costPerKwh}</td></tr>
                <tr><td>Total Rooms</td><td>${AppState.rooms.length}</td></tr>
                <tr><td>Active Devices</td><td>${AppState.devices.filter(d => d.status).length}</td></tr>
            </table>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// Reset Statistics
function confirmResetStatistics() {
    if (confirm('⚠️ WARNING: This will permanently delete all rooms, devices, and usage statistics. This action cannot be undone. Are you sure?')) {
        localStorage.removeItem('optiwatt_rooms');
        localStorage.removeItem('optiwatt_settings');
        localStorage.removeItem('optiwatt_automation');
        AppState.rooms = [];
        AppState.devices = [];
        
        showSuccessMessage('All data has been reset');
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    }
}

// Settings Persistence
function loadSettings() {
    const savedSettings = localStorage.getItem('optiwatt_settings');
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        AppConfig.vacancySleepEnabled = settings.vacancySleepEnabled || false;
        AppConfig.vacancyDelayMinutes = settings.vacancyDelayMinutes || 10;
        AppConfig.scheduledSleepEnabled = settings.scheduledSleepEnabled || false;
        AppConfig.sleepStartTime = settings.sleepStartTime || '22:00';
        AppConfig.sleepEndTime = settings.sleepEndTime || '06:00';
        AppConfig.sleepExemptDevices = settings.sleepExemptDevices || [];
    }
}

function saveSettings() {
    const settings = {
        vacancySleepEnabled: AppConfig.vacancySleepEnabled,
        vacancyDelayMinutes: AppConfig.vacancyDelayMinutes,
        scheduledSleepEnabled: AppConfig.scheduledSleepEnabled,
        sleepStartTime: AppConfig.sleepStartTime,
        sleepEndTime: AppConfig.sleepEndTime,
        sleepExemptDevices: AppConfig.sleepExemptDevices
    };
    localStorage.setItem('optiwatt_settings', JSON.stringify(settings));
}

// ==========================================
// THEME
// ==========================================

function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.classList.toggle('dark');
    AppState.theme = isDark ? 'dark' : 'light';
    localStorage.setItem('theme', AppState.theme);
    
    const toggle = document.getElementById('themeToggle');
    if (toggle) {
        const iconSpan = toggle.querySelector('.icon-size');
        if (iconSpan) {
            iconSpan.innerHTML = isDark ? '☀️' : '🌙';
        }
    }
    
    updateThemeLabel();
    
    if (window.energyChart) {
        updateChartTheme(isDark);
    }
}

function updateThemeLabel() {
    const label = document.getElementById('themeLabel');
    if (label) {
        label.textContent = AppState.theme === 'dark' ? 'Night Mode' : 'Light Mode';
    }
}

function updateChartTheme(isDark) {
    const chart = window.energyChart;
    if (!chart) return;
    
    chart.options.plugins.legend.labels.color = isDark ? '#F9FAFB' : '#111827';
    chart.options.scales.y.ticks.color = isDark ? '#9CA3AF' : '#6B7280';
    chart.options.scales.y.grid.color = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    chart.options.scales.x.ticks.color = isDark ? '#9CA3AF' : '#6B7280';
    chart.options.scales.x.grid.color = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    chart.update();
}

// ==========================================
// NOTIFICATIONS PANEL
// ==========================================

function toggleNotificationsPanel() {
    const panel = document.getElementById('notificationsPanel');
    closeProfileMenu();
    
    if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden');
    } else {
        panel.classList.add('hidden');
    }
}

function closeNotificationsPanel() {
    document.getElementById('notificationsPanel')?.classList.add('hidden');
}

// ==========================================
// DATA LOADING
// ==========================================

function loadSavedData() {
    const savedRooms = localStorage.getItem('optiwatt_rooms');
    if (savedRooms) {
        AppState.rooms = JSON.parse(savedRooms);
    } else {
        // Create default room
        AppState.rooms = [{
            id: generateId(),
            name: 'Living Room',
            trackingType: 'daily',
            dailyGoal: 15.0,
            monthlyGoal: 450,
            occupied: true,
            automation: false,
            appliances: [
                {
                    id: generateId(),
                    name: 'LED TV',
                    relayChannel: 1,
                    pzemAddress: '0x01',
                    status: true,
                    currentPower: 100,
                    wattage: 100,
                    automation: true,
                    sleepExempt: false,
                    onSince: Date.now(),
                    dailyRuntime: 0,
                    monthlyRuntime: 0
                },
                {
                    id: generateId(),
                    name: 'Air Conditioner',
                    relayChannel: 2,
                    pzemAddress: '0x02',
                    status: false,
                    currentPower: 0,
                    wattage: 1500,
                    automation: true,
                    sleepExempt: false,
                    onSince: null,
                    dailyRuntime: 0,
                    monthlyRuntime: 0
                }
            ]
        }];
        saveRooms();
    }
    
    // Flatten devices from all rooms
    AppState.devices = [];
    AppState.rooms.forEach(room => {
        room.appliances?.forEach(appliance => {
            AppState.devices.push({
                ...appliance,
                roomId: room.id,
                roomName: room.name
            });
        });
    });
    
    if (typeof updateDashboard === 'function') {
        updateDashboard();
    }
}

function saveRooms() {
    localStorage.setItem('optiwatt_rooms', JSON.stringify(AppState.rooms));
}

function generateId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ==========================================
// EVENT LISTENERS
// ==========================================

function setupEventListeners() {
    // Password form is handled via onsubmit in HTML
}

// ==========================================
// DASHBOARD UPDATE
// ==========================================

function updateDashboard() {
    const room = AppState.rooms[0];
    if (!room) return;
    
    // Calculate metrics
    let totalPower = 0;
    let activeDevices = 0;
    
    AppState.devices.forEach(device => {
        if (device.status) {
            totalPower += device.currentPower || 0;
            activeDevices++;
        }
    });
    
    // Update stat cards
    const totalRoomsEl = document.getElementById('totalRooms');
    const activeAppliancesEl = document.getElementById('activeAppliances');
    const currentPowerEl = document.getElementById('currentPower');
    
    if (totalRoomsEl) totalRoomsEl.textContent = AppState.rooms.length;
    if (activeAppliancesEl) activeAppliancesEl.textContent = activeDevices;
    if (currentPowerEl) currentPowerEl.textContent = totalPower + ' W';
    
    // Update goals display
    const dailyGoalDisplayEl = document.getElementById('dailyGoalDisplay');
    const dailyGoalCostEl = document.getElementById('dailyGoalCost');
    const monthlyGoalDisplayEl = document.getElementById('monthlyGoalDisplay');
    const monthlyGoalCostEl = document.getElementById('monthlyGoalCost');
    
    if (dailyGoalDisplayEl) dailyGoalDisplayEl.textContent = room.dailyGoal.toFixed(1);
    if (dailyGoalCostEl) dailyGoalCostEl.textContent = (room.dailyGoal * AppConfig.costPerKwh).toFixed(2);
    if (monthlyGoalDisplayEl) monthlyGoalDisplayEl.textContent = room.monthlyGoal;
    if (monthlyGoalCostEl) monthlyGoalCostEl.textContent = (room.monthlyGoal * AppConfig.costPerKwh).toFixed(2);
    
    // Trigger metric updates
    updateDashboardMetrics();
}

// ==========================================
// CHART (FIXED)
// ==========================================

function initializeChart() {
    const ctx = document.getElementById('energyChart');
    if (!ctx) return;
    
    const isDark = AppState.theme === 'dark';
    const room = AppState.rooms[0];
    
    // Default to daily view
    const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const data = Array.from({length: 7}, () => 10 + Math.random() * 8);
    const threshold = room ? room.dailyGoal : 15;
    
    window.energyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Energy Usage (kWh)',
                    data: data,
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3
                },
                {
                    label: 'Goal Threshold',
                    data: Array(labels.length).fill(threshold),
                    borderColor: '#F59E0B',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [10, 5],
                    pointRadius: 0,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: isDark ? '#F9FAFB' : '#111827'
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: isDark ? '#9CA3AF' : '#6B7280',
                        callback: function(value) {
                            return value + ' kWh';
                        }
                    },
                    grid: {
                        color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: isDark ? '#9CA3AF' : '#6B7280'
                    },
                    grid: {
                        color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                    }
                }
            }
        }
    });
}

function initializeYearSelector() {
    const selector = document.getElementById('yearSelector');
    if (!selector) return;
    
    const startYear = AppConfig.deploymentDate.getFullYear();
    const currentYear = new Date().getFullYear();
    
    selector.innerHTML = '';
    
    for (let year = startYear; year <= currentYear; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        if (year === AppState.selectedYear) {
            option.selected = true;
        }
        selector.appendChild(option);
    }
}

function changeSelectedYear() {
    const selector = document.getElementById('yearSelector');
    if (selector) {
        AppState.selectedYear = parseInt(selector.value);
        localStorage.setItem('optiwatt_selected_year', AppState.selectedYear);
        if (AppState.currentGraphView === 'yearly') {
            switchGraphView('yearly');
        }
    }
}

function switchGraphView(view) {
    AppState.currentGraphView = view;
    
    // Update tab buttons
    document.querySelectorAll('.graph-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.view === view) {
            tab.classList.add('active');
        }
    });
    
    // Show/hide year selector (FIXED - only for yearly)
    const yearContainer = document.getElementById('yearSelectorContainer');
    if (yearContainer) {
        if (view === 'yearly') {
            yearContainer.classList.remove('hidden');
        } else {
            yearContainer.classList.add('hidden');
        }
    }
    
    // Update chart data
    let labels, data, threshold;
    const room = AppState.rooms[0];
    
    switch(view) {
        case 'hourly':
            labels = Array.from({length: 24}, (_, i) => i + ':00');
            data = EnergyData.hourly.map(d => d.value);
            threshold = room ? room.dailyGoal / 24 : 0.625;
            document.getElementById('chartDescription').textContent = 'Hourly energy consumption for today';
            break;
            
        case 'daily':
            labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            data = Array.from({length: 7}, () => 10 + Math.random() * 8);
            threshold = room ? room.dailyGoal : 15;
            document.getElementById('chartDescription').textContent = 'Daily energy usage for the past 7 days';
            break;
            
        case 'monthly':
            labels = Array.from({length: 30}, (_, i) => 'Day ' + (i + 1));
            data = EnergyData.monthly.map(d => d.value);
            threshold = room ? room.monthlyGoal / 30 : 15;
            document.getElementById('chartDescription').textContent = 'Daily energy usage for this month';
            break;
            
        case 'yearly':
            labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            data = EnergyData.yearly.map(d => d.value);
            threshold = room ? room.monthlyGoal : 450;
            document.getElementById('chartDescription').textContent = `Monthly energy usage for ${AppState.selectedYear}`;
            break;
    }
    
    if (window.energyChart) {
        window.energyChart.data.labels = labels;
        window.energyChart.data.datasets[0].data = data;
        window.energyChart.data.datasets[1].data = Array(labels.length).fill(threshold);
        window.energyChart.update('none');
    }
}

// ==========================================
// EDIT GOAL MODAL
// ==========================================

// ==========================================
// GOAL INPUT TYPE SWITCHING
// ==========================================

function switchGoalInputType(type) {
    currentGoalInputType = type;
    
    const kwhBtn = document.getElementById('goalInputTypeKwh');
    const dollarBtn = document.getElementById('goalInputTypeDollar');
    const kwhSection = document.getElementById('goalInputKwhSection');
    const dollarSection = document.getElementById('goalInputDollarSection');
    
    if (type === 'kwh') {
        kwhBtn.classList.add('bg-white', 'dark:bg-gray-600', 'text-gray-800', 'dark:text-white');
        kwhBtn.classList.remove('text-gray-600', 'dark:text-gray-400');
        dollarBtn.classList.remove('bg-white', 'dark:bg-gray-600', 'text-gray-800', 'dark:text-white');
        dollarBtn.classList.add('text-gray-600', 'dark:text-gray-400');
        
        kwhSection.classList.remove('hidden');
        dollarSection.classList.add('hidden');
        
        document.getElementById('goalInputKwh').required = true;
        document.getElementById('goalInputDollar').required = false;
    } else {
        dollarBtn.classList.add('bg-white', 'dark:bg-gray-600', 'text-gray-800', 'dark:text-white');
        dollarBtn.classList.remove('text-gray-600', 'dark:text-gray-400');
        kwhBtn.classList.remove('bg-white', 'dark:bg-gray-600', 'text-gray-800', 'dark:text-white');
        kwhBtn.classList.add('text-gray-600', 'dark:text-gray-400');
        
        kwhSection.classList.add('hidden');
        dollarSection.classList.remove('hidden');
        
        document.getElementById('goalInputKwh').required = false;
        document.getElementById('goalInputDollar').required = true;
    }
}

// Real-time conversion for kWh input
document.addEventListener('DOMContentLoaded', () => {
    // ... existing code ...
    
    // Add event listeners for goal conversion
    const kwhInput = document.getElementById('goalInputKwh');
    const dollarInput = document.getElementById('goalInputDollar');
    
    if (kwhInput) {
        kwhInput.addEventListener('input', (e) => {
            const kwh = parseFloat(e.target.value) || 0;
            const cost = kwh * AppConfig.costPerKwh;
            document.getElementById('goalKwhToDollar').textContent = cost.toFixed(2);
        });
    }
    
    if (dollarInput) {
        dollarInput.addEventListener('input', (e) => {
            const cost = parseFloat(e.target.value) || 0;
            const kwh = cost / AppConfig.costPerKwh;
            document.getElementById('goalDollarToKwh').textContent = kwh.toFixed(1);
        });
    }
});


function openEditGoalModal(type) {
    AppState.currentEditGoalType = type;
    const modal = document.getElementById('editGoalModal');
    const titleEl = document.getElementById('editGoalTitle');
    const room = AppState.rooms[0];
    
    if (!room) return;
    
    let goalValue;
    if (type === 'daily') {
        titleEl.textContent = 'Edit Daily Goal';
        goalValue = room.dailyGoal;
    } else {
        titleEl.textContent = 'Edit Monthly Goal';
        goalValue = room.monthlyGoal;
    }
    
    // Set kWh input
    document.getElementById('goalInputKwh').value = goalValue;
    document.getElementById('goalKwhToDollar').textContent = (goalValue * AppConfig.costPerKwh).toFixed(2);
    
    // Set Dollar input
    const dollarValue = goalValue * AppConfig.costPerKwh;
    document.getElementById('goalInputDollar').value = dollarValue.toFixed(2);
    document.getElementById('goalDollarToKwh').textContent = goalValue.toFixed(1);
    
    // Reset to kWh view
    switchGoalInputType('kwh');
    
    modal.classList.remove('hidden');
}

function closeEditGoalModal() {
    document.getElementById('editGoalModal').classList.add('hidden');
}

function saveGoal(event) {
    event.preventDefault();
    
    let goalValue;
    
    if (currentGoalInputType === 'kwh') {
        goalValue = parseFloat(document.getElementById('goalInputKwh').value);
    } else {
        // Convert dollar to kWh
        const dollarValue = parseFloat(document.getElementById('goalInputDollar').value);
        goalValue = dollarValue / AppConfig.costPerKwh;
    }
    
    const room = AppState.rooms[0];
    
    if (!room) return;
    
    if (AppState.currentEditGoalType === 'daily') {
        room.dailyGoal = goalValue;
    } else {
        room.monthlyGoal = Math.round(goalValue);
    }
    
    saveRooms();
    updateDashboard();
    closeEditGoalModal();
    
    const inputType = currentGoalInputType === 'kwh' ? 'kWh' : '$';
    showSuccessMessage(`${AppState.currentEditGoalType === 'daily' ? 'Daily' : 'Monthly'} goal updated successfully`);
    
    // Update chart threshold
    if (window.energyChart) {
        switchGraphView(AppState.currentGraphView);
    }
}


// ==========================================
// SUCCESS / ERROR MESSAGES
// ==========================================

function showSuccessMessage(message) {
    showToast(message, 'success');
}

function showErrorMessage(message) {
    showToast(message, 'error');
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `fixed top-24 right-4 z-50 px-6 py-4 rounded-lg shadow-2xl fade-in ${
        type === 'success' ? 'bg-primary text-white' : 'bg-red-600 text-white'
    }`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.transition = 'opacity 0.5s';
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.remove();
        }, 500);
    }, 3000);
}

console.log('✅ OptiWatt System Loaded - All Features Active');

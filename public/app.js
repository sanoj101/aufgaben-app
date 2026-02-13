// Konfiguration
const API_URL = window.location.origin;

// State
let isLoggedIn = false;
let userRole = '';
let userName = '';
let currentEmployee = '';
let selectedPriority = 'important';
let currentFilter = 'all';
let currentEmployeeFilter = 'all';
let allTasks = [];
let allEmployees = [];
let vapidPublicKey = '';

// Initialisierung
async function init() {
    await loadEmployees();
    await loadVapidKey();
    
    // Prüfe Login-Status
    const savedLogin = localStorage.getItem('login');
    if (savedLogin) {
        const login = JSON.parse(savedLogin);
        isLoggedIn = true;
        userRole = login.role;
        userName = login.name || 'Chef';
        currentEmployee = login.name || 'Chef';
        showMainApp();
        await loadTasks();
    } else {
        showLoginButtons();
    }
    
    // Service Worker registrieren
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('✓ Service Worker registriert');
            
            // Prüfe auf Updates alle 30 Sekunden
            setInterval(() => {
                registration.update();
            }, 30000);
            
            // Wenn neuer Service Worker verfügbar, lade Seite neu
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
                        console.log('Neuer Service Worker aktiviert - Seite wird neu geladen');
                        window.location.reload();
                    }
                });
            });
            
            // Empfange Messages vom Service Worker
            navigator.serviceWorker.addEventListener('message', event => {
                console.log('Message from SW:', event.data);
                
                if (event.data && event.data.type === 'PUSH_RECEIVED') {
                    // Neue Push-Benachrichtigung → Daten neu laden
                    loadTasks();
                }
                
                if (event.data && event.data.type === 'SYNC_TASKS') {
                    // Background Sync → Daten neu laden
                    loadTasks();
                }
            });
            
            // Wake Lock API - hält Gerät wach (Android)
            if ('wakeLock' in navigator && isLoggedIn) {
                try {
                    let wakeLock = null;
                    
                    const requestWakeLock = async () => {
                        try {
                            wakeLock = await navigator.wakeLock.request('screen');
                            console.log('✓ Wake Lock aktiviert');
                            
                            wakeLock.addEventListener('release', () => {
                                console.log('Wake Lock released');
                            });
                        } catch (err) {
                            console.log('Wake Lock nicht verfügbar:', err);
                        }
                    };
                    
                    // Wake Lock bei Sichtbarkeit
                    document.addEventListener('visibilitychange', () => {
                        if (document.visibilityState === 'visible') {
                            requestWakeLock();
                        }
                    });
                    
                    // Initial aktivieren
                    requestWakeLock();
                } catch (err) {
                    console.log('Wake Lock API nicht unterstützt');
                }
            }
            
        } catch (error) {
            console.error('Service Worker Fehler:', error);
        }
    }

    // Online/Offline Status
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();
}

// Online-Status aktualisieren
function updateOnlineStatus() {
    const indicator = document.getElementById('statusIndicator');
    if (!indicator) return;
    
    if (navigator.onLine) {
        indicator.className = 'status-indicator';
        indicator.innerHTML = '<span class="status-dot"></span> Verbunden';
        if (isLoggedIn) loadTasks();
    } else {
        indicator.className = 'status-indicator offline';
        indicator.innerHTML = '<span class="status-dot"></span> Offline';
    }
}

// VAPID Key laden
async function loadVapidKey() {
    try {
        const response = await fetch(`${API_URL}/api/vapid-public-key`);
        const data = await response.json();
        vapidPublicKey = data.publicKey;
    } catch (error) {
        console.error('Fehler beim Laden des VAPID Keys:', error);
    }
}

// Mitarbeiter laden
async function loadEmployees() {
    try {
        const response = await fetch(`${API_URL}/api/employees`);
        allEmployees = await response.json();
    } catch (error) {
        console.error('Fehler beim Laden der Mitarbeiter:', error);
    }
}

// Login-Buttons anzeigen
function showLoginButtons() {
    const loginScreen = document.getElementById('loginScreen');
    const loginButtons = document.getElementById('loginButtons');
    
    loginButtons.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 20px;">
            <button class="login-user-btn chef-btn" onclick="showPasswordPrompt('Chef', 'chef')">
                <div class="login-user-icon">👔</div>
                <div class="login-user-name">Chef</div>
            </button>
            ${allEmployees.map(emp => `
                <button class="login-user-btn" onclick="showPasswordPrompt('${escapeHtml(emp.name)}', 'mitarbeiter')">
                    <div class="login-user-icon">👷</div>
                    <div class="login-user-name">${escapeHtml(emp.name)}</div>
                </button>
            `).join('')}
        </div>
    `;
}

// Passwort-Prompt anzeigen
function showPasswordPrompt(name, role) {
    const loginButtons = document.getElementById('loginButtons');
    loginButtons.innerHTML = `
        <div class="password-prompt">
            <h2>Anmelden als ${escapeHtml(name)}</h2>
            <form onsubmit="login(event, '${escapeHtml(name)}', '${role}')">
                <div class="form-group">
                    <label>Passwort</label>
                    <input type="password" id="loginPassword" required placeholder="Passwort eingeben" autofocus>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button type="submit" class="submit-btn">Anmelden</button>
                    <button type="button" class="submit-btn" style="background: #95a5a6;" onclick="showLoginButtons()">Zurück</button>
                </div>
            </form>
        </div>
    `;
}

// Login
async function login(event, name, role) {
    event.preventDefault();
    
    const password = document.getElementById('loginPassword').value;
    
    try {
        const endpoint = role === 'chef' ? '/api/login/chef' : '/api/login/mitarbeiter';
        const body = role === 'chef' ? { password } : { name, password };
        
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        
        const data = await response.json();
        
        if (data.success) {
            isLoggedIn = true;
            userRole = role;
            userName = name;
            currentEmployee = name;
            localStorage.setItem('login', JSON.stringify({ role, name }));
            showMainApp();
            showNotification(`Willkommen, ${name}! 👋`);
        } else {
            showNotification('Falsches Passwort!', 'error');
            document.getElementById('loginPassword').value = '';
            document.getElementById('loginPassword').focus();
        }
    } catch (error) {
        console.error('Login-Fehler:', error);
        showNotification('Login fehlgeschlagen', 'error');
    }
}

// Logout
function logout() {
    isLoggedIn = false;
    userRole = '';
    userName = '';
    currentEmployee = '';
    localStorage.removeItem('login');
    
    // Auto-Update stoppen
    if (window.autoUpdateInterval) {
        clearInterval(window.autoUpdateInterval);
    }
    
    document.getElementById('mainApp').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'block';
    
    showLoginButtons();
    showNotification('Erfolgreich abgemeldet');
}

// Main App anzeigen
function showMainApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    
    document.getElementById('userInfo').textContent = `Angemeldet als: ${userName}`;
    
    if (userRole === 'chef') {
        document.getElementById('chefView').style.display = 'block';
        document.getElementById('mitarbeiterView').style.display = 'none';
        loadEmployeesForSelect();
        loadEmployeeManagement();
        
        // Chef kann auch Push-Benachrichtigungen aktivieren
        setTimeout(() => {
            if (Notification.permission === 'default') {
                if (confirm('Möchten Sie Benachrichtigungen aktivieren?\n\nSie werden benachrichtigt wenn:\n• Eine Aufgabe erledigt wurde\n• Ein Foto hinzugefügt wurde\n• Eine Aufgabe wieder geöffnet wurde')) {
                    enableNotifications();
                }
            } else if (Notification.permission === 'granted') {
                subscribeToPush();
            }
        }, 2000);
    } else {
        document.getElementById('chefView').style.display = 'none';
        document.getElementById('mitarbeiterView').style.display = 'block';
        
        // Mitarbeiter: Push-Benachrichtigungen automatisch anbieten
        setTimeout(() => {
            if (Notification.permission === 'default') {
                if (confirm('Möchten Sie Benachrichtigungen für neue Aufgaben aktivieren?')) {
                    enableNotifications();
                }
            } else if (Notification.permission === 'granted') {
                subscribeToPush();
            }
        }, 2000);
    }
    
    loadTasks();
    
    // Automatische Aktualisierung alle 10 Sekunden
    if (window.autoUpdateInterval) {
        clearInterval(window.autoUpdateInterval);
    }
    window.autoUpdateInterval = setInterval(loadTasks, 10000);
}

// Mitarbeiter für Select laden
function loadEmployeesForSelect() {
    const assignSelect = document.getElementById('assignEmployee');
    const filterSelect = document.getElementById('filterEmployee');
    
    if (assignSelect) {
        assignSelect.innerHTML = '<option value="">-- Mitarbeiter wählen --</option><option value="Chef">Chef (selbst)</option>';
        allEmployees.forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.name;
            option.textContent = emp.name;
            assignSelect.appendChild(option);
        });
    }
    
    if (filterSelect) {
        filterSelect.innerHTML = '<option value="all">Alle Mitarbeiter</option><option value="Chef">Chef</option>';
        allEmployees.forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.name;
            option.textContent = emp.name;
            filterSelect.appendChild(option);
        });
    }
}

// Benachrichtigungs-Berechtigung prüfen
async function checkNotificationPermission() {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
        await subscribeToPush();
    }
}

// Benachrichtigungen aktivieren
async function enableNotifications() {
    if (!('Notification' in window)) {
        showNotification('Benachrichtigungen werden nicht unterstützt', 'error');
        return;
    }

    try {
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
            showNotification('Benachrichtigungen aktiviert! 🔔');
            await subscribeToPush();
        } else {
            showNotification('Benachrichtigungen wurden abgelehnt', 'error');
        }
    } catch (error) {
        console.error('Fehler bei Benachrichtigungen:', error);
        showNotification('Fehler beim Aktivieren', 'error');
    }
}

// Push-Subscription erstellen
async function subscribeToPush() {
    if (!vapidPublicKey) {
        console.error('VAPID Key nicht verfügbar');
        return;
    }
    
    try {
        const registration = await navigator.serviceWorker.ready;
        
        // Prüfe ob bereits subscribed
        let subscription = await registration.pushManager.getSubscription();
        
        if (!subscription) {
            console.log('Erstelle neue Push-Subscription...');
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
            });
            console.log('✓ Push-Subscription erstellt');
        } else {
            console.log('✓ Push-Subscription existiert bereits');
        }

        // Subscription an Server senden
        const response = await fetch(`${API_URL}/api/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                employee: currentEmployee,
                subscription: subscription.toJSON()
            })
        });

        if (!response.ok) {
            throw new Error('Fehler beim Speichern der Subscription');
        }

        console.log('✓ Push-Subscription am Server gespeichert');
        
        // WICHTIG: Sofort Test-Benachrichtigung zeigen
        // Dies registriert den Notification Channel in Android
        if (Notification.permission === 'granted') {
            // Warte kurz damit Service Worker ready ist
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Zeige Test-Benachrichtigung VOM SERVICE WORKER
            // Dies ist wichtig für Android Channel-Registrierung
            registration.showNotification('✅ Benachrichtigungen aktiviert', {
                body: 'Sie erhalten ab jetzt Push-Benachrichtigungen für neue Aufgaben',
                icon: '/icon-192.png',
                badge: '/icon-96.png',
                vibrate: [200, 100, 200],
                tag: 'test-notification',
                requireInteraction: false,
                silent: false
            });
        }
        
    } catch (error) {
        console.error('Fehler bei Push-Subscription:', error);
        
        // Retry nach 5 Sekunden
        setTimeout(() => {
            console.log('Versuche Push-Subscription erneut...');
            subscribeToPush();
        }, 5000);
    }
}

// VAPID Key konvertieren
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// Priorität auswählen
function selectPriority(priority) {
    selectedPriority = priority;
    document.querySelectorAll('.priority-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.priority-btn.${priority}`).classList.add('active');
}

// Aufgabe erstellen
async function createTask(event) {
    event.preventDefault();
    
    const title = document.getElementById('taskTitle').value.trim();
    const employee = document.getElementById('assignEmployee').value;
    
    if (!title || !employee) {
        showNotification('Bitte alle Felder ausfüllen!', 'error');
        return;
    }

    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading"></span> Wird erstellt...';

    try {
        const response = await fetch(`${API_URL}/api/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title,
                priority: selectedPriority,
                employee,
                overdueHours: 48
            })
        });

        if (!response.ok) throw new Error('Fehler beim Erstellen');

        document.getElementById('taskForm').reset();
        selectPriority('important');
        await loadTasks();
        showNotification('Aufgabe erfolgreich erstellt! ✓');
    } catch (error) {
        console.error('Fehler:', error);
        showNotification('Fehler beim Erstellen der Aufgabe', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Aufgabe erstellen';
    }
}

// Aufgaben laden
async function loadTasks() {
    try {
        // Cache-Busting: Timestamp anhängen
        const response = await fetch(`${API_URL}/api/tasks?_=${Date.now()}`);
        allTasks = await response.json();
        
        if (userRole === 'chef') {
            displayTasksForChef(allTasks);
        } else {
            const myTasks = allTasks.filter(t => t.employee === currentEmployee);
            displayTasksForEmployee(myTasks);
        }
    } catch (error) {
        console.error('Fehler beim Laden der Aufgaben:', error);
    }
}

// Filter nach Mitarbeiter
function filterByEmployee(employee) {
    currentEmployeeFilter = employee;
    displayTasksForChef(allTasks);
}

// Aufgaben für Chef anzeigen
function displayTasksForChef(tasks) {
    // Filter nach Mitarbeiter
    let filteredByEmployee = tasks;
    if (currentEmployeeFilter !== 'all') {
        filteredByEmployee = tasks.filter(t => t.employee === currentEmployeeFilter);
    }
    
    // Filter nach Status
    const filteredTasks = filterTasksArray(filteredByEmployee);
    const taskList = document.getElementById('taskList');
    
    document.getElementById('taskCount').textContent = `${filteredTasks.length} Aufgaben`;
    
    if (filteredTasks.length === 0) {
        taskList.innerHTML = `
            <div class="empty-state">
                <h3>Keine Aufgaben vorhanden</h3>
                <p>Erstellen Sie die erste Aufgabe</p>
            </div>
        `;
        return;
    }

    taskList.innerHTML = filteredTasks.map(task => {
        const isOverdue = isTaskOverdue(task);
        const timeInfo = getTimeInfo(task);
        
        return `
            <div class="task-card ${task.priority} ${task.status === 'completed' ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}">
                <div class="task-header">
                    <div class="task-title">${escapeHtml(task.title)}</div>
                    <div class="task-badges">
                        <span class="badge ${task.priority}">${task.priority === 'important' ? 'Wichtig' : 'Unwichtig'}</span>
                        ${task.status === 'completed' ? '<span class="badge completed">Erledigt</span>' : ''}
                        ${isOverdue && task.status === 'open' ? '<span class="badge overdue">Überfällig</span>' : ''}
                    </div>
                </div>
                <div class="task-info">
                    👷 ${escapeHtml(task.employee)}<br>
                    📅 ${timeInfo}
                </div>
                ${task.photo ? `
                    <div class="task-photo">
                        <img src="${task.photo}" alt="Nachweis-Foto" onclick="viewFullImage('${task.photo}')">
                    </div>
                ` : ''}
                <div class="task-actions">
                    ${task.status === 'open' ? `
                        <button class="action-btn photo-btn" onclick="document.getElementById('photo-chef-${task.id}').click()">📷 Foto ${task.photo ? 'ändern' : 'hinzufügen'}</button>
                        <input type="file" id="photo-chef-${task.id}" class="photo-input" accept="image/*" onchange="addPhoto(${task.id}, event)">
                    ` : ''}
                    ${task.status === 'completed' ? `
                        <button class="action-btn" style="background: #f39c12; color: white;" onclick="reopenTask(${task.id})">🔄 Wieder öffnen</button>
                    ` : ''}
                    <button class="action-btn" style="background: #e74c3c; color: white;" onclick="deleteTask(${task.id}, '${escapeHtml(task.title).replace(/'/g, "\\'")}')">🗑️ Löschen</button>
                </div>
            </div>
        `;
    }).join('');
}

// Aufgaben für Mitarbeiter anzeigen
function displayTasksForEmployee(tasks) {
    const filteredTasks = filterTasksArray(tasks);
    const taskList = document.getElementById('myTaskList');
    
    document.getElementById('myTaskCount').textContent = `${filteredTasks.length} Aufgaben`;
    
    if (filteredTasks.length === 0) {
        taskList.innerHTML = `
            <div class="empty-state">
                <h3>Keine Aufgaben vorhanden</h3>
                <p>Sie haben momentan keine Aufgaben</p>
            </div>
        `;
        return;
    }

    taskList.innerHTML = filteredTasks.map(task => {
        const isOverdue = isTaskOverdue(task);
        const timeInfo = getTimeInfo(task);
        
        return `
            <div class="task-card ${task.priority} ${task.status === 'completed' ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}">
                <div class="task-header">
                    <div class="task-title">${escapeHtml(task.title)}</div>
                    <div class="task-badges">
                        <span class="badge ${task.priority}">${task.priority === 'important' ? 'Wichtig' : 'Unwichtig'}</span>
                        ${task.status === 'completed' ? '<span class="badge completed">Erledigt</span>' : ''}
                        ${isOverdue && task.status === 'open' ? '<span class="badge overdue">Überfällig</span>' : ''}
                    </div>
                </div>
                <div class="task-info">
                    📅 ${timeInfo}
                </div>
                ${task.photo ? `
                    <div class="task-photo">
                        <img src="${task.photo}" alt="Nachweis-Foto" onclick="viewFullImage('${task.photo}')">
                    </div>
                ` : ''}
                <div class="task-actions">
                    ${task.status === 'open' ? `
                        <button class="action-btn complete-btn" onclick="completeTask(${task.id})">✓ Erledigt</button>
                        <button class="action-btn photo-btn" onclick="document.getElementById('photo-${task.id}').click()">📷 Foto ${task.photo ? 'ändern' : 'hinzufügen'}</button>
                        <input type="file" id="photo-${task.id}" class="photo-input" accept="image/*" onchange="addPhoto(${task.id}, event)">
                    ` : ''}
                    ${task.status === 'completed' ? `
                        <button class="action-btn" style="background: #f39c12; color: white;" onclick="reopenTask(${task.id})">🔄 Wieder öffnen</button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Vollbild-Foto anzeigen
function viewFullImage(src) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:10000;display:flex;align-items:center;justify-content:center;cursor:pointer;';
    overlay.onclick = () => overlay.remove();
    
    const img = document.createElement('img');
    img.src = src;
    img.style.cssText = 'max-width:90%;max-height:90%;border-radius:8px;';
    
    overlay.appendChild(img);
    document.body.appendChild(overlay);
}

// Aufgabe abschließen
async function completeTask(taskId) {
    try {
        const response = await fetch(`${API_URL}/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'completed' })
        });

        if (!response.ok) throw new Error('Fehler beim Aktualisieren');

        await loadTasks();
        showNotification('Aufgabe als erledigt markiert! ✓');
    } catch (error) {
        console.error('Fehler:', error);
        showNotification('Fehler beim Aktualisieren', 'error');
    }
}

// Aufgabe wieder öffnen
async function reopenTask(taskId) {
    try {
        const response = await fetch(`${API_URL}/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'open' })
        });

        if (!response.ok) throw new Error('Fehler beim Aktualisieren');

        await loadTasks();
        showNotification('Aufgabe wieder geöffnet! 🔄');
    } catch (error) {
        console.error('Fehler:', error);
        showNotification('Fehler beim Aktualisieren', 'error');
    }
}

// Aufgabe löschen
async function deleteTask(taskId, title) {
    if (!confirm(`Aufgabe wirklich löschen?\n\n"${title}"\n\nDiese Aktion kann nicht rückgängig gemacht werden.`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/tasks/${taskId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Fehler beim Löschen');
        }

        await loadTasks();
        showNotification('Aufgabe gelöscht! 🗑️');
    } catch (error) {
        console.error('Fehler:', error);
        showNotification(error.message || 'Fehler beim Löschen', 'error');
    }
}

// Foto hinzufügen
async function addPhoto(taskId, event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Nur ein Foto auf einmal verarbeiten
    const file = files[0];
    
    // Größenprüfung (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        showNotification(`Foto zu groß (max. 10MB)`, 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const response = await fetch(`${API_URL}/api/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ photo: e.target.result })
            });

            if (!response.ok) throw new Error('Fehler beim Hochladen');

            await loadTasks();
            showNotification('Foto hinzugefügt! 📷');
        } catch (error) {
            console.error('Fehler:', error);
            showNotification('Fehler beim Hochladen', 'error');
        }
    };
    reader.readAsDataURL(file);
}

// Überfälligkeit prüfen
function isTaskOverdue(task) {
    if (task.status === 'completed') return false;
    
    const createdDate = new Date(task.created_at);
    const now = new Date();
    const hoursPassed = (now - createdDate) / (1000 * 60 * 60);
    
    return hoursPassed > (task.overdue_hours || 48);
}

// Zeitinformationen formatieren
function getTimeInfo(task) {
    const createdDate = new Date(task.created_at);
    const formattedCreated = formatDate(createdDate);
    
    if (task.status === 'completed' && task.completed_at) {
        const completedDate = new Date(task.completed_at);
        const formattedCompleted = formatDate(completedDate);
        return `Erstellt: ${formattedCreated} | Erledigt: ${formattedCompleted}`;
    }
    
    return `Erstellt: ${formattedCreated}`;
}

// Datum formatieren
function formatDate(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Gerade eben';
    if (diffMins < 60) return `vor ${diffMins} Min.`;
    if (diffHours < 24) return `vor ${diffHours} Std.`;
    if (diffDays < 7) return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;
    
    return date.toLocaleDateString('de-DE', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Filter anwenden
function filterTasks(filter) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    loadTasks();
}

// Aufgaben-Array filtern
function filterTasksArray(tasks) {
    switch(currentFilter) {
        case 'open':
            return tasks.filter(t => t.status === 'open');
        case 'completed':
            return tasks.filter(t => t.status === 'completed');
        case 'overdue':
            return tasks.filter(t => isTaskOverdue(t));
        case 'important':
            return tasks.filter(t => t.priority === 'important');
        default:
            return tasks;
    }
}

// Mitarbeiterverwaltung laden
async function loadEmployeeManagement() {
    const employeeList = document.getElementById('employeeList');
    if (!employeeList) return;
    
    if (allEmployees.length === 0) {
        employeeList.innerHTML = '<p style="color: #95a5a6; padding: 20px; text-align: center;">Keine Mitarbeiter vorhanden</p>';
        return;
    }
    
    employeeList.innerHTML = allEmployees.map(emp => `
        <div class="employee-card">
            <div class="employee-name">👷 ${escapeHtml(emp.name)}</div>
            <div class="employee-actions">
                <button class="employee-btn password" onclick="changeEmployeePassword(${emp.id}, '${escapeHtml(emp.name).replace(/'/g, "\\'")}')">
                    🔑 Passwort ändern
                </button>
                <button class="employee-btn delete" onclick="deleteEmployee(${emp.id}, '${escapeHtml(emp.name).replace(/'/g, "\\'")}')">
                    🗑️ Löschen
                </button>
            </div>
        </div>
    `).join('');
}

// Mitarbeiter anlegen
async function addEmployee(event) {
    event.preventDefault();
    
    const name = document.getElementById('newEmployeeName').value.trim();
    const password = document.getElementById('newEmployeePassword').value.trim();
    
    if (!name || !password) {
        showNotification('Bitte Name und Passwort eingeben', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/employees`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, password })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error);
        }
        
        document.getElementById('addEmployeeForm').reset();
        
        // Lade alles neu
        await loadEmployees();
        await loadEmployeeManagement();
        await loadEmployeesForSelect();
        
        showNotification(`Mitarbeiter "${name}" erfolgreich angelegt! ✓`);
    } catch (error) {
        console.error('Fehler:', error);
        showNotification(error.message || 'Fehler beim Anlegen', 'error');
    }
}

// Mitarbeiter löschen
async function deleteEmployee(id, name) {
    if (!confirm(`Mitarbeiter "${name}" wirklich löschen?\n\nAlle Aufgaben bleiben erhalten.`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/employees/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Fehler beim Löschen');
        
        // Lade alles neu
        await loadEmployees();
        await loadEmployeeManagement();
        await loadEmployeesForSelect();
        showNotification(`Mitarbeiter "${name}" gelöscht`);
    } catch (error) {
        console.error('Fehler:', error);
        showNotification('Fehler beim Löschen', 'error');
    }
}

// Mitarbeiter-Passwort ändern
async function changeEmployeePassword(id, name) {
    const newPassword = prompt(`Neues Passwort für "${name}" eingeben:`);
    
    if (!newPassword || !newPassword.trim()) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/employees/${id}/password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: newPassword.trim() })
        });
        
        if (!response.ok) throw new Error('Fehler beim Ändern');
        
        showNotification(`Passwort für "${name}" geändert! 🔑`);
    } catch (error) {
        console.error('Fehler:', error);
        showNotification('Fehler beim Ändern des Passworts', 'error');
    }
}

// HTML escapen
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Benachrichtigung anzeigen
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// App starten
init();

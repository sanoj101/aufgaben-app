// Konfiguration
const API_URL = window.location.origin;

// State
let currentRole = 'chef';
let currentEmployee = '';
let selectedPriority = 'important';
let currentFilter = 'all';
let allTasks = [];
let vapidPublicKey = '';

// Initialisierung
async function init() {
    await loadEmployees();
    await loadVapidKey();
    await loadTasks();
    
    // Service Worker registrieren
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('✓ Service Worker registriert');
        } catch (error) {
            console.error('Service Worker Fehler:', error);
        }
    }

    // Periodisches Neuladen
    setInterval(loadTasks, 30000); // Alle 30 Sekunden
    
    // Online/Offline Status
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();
}

// Online-Status aktualisieren
function updateOnlineStatus() {
    const indicator = document.getElementById('statusIndicator');
    if (navigator.onLine) {
        indicator.className = 'status-indicator';
        indicator.innerHTML = '<span class="status-dot"></span> Verbunden';
        loadTasks();
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
        const employees = await response.json();
        
        const assignSelect = document.getElementById('assignEmployee');
        const currentSelect = document.getElementById('currentEmployee');
        
        assignSelect.innerHTML = '<option value="">-- Mitarbeiter wählen --</option>';
        currentSelect.innerHTML = '<option value="">-- Mitarbeiter wählen --</option>';
        
        employees.forEach(emp => {
            const option1 = document.createElement('option');
            option1.value = emp.name;
            option1.textContent = emp.name;
            assignSelect.appendChild(option1);

            const option2 = document.createElement('option');
            option2.value = emp.name;
            option2.textContent = emp.name;
            currentSelect.appendChild(option2);
        });
    } catch (error) {
        console.error('Fehler beim Laden der Mitarbeiter:', error);
        showNotification('Fehler beim Laden der Mitarbeiter', 'error');
    }
}

// Rolle wechseln
function switchRole(role) {
    currentRole = role;
    
    document.querySelectorAll('.role-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    if (role === 'chef') {
        document.getElementById('chefView').style.display = 'block';
        document.getElementById('mitarbeiterView').style.display = 'none';
        document.getElementById('employeeSelector').style.display = 'none';
        currentFilter = 'all';
    } else {
        document.getElementById('chefView').style.display = 'none';
        document.getElementById('mitarbeiterView').style.display = 'block';
        document.getElementById('employeeSelector').style.display = 'block';
        currentFilter = 'all';
    }
    
    loadTasks();
}

// Mitarbeiter-Auswahl geändert
function onEmployeeChange() {
    currentEmployee = document.getElementById('currentEmployee').value;
    
    if (currentEmployee) {
        document.getElementById('notificationToggle').style.display = 'flex';
        checkNotificationPermission();
    } else {
        document.getElementById('notificationToggle').style.display = 'none';
    }
    
    loadTasks();
}

// Benachrichtigungs-Berechtigung prüfen
async function checkNotificationPermission() {
    if (!('Notification' in window)) {
        document.getElementById('notificationStatus').textContent = 'Nicht unterstützt';
        return;
    }

    if (Notification.permission === 'granted') {
        document.getElementById('notificationStatus').textContent = '✓ Aktiviert';
        document.querySelector('#notificationToggle button').style.display = 'none';
        
        // Push-Subscription prüfen/erstellen
        await subscribeToPush();
    } else if (Notification.permission === 'denied') {
        document.getElementById('notificationStatus').textContent = '✗ Blockiert';
    } else {
        document.getElementById('notificationStatus').textContent = '';
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
            checkNotificationPermission();
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
    try {
        const registration = await navigator.serviceWorker.ready;
        
        let subscription = await registration.pushManager.getSubscription();
        
        if (!subscription) {
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
            });
        }

        // Subscription an Server senden
        await fetch(`${API_URL}/api/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                employee: currentEmployee,
                subscription: subscription.toJSON()
            })
        });

        console.log('✓ Push-Subscription gespeichert');
    } catch (error) {
        console.error('Fehler bei Push-Subscription:', error);
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
        const response = await fetch(`${API_URL}/api/tasks`);
        allTasks = await response.json();
        
        if (currentRole === 'chef') {
            displayTasksForChef(allTasks);
        } else {
            if (!currentEmployee) {
                document.getElementById('myTaskList').innerHTML = `
                    <div class="empty-state">
                        <h3>Bitte wählen Sie einen Mitarbeiter aus</h3>
                    </div>
                `;
                return;
            }
            const myTasks = allTasks.filter(t => t.employee === currentEmployee);
            displayTasksForEmployee(myTasks);
        }
    } catch (error) {
        console.error('Fehler beim Laden der Aufgaben:', error);
        showNotification('Fehler beim Laden der Aufgaben', 'error');
    }
}

// Aufgaben für Chef anzeigen
function displayTasksForChef(tasks) {
    const filteredTasks = filterTasksArray(tasks);
    const taskList = document.getElementById('taskList');
    
    document.getElementById('taskCount').textContent = `${filteredTasks.length} Aufgaben`;
    
    if (filteredTasks.length === 0) {
        taskList.innerHTML = `
            <div class="empty-state">
                <h3>Keine Aufgaben vorhanden</h3>
                <p>Erstellen Sie die erste Aufgabe für Ihr Team</p>
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
                        <img src="${task.photo}" alt="Nachweis-Foto">
                    </div>
                ` : ''}
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
                        <img src="${task.photo}" alt="Nachweis-Foto">
                    </div>
                ` : ''}
                ${task.status === 'open' ? `
                    <div class="task-actions">
                        <button class="action-btn complete-btn" onclick="completeTask(${task.id})">✓ Erledigt</button>
                        <button class="action-btn photo-btn" onclick="document.getElementById('photo-${task.id}').click()">📷 Foto hinzufügen</button>
                        <input type="file" id="photo-${task.id}" class="photo-input" accept="image/*" onchange="addPhoto(${task.id}, event)">
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
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

// Foto hinzufügen
async function addPhoto(taskId, event) {
    const file = event.target.files[0];
    if (!file) return;

    // Größenprüfung (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showNotification('Foto zu groß (max. 5MB)', 'error');
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

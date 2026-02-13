const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const webpush = require('web-push');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// VAPID Keys für Push-Benachrichtigungen
// WICHTIG: In Produktion als Umgebungsvariablen setzen!
const vapidKeys = {
    publicKey: process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh4U',
    privateKey: process.env.VAPID_PRIVATE_KEY || 'UUxI4O8-FbRouAevSmBQ6o18hgE4nSG3qwvJTfKc-ls'
};

webpush.setVapidDetails(
    'mailto:example@yourdomain.org',
    vapidKeys.publicKey,
    vapidKeys.privateKey
);

// Datenbank initialisieren
const db = new sqlite3.Database('./aufgaben.db', (err) => {
    if (err) {
        console.error('Datenbankfehler:', err.message);
    } else {
        console.log('✓ Datenbank verbunden');
        initDatabase();
    }
});

function initDatabase() {
    db.run(`CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        priority TEXT NOT NULL,
        employee TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        photo TEXT,
        overdue_hours INTEGER DEFAULT 48
    )`, (err) => {
        if (err) console.error('Fehler beim Erstellen der Tasks-Tabelle:', err);
        else console.log('✓ Tasks-Tabelle bereit');
    });

    db.run(`CREATE TABLE IF NOT EXISTS subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee TEXT NOT NULL UNIQUE,
        endpoint TEXT NOT NULL,
        keys TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) console.error('Fehler beim Erstellen der Subscriptions-Tabelle:', err);
        else console.log('✓ Subscriptions-Tabelle bereit');
    });

    db.run(`CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) console.error('Fehler beim Erstellen der Employees-Tabelle:', err);
        else console.log('✓ Employees-Tabelle bereit');
    });

    // Standard-Mitarbeiter mit Passwörtern einfügen
    const defaultEmployees = [
        { name: 'Max Müller', password: 'max123' },
        { name: 'Anna Schmidt', password: 'anna123' },
        { name: 'Thomas Weber', password: 'thomas123' },
        { name: 'Lisa Meyer', password: 'lisa123' },
        { name: 'Peter Koch', password: 'peter123' }
    ];
    const stmt = db.prepare('INSERT OR IGNORE INTO employees (name, password) VALUES (?, ?)');
    defaultEmployees.forEach(emp => stmt.run(emp.name, emp.password));
    stmt.finalize();
}

// API Endpoints

// Tobias Login
app.post('/api/login/chef', (req, res) => {
    const { password } = req.body;
    
    if (password === 'Bauer') {
        res.json({ success: true, role: 'chef', name: 'Tobias' });
    } else {
        res.status(401).json({ success: false, error: 'Falsches Passwort' });
    }
});

// Mitarbeiter Login
app.post('/api/login/mitarbeiter', (req, res) => {
    const { name, password } = req.body;
    
    if (!name || !password) {
        res.status(400).json({ error: 'Name und Passwort erforderlich' });
        return;
    }

    db.get('SELECT * FROM employees WHERE name = ? AND password = ?', [name, password], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (row) {
            res.json({ success: true, role: 'mitarbeiter', name: row.name });
        } else {
            res.status(401).json({ success: false, error: 'Falscher Name oder Passwort' });
        }
    });
});

// Mitarbeiter abrufen
app.get('/api/employees', (req, res) => {
    db.all('SELECT * FROM employees ORDER BY name', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Mitarbeiter hinzufügen
app.post('/api/employees', (req, res) => {
    const { name, password } = req.body;
    
    if (!name || !name.trim() || !password || !password.trim()) {
        res.status(400).json({ error: 'Name und Passwort erforderlich' });
        return;
    }

    db.run('INSERT INTO employees (name, password) VALUES (?, ?)', [name.trim(), password.trim()], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                res.status(400).json({ error: 'Mitarbeiter existiert bereits' });
            } else {
                res.status(500).json({ error: err.message });
            }
            return;
        }
        res.json({ id: this.lastID, name: name.trim() });
    });
});

// Mitarbeiter löschen
app.delete('/api/employees/:id', (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM employees WHERE id = ?', [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        if (this.changes === 0) {
            res.status(404).json({ error: 'Mitarbeiter nicht gefunden' });
            return;
        }

        res.json({ success: true, deleted: this.changes });
    });
});

// Mitarbeiter-Passwort ändern
app.put('/api/employees/:id/password', (req, res) => {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || !password.trim()) {
        res.status(400).json({ error: 'Passwort erforderlich' });
        return;
    }

    db.run('UPDATE employees SET password = ? WHERE id = ?', [password.trim(), id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        if (this.changes === 0) {
            res.status(404).json({ error: 'Mitarbeiter nicht gefunden' });
            return;
        }

        res.json({ success: true });
    });
});

// Alle Aufgaben abrufen
app.get('/api/tasks', (req, res) => {
    const { employee, status } = req.query;
    
    let query = 'SELECT * FROM tasks';
    let params = [];
    let conditions = [];

    if (employee) {
        conditions.push('employee = ?');
        params.push(employee);
    }

    if (status) {
        conditions.push('status = ?');
        params.push(status);
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Neue Aufgabe erstellen
app.post('/api/tasks', async (req, res) => {
    const { title, priority, employee, overdueHours } = req.body;

    if (!title || !priority || !employee) {
        res.status(400).json({ error: 'Titel, Priorität und Mitarbeiter erforderlich' });
        return;
    }

    const query = `INSERT INTO tasks (title, priority, employee, status, overdue_hours) 
                   VALUES (?, ?, ?, 'open', ?)`;
    
    db.run(query, [title, priority, employee, overdueHours || 48], async function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        const taskId = this.lastID;

        console.log(`[NEUE AUFGABE] Erstellt: "${title}" für ${employee} (ID: ${taskId})`);

        // Push-Benachrichtigung an Mitarbeiter senden
        try {
            await sendPushNotification(employee, {
                title: '📋 Neue Aufgabe zugewiesen',
                body: `Dir wurde die Aufgabe "${title}" zugewiesen`,
                taskId: taskId
            });
            console.log(`✓ Push-Benachrichtigung an ${employee} gesendet für Aufgabe: ${title}`);
        } catch (error) {
            console.error(`✗ Push-Fehler für ${employee}:`, error.message);
        }

        res.json({ 
            id: taskId, 
            title, 
            priority, 
            employee, 
            status: 'open',
            created_at: new Date().toISOString()
        });
    });
});

// Aufgabe aktualisieren
app.put('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    const { status, photo } = req.body;

    let updates = [];
    let params = [];

    if (status) {
        updates.push('status = ?');
        params.push(status);
        
        if (status === 'completed') {
            updates.push('completed_at = CURRENT_TIMESTAMP');
        } else if (status === 'open') {
            updates.push('completed_at = NULL');
        }
    }

    if (photo !== undefined) {
        updates.push('photo = ?');
        params.push(photo);
    }

    if (updates.length === 0) {
        res.status(400).json({ error: 'Keine Updates angegeben' });
        return;
    }

    params.push(id);
    const query = `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`;

    db.run(query, params, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        if (this.changes === 0) {
            res.status(404).json({ error: 'Aufgabe nicht gefunden' });
            return;
        }

        // Hole Aufgaben-Details für Push-Benachrichtigung
        db.get('SELECT * FROM tasks WHERE id = ?', [id], (err, task) => {
            if (err || !task) {
                res.json({ success: true, changes: this.changes });
                return;
            }

            // Push-Benachrichtigung an Tobias senden bei Statusänderung oder Foto
            if (status === 'completed') {
                // Benachrichtige Tobias dass Aufgabe erledigt wurde
                sendPushToChef({
                    title: '✅ Aufgabe erledigt',
                    body: `${task.employee} hat "${task.title}" erledigt`,
                    taskId: id
                });
                console.log(`✓ Push an Tobias: ${task.employee} hat "${task.title}" erledigt`);
            } else if (photo) {
                // Benachrichtige Tobias dass Foto hinzugefügt wurde
                sendPushToChef({
                    title: '📷 Foto hinzugefügt',
                    body: `${task.employee} hat ein Foto zu "${task.title}" hinzugefügt`,
                    taskId: id
                });
                console.log(`✓ Push an Tobias: Foto hinzugefügt zu "${task.title}"`);
            } else if (status === 'open') {
                // Benachrichtige Tobias dass Aufgabe wieder geöffnet wurde
                sendPushToChef({
                    title: '🔄 Aufgabe wieder geöffnet',
                    body: `${task.employee} hat "${task.title}" wieder geöffnet`,
                    taskId: id
                });
                console.log(`✓ Push an Tobias: Aufgabe "${task.title}" wieder geöffnet`);
            }
        });

        res.json({ success: true, changes: this.changes });
    });
});

// Aufgabe löschen
app.delete('/api/tasks/:id', (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM tasks WHERE id = ?', [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        res.json({ success: true, changes: this.changes });
    });
});

// Aufgabe löschen
app.delete('/api/tasks/:id', (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM tasks WHERE id = ?', [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        res.json({ success: true, changes: this.changes });
    });
});

// Alte erledigte Aufgaben löschen (älter als 7 Tage)
app.post('/api/tasks/cleanup', (req, res) => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    db.run(`DELETE FROM tasks WHERE status = 'completed' AND completed_at < ?`, 
        [sevenDaysAgo], 
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ deleted: this.changes });
        }
    );
});

// Push-Subscription speichern
app.post('/api/subscribe', (req, res) => {
    const { employee, subscription } = req.body;

    if (!employee || !subscription) {
        res.status(400).json({ error: 'Mitarbeiter und Subscription erforderlich' });
        return;
    }

    const query = `INSERT OR REPLACE INTO subscriptions (employee, endpoint, keys) 
                   VALUES (?, ?, ?)`;
    
    db.run(query, 
        [employee, subscription.endpoint, JSON.stringify(subscription.keys)], 
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ success: true });
        }
    );
});

// Push-Subscription abrufen
app.get('/api/subscribe/:employee', (req, res) => {
    const { employee } = req.params;

    db.get('SELECT * FROM subscriptions WHERE employee = ?', [employee], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (!row) {
            res.status(404).json({ error: 'Keine Subscription gefunden' });
            return;
        }

        res.json({
            endpoint: row.endpoint,
            keys: JSON.parse(row.keys)
        });
    });
});

// VAPID Public Key abrufen
app.get('/api/vapid-public-key', (req, res) => {
    res.json({ publicKey: vapidKeys.publicKey });
});

// DEBUG: Alle Subscriptions anzeigen
app.get('/api/debug/subscriptions', (req, res) => {
    db.all('SELECT employee, endpoint FROM subscriptions', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ 
            count: rows.length,
            subscriptions: rows 
        });
    });
});

// DEBUG: Test-Push senden
app.post('/api/debug/test-push/:employee', async (req, res) => {
    const { employee } = req.params;
    
    try {
        await sendPushNotification(employee, {
            title: '🔔 TEST-Benachrichtigung',
            body: `Dies ist eine Test-Push für ${employee}`,
            taskId: 0
        });
        res.json({ success: true, message: `Test-Push an ${employee} gesendet` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Hilfsfunktion: Push-Benachrichtigung senden
async function sendPushNotification(employee, data) {
    db.get('SELECT * FROM subscriptions WHERE employee = ?', [employee], async (err, row) => {
        if (err || !row) {
            console.log(`Keine Push-Subscription für ${employee}`);
            return;
        }

        const subscription = {
            endpoint: row.endpoint,
            keys: JSON.parse(row.keys)
        };

        const payload = JSON.stringify(data);

        try {
            await webpush.sendNotification(subscription, payload);
            console.log(`✓ Push-Benachrichtigung an ${employee} gesendet`);
        } catch (error) {
            console.error(`Fehler beim Senden der Push-Benachrichtigung:`, error);
            
            // Ungültige Subscription entfernen
            if (error.statusCode === 410) {
                db.run('DELETE FROM subscriptions WHERE employee = ?', [employee]);
            }
        }
    });
}

// Hilfsfunktion: Push-Benachrichtigung an Tobias senden
async function sendPushToChef(data) {
    db.get('SELECT * FROM subscriptions WHERE employee = ?', ['Tobias'], async (err, row) => {
        if (err || !row) {
            console.log('Keine Push-Subscription für Tobias');
            return;
        }

        const subscription = {
            endpoint: row.endpoint,
            keys: JSON.parse(row.keys)
        };

        const payload = JSON.stringify(data);

        try {
            await webpush.sendNotification(subscription, payload);
            console.log('✓ Push-Benachrichtigung an Tobias gesendet');
        } catch (error) {
            console.error('Fehler beim Senden der Push-Benachrichtigung an Tobias:', error);
            
            // Ungültige Subscription entfernen
            if (error.statusCode === 410) {
                db.run('DELETE FROM subscriptions WHERE employee = ?', ['Tobias']);
            }
        }
    });
}

// Automatische Bereinigung alle 6 Stunden
setInterval(() => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    db.run(`DELETE FROM tasks WHERE status = 'completed' AND completed_at < ?`, [sevenDaysAgo], function(err) {
        if (!err && this.changes > 0) {
            console.log(`✓ ${this.changes} alte Aufgaben automatisch gelöscht`);
        }
    });
}, 6 * 60 * 60 * 1000);

// Server starten
app.listen(PORT, () => {
    console.log(`\n🚀 Server läuft auf Port ${PORT}`);
    console.log(`📱 App verfügbar unter: http://localhost:${PORT}`);
    console.log(`🔔 Push-Benachrichtigungen aktiviert\n`);
});

// Graceful Shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('\n✓ Datenbank geschlossen');
        process.exit(0);
    });
});

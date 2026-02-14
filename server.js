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

    db.run(`CREATE TABLE IF NOT EXISTS admin_config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        name TEXT NOT NULL DEFAULT 'Tobias',
        password TEXT NOT NULL DEFAULT 'Bauer'
    )`, (err) => {
        if (err) console.error('Fehler beim Erstellen der Admin-Config-Tabelle:', err);
        else {
            console.log('✓ Admin-Config-Tabelle bereit');
            // Initialisiere Admin falls nicht vorhanden
            db.run(`INSERT OR IGNORE INTO admin_config (id, name, password) VALUES (1, 'Tobias', 'Bauer')`);
        }
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
    
    db.get('SELECT * FROM admin_config WHERE id = 1', [], (err, admin) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (!admin) {
            res.status(500).json({ error: 'Admin-Konfiguration nicht gefunden' });
            return;
        }
        
        if (password === admin.password) {
            res.json({ success: true, role: 'chef', name: admin.name });
        } else {
            res.status(401).json({ success: false, error: 'Falsches Passwort' });
        }
    });
});

// Chef/Tobias Namen ändern
app.put('/api/chef/name', (req, res) => {
    const { name } = req.body;

    if (!name || !name.trim()) {
        res.status(400).json({ error: 'Name erforderlich' });
        return;
    }

    const oldName = 'Tobias'; // Wird aus DB geholt
    
    db.get('SELECT name FROM admin_config WHERE id = 1', [], (err, admin) => {
        if (err || !admin) {
            res.status(500).json({ error: 'Admin nicht gefunden' });
            return;
        }
        
        const currentName = admin.name;
        
        db.run('UPDATE admin_config SET name = ? WHERE id = 1', [name.trim()], function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }

            // Update auch die Subscriptions
            db.run('UPDATE subscriptions SET employee = ? WHERE employee = ?', 
                [name.trim(), currentName], 
                (err) => {
                    if (err) console.error('Fehler beim Update der Subscriptions:', err);
                }
            );
            
            // Update auch die Aufgaben
            db.run('UPDATE tasks SET employee = ? WHERE employee = ?',
                [name.trim(), currentName],
                (err) => {
                    if (err) console.error('Fehler beim Update der Aufgaben:', err);
                }
            );

            res.json({ success: true, updated: this.changes });
        });
    });
});

// Chef/Tobias Passwort ändern
app.put('/api/chef/password', (req, res) => {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword || !newPassword.trim()) {
        res.status(400).json({ error: 'Altes und neues Passwort erforderlich' });
        return;
    }

    db.get('SELECT password FROM admin_config WHERE id = 1', [], (err, admin) => {
        if (err || !admin) {
            res.status(500).json({ error: 'Admin nicht gefunden' });
            return;
        }
        
        if (oldPassword !== admin.password) {
            res.status(401).json({ error: 'Aktuelles Passwort ist falsch' });
            return;
        }
        
        db.run('UPDATE admin_config SET password = ? WHERE id = 1', [newPassword.trim()], function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }

            res.json({ success: true, updated: this.changes });
        });
    });
});

// Chef-Namen abrufen
app.get('/api/chef/name', (req, res) => {
    db.get('SELECT name FROM admin_config WHERE id = 1', [], (err, admin) => {
        if (err || !admin) {
            res.json({ name: 'Tobias' }); // Fallback
            return;
        }
        res.json({ name: admin.name });
    });
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

// Mitarbeiter-Namen ändern
app.put('/api/employees/:id/name', (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
        res.status(400).json({ error: 'Name erforderlich' });
        return;
    }

    db.run('UPDATE employees SET name = ? WHERE id = ?', [name.trim(), id], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                res.status(400).json({ error: 'Name bereits vergeben' });
            } else {
                res.status(500).json({ error: err.message });
            }
            return;
        }

        if (this.changes === 0) {
            res.status(404).json({ error: 'Mitarbeiter nicht gefunden' });
            return;
        }

        // Update auch die Subscriptions
        db.run('UPDATE subscriptions SET employee = ? WHERE employee = (SELECT name FROM employees WHERE id = ?)', 
            [name.trim(), id], 
            (err) => {
                if (err) console.error('Fehler beim Update der Subscriptions:', err);
            }
        );

        res.json({ success: true, updated: this.changes });
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

// An Aufgabe erinnern
app.post('/api/tasks/:id/remind', async (req, res) => {
    const { id } = req.params;
    
    try {
        // Hole Aufgaben-Details
        db.get('SELECT * FROM tasks WHERE id = ?', [id], async (err, task) => {
            if (err || !task) {
                res.status(404).json({ error: 'Aufgabe nicht gefunden' });
                return;
            }
            
            // Sende Erinnerungs-Push an Mitarbeiter
            try {
                await sendPushNotification(task.employee, {
                    title: '🔔 Erinnerung: Aufgabe offen',
                    body: `Bitte erledige: "${task.title}"`,
                    taskId: id
                });
                
                console.log(`✓ Erinnerung an ${task.employee} gesendet für Aufgabe: ${task.title}`);
                res.json({ success: true, message: 'Erinnerung gesendet' });
            } catch (error) {
                console.error(`✗ Fehler beim Senden der Erinnerung:`, error);
                res.status(500).json({ error: 'Fehler beim Senden der Erinnerung' });
            }
        });
    } catch (error) {
        console.error('Fehler:', error);
        res.status(500).json({ error: error.message });
    }
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
app.get('/api/debug/test-push/:employee', async (req, res) => {
    const { employee } = req.params;
    
    console.log(`\n🔍 DEBUG: Test-Push für ${employee} wird gesendet...`);
    
    try {
        const result = await sendPushNotification(employee, {
            title: '🔔 TEST-Benachrichtigung',
            body: `Dies ist eine Test-Push für ${employee}`,
            taskId: 0
        });
        
        console.log(`✅ Test-Push Ergebnis:`, result);
        
        res.json({ 
            success: true, 
            message: `Test-Push an ${employee} gesendet`,
            result: result
        });
    } catch (error) {
        console.error(`❌ Test-Push Fehler:`, error);
        res.status(500).json({ 
            error: error.message,
            stack: error.stack
        });
    }
});

// Hilfsfunktion: Push-Benachrichtigung senden
function sendPushNotification(employee, data) {
    console.log(`\n📤 sendPushNotification aufgerufen für: ${employee}`);
    console.log(`   Daten:`, JSON.stringify(data));
    
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM subscriptions WHERE employee = ?', [employee], async (err, row) => {
            if (err) {
                console.log(`❌ DB-Fehler bei Push für ${employee}:`, err);
                return reject(err);
            }
            
            if (!row) {
                console.log(`⚠️  Keine Push-Subscription für "${employee}" gefunden!`);
                console.log(`   Verfügbare Subscriptions in DB prüfen...`);
                
                // Zeige alle verfügbaren Subscriptions
                db.all('SELECT employee FROM subscriptions', [], (err2, rows) => {
                    if (!err2 && rows) {
                        console.log(`   Verfügbare: ${rows.map(r => `"${r.employee}"`).join(', ')}`);
                    }
                });
                
                return resolve({ sent: false, reason: 'no_subscription' });
            }

            console.log(`✓ Subscription gefunden für ${employee}`);
            console.log(`   Endpoint: ${row.endpoint.substring(0, 50)}...`);

            const subscription = {
                endpoint: row.endpoint,
                keys: JSON.parse(row.keys)
            };

            const payload = JSON.stringify(data);
            console.log(`   Payload: ${payload}`);

            try {
                console.log(`   📡 Sende Push via webpush.sendNotification...`);
                const result = await webpush.sendNotification(subscription, payload);
                console.log(`✅ Push-Benachrichtigung an ${employee} ERFOLGREICH gesendet!`);
                console.log(`   Webpush Result:`, result);
                resolve({ sent: true, result });
            } catch (error) {
                console.error(`❌ Push-Fehler für ${employee}:`);
                console.error(`   Error:`, error.message);
                console.error(`   StatusCode:`, error.statusCode);
                console.error(`   Body:`, error.body);
                
                // Ungültige Subscription entfernen
                if (error.statusCode === 410) {
                    db.run('DELETE FROM subscriptions WHERE employee = ?', [employee]);
                    console.log(`🗑️  Ungültige Subscription für ${employee} gelöscht`);
                }
                
                reject(error);
            }
        });
    });
}

// Hilfsfunktion: Push-Benachrichtigung an Tobias senden
function sendPushToChef(data) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM subscriptions WHERE employee = ?', ['Tobias'], async (err, row) => {
            if (err) {
                console.log('❌ DB-Fehler bei Push für Tobias:', err);
                return reject(err);
            }
            
            if (!row) {
                console.log('⚠️ Keine Push-Subscription für Tobias');
                return resolve({ sent: false, reason: 'no_subscription' });
            }

            const subscription = {
                endpoint: row.endpoint,
                keys: JSON.parse(row.keys)
            };

            const payload = JSON.stringify(data);

            try {
                await webpush.sendNotification(subscription, payload);
                console.log('✅ Push-Benachrichtigung an Tobias gesendet');
                resolve({ sent: true });
            } catch (error) {
                console.error('❌ Push-Fehler für Tobias:', error.message);
                
                // Ungültige Subscription entfernen
                if (error.statusCode === 410) {
                    db.run('DELETE FROM subscriptions WHERE employee = ?', ['Tobias']);
                    console.log('🗑️ Ungültige Subscription für Tobias gelöscht');
                }
                
                reject(error);
            }
        });
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

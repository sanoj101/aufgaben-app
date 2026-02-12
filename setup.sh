#!/bin/bash

echo "========================================"
echo "  AUFGABEN-APP SETUP"
echo "========================================"
echo ""
echo "Dieses Skript erstellt die richtige Ordnerstruktur"
echo "und prüft alle Dateien."
echo ""
read -p "Drücke Enter um fortzufahren..."

# Prüfe ob wir im richtigen Ordner sind
if [ ! -f "server.js" ]; then
    echo "FEHLER: Bitte führe dieses Skript im aufgaben-app Ordner aus!"
    echo "Der Ordner sollte die Datei 'server.js' enthalten."
    exit 1
fi

echo "[1/5] Prüfe Dateien im Hauptordner..."
MISSING=0

if [ ! -f "server.js" ]; then
    echo "  ✗ server.js fehlt!"
    MISSING=1
else
    echo "  ✓ server.js"
fi

if [ ! -f "package.json" ]; then
    echo "  ✗ package.json fehlt!"
    MISSING=1
else
    echo "  ✓ package.json"
fi

if [ ! -f ".gitignore" ]; then
    echo "  ✗ .gitignore fehlt!"
    MISSING=1
else
    echo "  ✓ .gitignore"
fi

if [ ! -f ".env.example" ]; then
    echo "  ✗ .env.example fehlt!"
    MISSING=1
else
    echo "  ✓ .env.example"
fi

if [ ! -f "README.md" ]; then
    echo "  ✗ README.md fehlt!"
    MISSING=1
else
    echo "  ✓ README.md"
fi

if [ ! -f "RAILWAY_DEPLOYMENT.md" ]; then
    echo "  ✗ RAILWAY_DEPLOYMENT.md fehlt!"
    MISSING=1
else
    echo "  ✓ RAILWAY_DEPLOYMENT.md"
fi

if [ ! -f "KOMPLETTE_ANLEITUNG.md" ]; then
    echo "  ✗ KOMPLETTE_ANLEITUNG.md fehlt!"
    MISSING=1
else
    echo "  ✓ KOMPLETTE_ANLEITUNG.md"
fi

echo ""
echo "[2/5] Erstelle public Ordner falls nicht vorhanden..."
if [ ! -d "public" ]; then
    mkdir public
    echo "  Public Ordner erstellt!"
else
    echo "  Public Ordner existiert bereits."
fi

echo ""
echo "[3/5] Prüfe Dateien im public Ordner..."

if [ ! -f "public/index.html" ]; then
    echo "  ✗ public/index.html fehlt!"
    MISSING=1
else
    echo "  ✓ public/index.html"
fi

if [ ! -f "public/app.js" ]; then
    echo "  ✗ public/app.js fehlt!"
    MISSING=1
else
    echo "  ✓ public/app.js"
fi

if [ ! -f "public/sw.js" ]; then
    echo "  ✗ public/sw.js fehlt!"
    MISSING=1
else
    echo "  ✓ public/sw.js"
fi

if [ ! -f "public/manifest.json" ]; then
    echo "  ✗ public/manifest.json fehlt!"
    MISSING=1
else
    echo "  ✓ public/manifest.json"
fi

echo ""
echo "[4/5] Prüfe ob Node.js installiert ist..."
if command -v node &> /dev/null; then
    echo "  ✓ Node.js ist installiert:"
    node --version
else
    echo "  ✗ Node.js ist NICHT installiert!"
    echo "  Bitte installiere Node.js von: https://nodejs.org"
    MISSING=1
fi

echo ""
echo "[5/5] Prüfe ob Git installiert ist..."
if command -v git &> /dev/null; then
    echo "  ✓ Git ist installiert:"
    git --version
else
    echo "  ✗ Git ist NICHT installiert!"
    echo "  Bitte installiere Git von: https://git-scm.com"
    MISSING=1
fi

echo ""
echo "========================================"
echo "  ERGEBNIS"
echo "========================================"

if [ $MISSING -eq 1 ]; then
    echo ""
    echo "FEHLER: Einige Dateien oder Programme fehlen!"
    echo "Bitte behebe die oben markierten Probleme."
    echo ""
    exit 1
else
    echo ""
    echo "PERFEKT! Alles ist bereit! (^_^)/"
    echo ""
    echo "Du kannst jetzt starten:"
    echo "  1. npm install         - Abhängigkeiten installieren"
    echo "  2. npm run generate-vapid - VAPID Keys generieren"
    echo "  3. npm start           - Server lokal testen"
    echo ""
    echo "Oder folge der KOMPLETTE_ANLEITUNG.md Schritt für Schritt!"
    echo ""
fi

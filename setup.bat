@echo off
echo ========================================
echo  AUFGABEN-APP SETUP
echo ========================================
echo.
echo Dieses Skript erstellt die richtige Ordnerstruktur
echo und prueft alle Dateien.
echo.
pause

:: Pruefe ob wir im richtigen Ordner sind
if not exist "server.js" (
    echo FEHLER: Bitte fuehre dieses Skript im aufgaben-app Ordner aus!
    echo Der Ordner sollte die Datei "server.js" enthalten.
    pause
    exit /b 1
)

echo [1/5] Pruefe Dateien im Hauptordner...
set MISSING=0

if not exist "server.js" (
    echo   X server.js fehlt!
    set MISSING=1
) else (
    echo   OK server.js
)

if not exist "package.json" (
    echo   X package.json fehlt!
    set MISSING=1
) else (
    echo   OK package.json
)

if not exist ".gitignore" (
    echo   X .gitignore fehlt!
    set MISSING=1
) else (
    echo   OK .gitignore
)

if not exist ".env.example" (
    echo   X .env.example fehlt!
    set MISSING=1
) else (
    echo   OK .env.example
)

if not exist "README.md" (
    echo   X README.md fehlt!
    set MISSING=1
) else (
    echo   OK README.md
)

if not exist "RAILWAY_DEPLOYMENT.md" (
    echo   X RAILWAY_DEPLOYMENT.md fehlt!
    set MISSING=1
) else (
    echo   OK RAILWAY_DEPLOYMENT.md
)

if not exist "KOMPLETTE_ANLEITUNG.md" (
    echo   X KOMPLETTE_ANLEITUNG.md fehlt!
    set MISSING=1
) else (
    echo   OK KOMPLETTE_ANLEITUNG.md
)

echo.
echo [2/5] Erstelle public Ordner falls nicht vorhanden...
if not exist "public" (
    mkdir public
    echo   Public Ordner erstellt!
) else (
    echo   Public Ordner existiert bereits.
)

echo.
echo [3/5] Pruefe Dateien im public Ordner...

if not exist "public\index.html" (
    echo   X public\index.html fehlt!
    set MISSING=1
) else (
    echo   OK public\index.html
)

if not exist "public\app.js" (
    echo   X public\app.js fehlt!
    set MISSING=1
) else (
    echo   OK public\app.js
)

if not exist "public\sw.js" (
    echo   X public\sw.js fehlt!
    set MISSING=1
) else (
    echo   OK public\sw.js
)

if not exist "public\manifest.json" (
    echo   X public\manifest.json fehlt!
    set MISSING=1
) else (
    echo   OK public\manifest.json
)

echo.
echo [4/5] Pruefe ob Node.js installiert ist...
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   X Node.js ist NICHT installiert!
    echo   Bitte installiere Node.js von: https://nodejs.org
    set MISSING=1
) else (
    echo   OK Node.js ist installiert: 
    node --version
)

echo.
echo [5/5] Pruefe ob Git installiert ist...
git --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   X Git ist NICHT installiert!
    echo   Bitte installiere Git von: https://git-scm.com
    set MISSING=1
) else (
    echo   OK Git ist installiert:
    git --version
)

echo.
echo ========================================
echo  ERGEBNIS
echo ========================================

if %MISSING% EQU 1 (
    echo.
    echo FEHLER: Einige Dateien oder Programme fehlen!
    echo Bitte behebe die oben markierten Probleme.
    echo.
    pause
    exit /b 1
) else (
    echo.
    echo PERFEKT! Alles ist bereit! ^(^_^)^/
    echo.
    echo Du kannst jetzt starten:
    echo   1. npm install         - Abhaengigkeiten installieren
    echo   2. npm run generate-vapid - VAPID Keys generieren
    echo   3. npm start           - Server lokal testen
    echo.
    echo Oder folge der KOMPLETTE_ANLEITUNG.md Schritt fuer Schritt!
    echo.
)

pause

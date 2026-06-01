@echo off
:: build.bat — Concatenate and obfuscate JS files for deployment.
:: Run this every time you edit config.js, engine.js, solver.js, or app.js.
:: The deployed page uses dist\bundle.js; source files remain editable.

cd /d "%~dp0"
if not exist dist mkdir dist

echo [1/2] Concatenating JS sources...
type config.js engine.js solver.js app.js > _tmp.js

echo [2/2] Obfuscating...
call javascript-obfuscator _tmp.js --output bundle.js ^
  --compact true ^
  --string-array true ^
  --string-array-encoding base64 ^
  --string-array-threshold 0.75 ^
  --string-array-rotate true ^
  --string-array-shuffle true ^
  --split-strings true ^
  --split-strings-chunk-length 10 ^
  --identifier-names-generator hexadecimal ^
  --self-defending true

del _tmp.js

echo Done.  Commit bundle.js and index.html.

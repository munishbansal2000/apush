@echo off
REM One-click LTX setup + verification for video2 pipeline.
REM Creates venv, installs deps, verifies CUDA, tests generation.
REM
REM Usage: tools\ltx-one-click.bat
REM Takes ~10 min first run (downloads torch + 20GB model on test).

setlocal
set VENV_DIR=C:\Users\%USERNAME%\ltx-env
set PY312=C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python312\python.exe
set TOOLS_DIR=%~dp0

echo === [1/5] Venv ===
if exist "%VENV_DIR%\Scripts\python.exe" (
    echo   Exists, reusing.
) else (
    echo   Creating...
    "%PY312%" -m venv "%VENV_DIR%"
    if errorlevel 1 (echo FATAL: venv creation failed. & exit /b 1)
)

echo === [2/5] Dependencies ===
"%VENV_DIR%\Scripts\pip.exe" install -q -r "%TOOLS_DIR%requirements-ltx.txt"
if errorlevel 1 (echo FATAL: pip install failed. & exit /b 1)
echo   OK.

echo === [3/5] CUDA check ===
"%VENV_DIR%\Scripts\python.exe" -c "import torch; assert torch.cuda.is_available(), 'no CUDA'; print('  ', torch.cuda.get_device_name(0))"
if errorlevel 1 (echo FATAL: CUDA not available. & exit /b 1)

echo === [4/5] Setup verification ===
"%VENV_DIR%\Scripts\python.exe" "%TOOLS_DIR%test-ltx-setup.py"
if errorlevel 1 (echo WARN: setup check had issues, see above.)

echo === [5/5] Test generation (~3 min) ===
"%VENV_DIR%\Scripts\python.exe" "%TOOLS_DIR%test-ltx-generate.py"
if errorlevel 1 (echo FATAL: test generation failed. & exit /b 1)

echo.
echo === ALL GREEN ===
echo LTX is ready. In a NEW terminal:
echo   npm run pipeline:dev -- --episode u3e1 --video-gen ltx --stages clips
echo.
echo To skip this next time, set once:
echo   setx LTX_PYTHON "%VENV_DIR%\Scripts\python.exe"
echo.

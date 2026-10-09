@echo off
REM Setup LTX video generation environment for video2 pipeline
REM Run once per machine. Requires Python 3.12+ and NVIDIA GPU with CUDA.
REM
REM Usage: tools\setup-ltx-env.bat
REM Then open a NEW terminal and run the pipeline.

setlocal

set VENV_DIR=C:\Users\%USERNAME%\ltx-env
set PY312=C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python312\python.exe

echo [1/4] Creating venv at %VENV_DIR% ...
if exist "%VENV_DIR%" (
    echo   Venv already exists, skipping creation.
) else (
    "%PY312%" -m venv "%VENV_DIR%"
    if errorlevel 1 (
        echo ERROR: Failed to create venv. Is Python 3.12 installed at %PY312%?
        exit /b 1
    )
)

echo [2/4] Installing LTX requirements ...
"%VENV_DIR%\Scripts\pip.exe" install -r "%~dp0requirements-ltx.txt"
if errorlevel 1 (
    echo ERROR: pip install failed.
    exit /b 1
)

echo [3/4] Verifying torch CUDA kernel execution ...
"%VENV_DIR%\Scripts\python.exe" -c "import torch; assert torch.cuda.is_available(), 'CUDA not available'; x=torch.zeros(1,device='cuda'); torch.cuda.synchronize(); print('Torch:',torch.__version__,'CUDA:',torch.version.cuda,'GPU:',torch.cuda.get_device_name(0),'arches:',torch.cuda.get_arch_list())"
if errorlevel 1 (
    echo ERROR: torch CUDA check failed. Check your NVIDIA driver.
    exit /b 1
)

echo [4/4] Setting LTX_PYTHON ...
setx LTX_PYTHON "%VENV_DIR%\Scripts\python.exe"
if errorlevel 1 (
    echo ERROR: setx failed.
    exit /b 1
)

echo.
echo Done. Open a NEW terminal, then run:
echo   npm run pipeline:dev -- --episode u3e1 --video-gen ltx --stages clips
echo.

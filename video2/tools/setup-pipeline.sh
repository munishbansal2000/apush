#!/usr/bin/env bash
# macOS/Linux twin of setup-pipeline.ps1: .venv-pipeline with Edge TTS + Vosk, the small English Vosk model, and an
# ffmpeg/ffprobe check. Usage: npm run setup:pipeline:unix [-- --force]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENV="$ROOT/.venv-pipeline"
MODEL_ROOT="$ROOT/models"
MODEL="$MODEL_ROOT/vosk-model-small-en-us-0.15"
MODEL_URL="https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip"

if [[ "${1:-}" == "--force" && -d "$VENV" ]]; then
  [[ "$VENV" == "$ROOT/.venv-pipeline" ]] || { echo "refusing to remove unexpected path: $VENV" >&2; exit 1; }
  rm -rf "$VENV"
fi
if [[ ! -x "$VENV/bin/python" ]]; then
  BOOT="${PIPELINE_BOOTSTRAP_PYTHON:-$(command -v python3 || true)}"
  [[ -n "$BOOT" ]] || { echo "No python3 found. Set PIPELINE_BOOTSTRAP_PYTHON to a Python 3.11/3.12 executable." >&2; exit 1; }
  echo "[setup] creating $VENV with $BOOT"
  "$BOOT" -m venv "$VENV"
fi
echo "[setup] installing Edge TTS and Vosk"
"$VENV/bin/python" -m pip install --upgrade pip
"$VENV/bin/python" -m pip install -r "$ROOT/requirements-pipeline.txt"
if [[ ! -d "$MODEL" ]]; then
  mkdir -p "$MODEL_ROOT"
  ZIP="$(mktemp -t apush-vosk).zip"
  echo "[setup] downloading Vosk English model (~40 MB)"
  curl -fL "$MODEL_URL" -o "$ZIP"
  unzip -q "$ZIP" -d "$MODEL_ROOT"
  rm -f "$ZIP"
fi
for tool in ffmpeg ffprobe; do
  command -v "$tool" >/dev/null || { echo "[setup] $tool not found; install it (macOS: brew install ffmpeg)" >&2; exit 1; }
done
"$VENV/bin/python" -c "import vosk, edge_tts; print('[setup] vosk + edge-tts ready')"
echo "[setup] Vosk model: $MODEL"

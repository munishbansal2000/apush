"""Optional end-to-end smoke test using a tiny in-process mock Fish server."""
import base64
import io
import json
import sys
import tempfile
import threading
import wave
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "video_pipeline"))

import orchestrator


def silent_wav(seconds: float = 1.0) -> bytes:
    target = io.BytesIO()
    with wave.open(target, "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(24000)
        handle.writeframes(b"\0\0" * int(24000 * seconds))
    return target.getvalue()


class Handler(BaseHTTPRequestHandler):
    audio = silent_wav()

    def log_message(self, *_args):
        pass

    def send_json(self, value):
        body = json.dumps(value).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        self.send_json({"status": "ok", "model": "mock-fish", "device": "test"})

    def do_POST(self):
        length = int(self.headers.get("Content-Length", "0"))
        json.loads(self.rfile.read(length))
        self.send_json({
            "audio_base64": base64.b64encode(self.audio).decode("ascii"),
            "sample_rate": 24000,
            "duration": 1.0
        })


def main() -> None:
    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        with tempfile.TemporaryDirectory() as value:
            root = Path(value)
            Image.new("RGB", (1280, 720), (45, 105, 170)).save(root / "base.png")
            (root / "voice.wav").write_bytes(Handler.audio)
            (root / "voice.txt").write_text("Mock reference transcript.", encoding="utf-8")
            manifest = {
                "schema_version": 1,
                "lesson_id": "e2e-smoke",
                "title": "Pipeline smoke test",
                "output": "output.mp4",
                "tts": {
                    "server_url": f"http://127.0.0.1:{server.server_port}",
                    "reference_audio": "voice.wav",
                    "reference_text": "voice.txt"
                },
                "scenes": [{
                    "id": "intro",
                    "narration": {"text": "This verifies the complete lesson video pipeline."},
                    "visual": {"base_image": "base.png"},
                    "animation": {
                        "type": "title",
                        "title": "APUSH",
                        "subtitle": "End-to-end smoke test"
                    }
                }]
            }
            path = root / "lesson.json"
            path.write_text(json.dumps(manifest), encoding="utf-8")
            code = orchestrator.main([
                "--manifest", str(path), "--workdir", str(root / "work"),
                "--preview"
            ])
            if code != 0 or not (root / "output.mp4").is_file():
                raise RuntimeError("end-to-end smoke test did not produce output")
            print("end-to-end smoke: ALL GATES GREEN")
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


if __name__ == "__main__":
    main()

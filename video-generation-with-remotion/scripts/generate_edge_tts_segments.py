"""
Generate per-scene EdgeTTS narration audio and an audio manifest.

Input JSON example:
{
  "voice": "zh-CN-YunjianNeural",
  "speed": 1.35,
  "fps": 30,
  "targetDurationSeconds": 40,
  "scenes": [
    {"id": "scene_001", "narration": "第一页旁白。"},
    {"id": "scene_002", "narration": "第二页旁白。"}
  ]
}
"""

from __future__ import annotations

import argparse
import asyncio
import json
import math
import subprocess
from pathlib import Path
from typing import Any

from tts_util import edge_tts
from tts_voices import speed_to_rate


def _probe_duration(path: Path) -> float:
    try:
        import ffmpeg  # type: ignore

        probe = ffmpeg.probe(str(path))
        return max(0.1, float(probe["format"]["duration"]))
    except Exception:
        result = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                str(path),
            ],
            check=True,
            capture_output=True,
            text=True,
        )
        return max(0.1, float(result.stdout.strip()))


def _extract_scenes(payload: dict[str, Any]) -> list[dict[str, str]]:
    raw_scenes = payload.get("scenes")
    if not isinstance(raw_scenes, list):
        narration = str(payload.get("narration") or payload.get("title") or "").strip()
        raw_scenes = [{"id": "scene_001", "narration": narration}]

    scenes: list[dict[str, str]] = []
    for index, scene in enumerate(raw_scenes):
        if not isinstance(scene, dict):
            continue
        text = str(scene.get("narration") or scene.get("text") or scene.get("title") or "").strip()
        if not text:
            continue
        scene_id = str(scene.get("id") or f"scene_{index + 1:03d}").strip()
        scenes.append({"id": scene_id, "text": text})
    return scenes


async def _generate(payload: dict[str, Any], output_dir: Path) -> dict[str, Any]:
    fps = int(payload.get("fps") or 30)
    voice = str(payload.get("voice") or "zh-CN-YunjianNeural")
    speed = float(payload.get("speed") or 1.35)
    rate = speed_to_rate(speed)
    pad_frames = int(payload.get("padFrames") or 12)
    scenes = _extract_scenes(payload)
    if not scenes:
        raise RuntimeError("No narration segments were generated")

    audio_dir = output_dir / "audio"
    audio_dir.mkdir(parents=True, exist_ok=True)

    raw_segments = []
    for index, scene in enumerate(scenes):
        filename = f"segment_{index + 1:03d}.mp3"
        audio_path = audio_dir / filename
        await edge_tts(
            text=scene["text"],
            voice=voice,
            rate=rate,
            output_path=str(audio_path),
        )
        duration_seconds = _probe_duration(audio_path)
        duration_frames = max(1, math.ceil(duration_seconds * fps) + pad_frames)
        raw_segments.append(
            {
                "id": scene["id"],
                "staticPath": f"audio/{filename}",
                "text": scene["text"],
                "durationSeconds": duration_seconds,
                "durationInFrames": duration_frames,
            }
        )

    target_seconds = float(payload.get("targetDurationSeconds") or payload.get("duration_seconds") or 0)
    raw_total = sum(segment["durationInFrames"] for segment in raw_segments)
    target_frames = max(raw_total, int(math.ceil(target_seconds * fps))) if target_seconds > 0 else raw_total
    remaining = max(0, target_frames - raw_total)
    extra_per_segment = remaining // len(raw_segments)
    extra_remainder = remaining % len(raw_segments)

    current = 0
    segments = []
    timeline = []
    for index, segment in enumerate(raw_segments):
        visual_duration = segment["durationInFrames"] + extra_per_segment + (1 if index < extra_remainder else 0)
        next_segment = {
            **segment,
            "from": current,
            "visualDurationInFrames": visual_duration,
        }
        segments.append(next_segment)
        timeline.append(
            {
                "id": segment["id"],
                "from": current,
                "durationInFrames": visual_duration,
                "audioDurationInFrames": segment["durationInFrames"],
                "text": segment["text"],
            }
        )
        current += visual_duration

    manifest = {
        "fps": fps,
        "voice": voice,
        "speed": speed,
        "rate": rate,
        "segments": segments,
        "timeline": timeline,
        "durationInFrames": current,
        "durationSeconds": current / fps,
    }
    (output_dir / "audio_manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate EdgeTTS narration segments for a Remotion doc video.")
    parser.add_argument("--input", required=True, help="Path to input JSON with scenes and voice settings.")
    parser.add_argument("--output-dir", required=True, help="Directory that will receive audio/ and audio_manifest.json.")
    args = parser.parse_args()

    input_path = Path(args.input)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    payload = json.loads(input_path.read_text(encoding="utf-8"))
    manifest = asyncio.run(_generate(payload, output_dir))
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

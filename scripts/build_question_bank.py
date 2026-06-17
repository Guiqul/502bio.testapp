#!/usr/bin/env python3
"""Build and validate the public question bank.

Base questions live in data/base_questions.json. Accepted community
submissions live in contributions/*.json. This script validates all entries,
assigns ids to accepted submissions when needed, and regenerates the app data
files at the repository root.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BASE_PATH = ROOT / "data" / "base_questions.json"
CONTRIBUTIONS_DIR = ROOT / "contributions"
QUESTIONS_JSON = ROOT / "questions.json"
QUESTIONS_JS = ROOT / "questions.js"

VALID_TYPES = {"single", "multi", "tf", "short"}
REQUIRED = {"chapter", "type", "prompt", "answer", "explanation"}


def load_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:  # pragma: no cover - printed for contributors
        raise ValueError(f"{path}: cannot read JSON: {exc}") from exc


def normalize_prompt(prompt: str) -> str:
    return re.sub(r"\s+", "", prompt.strip().lower())


def as_questions(payload, path: Path) -> list[dict]:
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict) and isinstance(payload.get("questions"), list):
        return payload["questions"]
    if isinstance(payload, dict) and "prompt" in payload:
        return [payload]
    raise ValueError(f"{path}: expected a question object, a list, or {{questions: [...]}}")


def contribution_files() -> list[Path]:
    if not CONTRIBUTIONS_DIR.exists():
        return []
    return sorted(
        path
        for path in CONTRIBUTIONS_DIR.glob("*.json")
        if not path.name.endswith(".example.json")
    )


def validate_question(q: dict, path: Path, index: int) -> None:
    where = f"{path}:{index + 1}"
    missing = sorted(REQUIRED - set(q))
    if missing:
        raise ValueError(f"{where}: missing required fields: {', '.join(missing)}")

    if q["type"] not in VALID_TYPES:
        raise ValueError(f"{where}: type must be one of {sorted(VALID_TYPES)}")

    if not str(q["prompt"]).strip():
        raise ValueError(f"{where}: prompt cannot be empty")

    if q["type"] in {"single", "multi"}:
        options = q.get("options")
        if not isinstance(options, list) or len(options) < 2:
            raise ValueError(f"{where}: single/multi questions need at least two options")
        answers = q["answer"] if isinstance(q["answer"], list) else [q["answer"]]
        if not answers or not all(str(answer).strip() for answer in answers):
            raise ValueError(f"{where}: answer cannot be empty")

    if q["type"] == "tf" and str(q["answer"]) not in {"正确", "错误", "true", "false", "True", "False"}:
        raise ValueError(f"{where}: tf answer must be 正确/错误")


def next_ls_number(questions: list[dict]) -> int:
    nums = []
    for q in questions:
        match = re.fullmatch(r"LS(\d+)", str(q.get("id", "")))
        if match:
            nums.append(int(match.group(1)))
    return max(nums, default=0) + 1


def build() -> list[dict]:
    base = as_questions(load_json(BASE_PATH), BASE_PATH)
    result: list[dict] = []
    seen_ids: dict[str, str] = {}
    seen_prompts: dict[str, str] = {}

    def add_question(q: dict, path: Path, index: int, assign_id: bool = False) -> None:
        nonlocal result
        validate_question(q, path, index)
        item = dict(q)
        if assign_id and not item.get("id"):
            item["id"] = f"LS{next_ls_number(result):03d}"
        if not item.get("id"):
            raise ValueError(f"{path}:{index + 1}: id is required in base questions")

        qid = str(item["id"])
        prompt_key = normalize_prompt(str(item["prompt"]))
        if qid in seen_ids:
            raise ValueError(f"{path}:{index + 1}: duplicate id {qid}; already used by {seen_ids[qid]}")
        if prompt_key in seen_prompts:
            raise ValueError(f"{path}:{index + 1}: duplicate prompt; already used by {seen_prompts[prompt_key]}")

        item.setdefault("tags", [])
        item.setdefault("priority", False)
        item.setdefault("mistake", False)
        item.setdefault("source", str(path.relative_to(ROOT)))
        seen_ids[qid] = str(path.relative_to(ROOT))
        seen_prompts[prompt_key] = str(path.relative_to(ROOT))
        result.append(item)

    for idx, q in enumerate(base):
        add_question(q, BASE_PATH, idx)

    for file_path in contribution_files():
        for idx, q in enumerate(as_questions(load_json(file_path), file_path)):
            add_question(q, file_path, idx, assign_id=True)

    return result


def write_outputs(questions: list[dict]) -> None:
    text = json.dumps(questions, ensure_ascii=False, indent=2)
    QUESTIONS_JSON.write_text(text + "\n", encoding="utf-8")
    QUESTIONS_JS.write_text("window.BIO_QUESTIONS = " + text + ";\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="validate and fail if generated files are stale")
    args = parser.parse_args()

    try:
      questions = build()
      if args.check:
          expected_json = json.dumps(questions, ensure_ascii=False, indent=2) + "\n"
          expected_js = "window.BIO_QUESTIONS = " + json.dumps(questions, ensure_ascii=False, indent=2) + ";\n"
          stale = []
          if QUESTIONS_JSON.read_text(encoding="utf-8") != expected_json:
              stale.append("questions.json")
          if QUESTIONS_JS.read_text(encoding="utf-8") != expected_js:
              stale.append("questions.js")
          if stale:
              raise ValueError("generated files are stale: " + ", ".join(stale))
      else:
          write_outputs(questions)
      print(f"question bank ok: {len(questions)} questions")
      return 0
    except ValueError as exc:
      print(f"ERROR: {exc}", file=sys.stderr)
      return 1


if __name__ == "__main__":
    raise SystemExit(main())

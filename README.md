readme = r"""# VeganLens

> Ingredient label scanner that detects **forbidden**/**caution** ingredients for different vegan levels.  
> Pipeline: **Image → Google Vision OCR → (LLM section extraction) → Rule-based keyword matching → JSON result**.  
> Frontend is a lightweight SPA (HTML/CSS/JS) that talks to a FastAPI backend.

---

## ✨ Key Features

- **Multi-stage pipeline**
  - Google Cloud Vision for OCR (document text detection).
  - Optional **LLM-assisted** extraction of the *ingredients*/*caution* sections (model copies spans; judgment is rule-based).
  - Deterministic **rule set** (JSON) for forbidden/caution ingredients by user type (Vegan, etc.).
- **FastAPI backend**
  - `POST /Check_Vegan` to analyze an uploaded image (`multipart/form-data`).
  - Static file serving for the web UI.
- **Frontend**
  - Pages: `index.html` → `loading.html` → `result.html` (+ `settings.html`).
  - State via `localStorage` (user type, profile, last result).
  - Robust UI for slow/failed requests (timeouts, warnings, safe fallbacks).
- **Packaging**
  - Works in dev (Uvicorn) and packaged single-file executable (PyInstaller with exception).
- **Logging**
  - Daily rotating logs under `logs/` with app-specific names.
- **HEIC support**
  - `pillow_heif` registered at startup for iOS images.

---

## 🧭 Architecture Overview

[Browser]
└─ index.html ─┬─ upload image (FormData) + x-user-type header
├─ loading.html polls localStorage for result
└─ result.html renders backend decision (forbidden/caution/safe)

[FastAPI app]
└─ POST /Check_Vegan
├─ choice(image, what='google')
│ └─ Google Vision OCR (document_text_detection)
├─ process_image_with_llm(...) # primary path (section extraction only)
│ └─ if LLM fails → fallback to section_text(...)
├─ rule-based matching (ban_List, check_forbidden_ingredients)
└─ JSON result → Frontend

[Rules/Configs]
└─ data/strict_vegan_forbidden.json, etc.


LLM is used **only** to extract the correct text span (ingredients/caution). The **final judgment** (forbidden/caution) is **purely rule-based** for reproducibility and auditability.

---


## 📂 Project Structure

VeganLens/
├─ backend/
│  ├─ main.py                  # FastAPI app entrypoint, routing, runtime
│  └─ app/
│     ├─ __init__.py           # Public API exports
│     ├─ choiceLogic.py        # OCR entry/selector (e.g., Google Vision)
│     ├─ compare_Keywords.py   # Forbidden/caution keyword matching & helpers
│     ├─ llm_Analysis.py       # LLM-assisted section extraction (copy-only, no generation)
│     ├─ veganLens.py          # Google Vision OCR & section utilities
│     ├─ logger.py             # File logging setup
│     └─ Test_compare_Keywords.py  # Tests/examples for rules & matching
│
├─ data/                       # ← Required (do not commit to public repos)
│  ├─ strict_vegan_forbidden.json     # Rule set per user type (e.g., Vegan)
│  ├─ pesco_forbidden.json            # Rule set for Pesco users
│  ├─ google_ocr_service_account.json # Google Vision service account key (REQUIRED)
│  └─ openai_api_key.txt              # OpenAI API key (REQUIRED, single line)
│
├─ frontend/
│  └─ app/
│     ├─ index.html            # Home (upload/camera)
│     ├─ loading.html          # Loading screen (polling transition)
│     ├─ result.html           # Result rendering
│     ├─ settings.html         # Diet type / profile (local)
│     └─ static/
│        ├─ style.css
│        ├─ loading.css
│        ├─ result.css
│        ├─ settings.css
│        ├─ script.js          # Upload + flow control
│        └─ result.js          # Result page rendering
│
├─ .gitignore
├─ README.md
├─ LICENSE
└─ requirements.txt



> **Note**  
> Actual folder names in your repo may differ. The listing reflects the current code you shared; adjust paths if your repo layout varies (e.g., `backend/` vs project root).

---


## ⚙️ Requirements

- Python 3.10+ (recommended)
- Google Cloud account & Vision API enabled
- (Optional) OpenAI (or compatible) API key for LLM section extraction
- Windows/macOS/Linux

Install dependencies:

```bash
pip install -r requirements.txt


🔐 Environment & Configuration
Required

Google Vision credentials
Create a service account key (JSON) and set the env var:

# path should point to the JSON key file
set GOOGLE_APPLICATION_CREDENTIALS=./backend/data/veganlens_API_Key.json          # Windows (cmd)
$env:GOOGLE_APPLICATION_CREDENTIALS="./backend/data/veganlens_API_Key.json"       # PowerShell
export GOOGLE_APPLICATION_CREDENTIALS=./backend/data/veganlens_API_Key.json       # macOS/Linux


User type rules
Place your rule JSONs (e.g., strict_vegan_forbidden.json) under backend/data/.



Optional (LLM)

OpenAI (or compatible) key for the section-extraction step:

set OPENAI_API_KEY=sk-...                       # Windows (cmd)
$env:OPENAI_API_KEY="sk-..."                    # PowerShell
export OPENAI_API_KEY=sk-...                    # macOS/Linux


LLM extracts only sections, not decisions. If the key is absent or the call fails, the system falls back to rule-based sectioning.



App runtime knobs (examples)

Uvicorn workers/backlog/keepalive/log-level (dev mode):

set UVICORN_WORKERS=4
set UVICORN_BACKLOG=512
set UVICORN_KEEPALIVE=5
set UVICORN_LOG_LEVEL=info


▶️ Running
A) Development (Uvicorn)

From the project root (adjust path to your app if needed):

# Option 1: module form
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1 --timeout-keep-alive 5 --log-level info

# Option 2: package path form (if app under backend/)
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --workers 1 --timeout-keep-alive 5 --log-level info

Then open the frontend (frontend/app/index.html) in the browser, or serve frontend/ with any static server.
If your FastAPI also serves the frontend, visit the root URL http://localhost:8000/.


B) Packaged executable (PyInstaller)

Create a single file executable:

Win Os
pyinstaller --clean --onefile --name VeganLens backend\main.py --add-data "frontend\app;frontend\app"

Mac OS
pyinstaller --clean --onefile --name VeganLens backend\main.py --add-data "frontend\app:frontend\app"


Depending on your code, you might also bundle your rule JSONs and assets:

--add-data "backend/data:backend/data"

Run the produced binary. The app can start Uvicorn in-process (multi-worker) and open a browser tab automatically when ready.


🌐 API
POST /Check_Vegan

Headers

x-user-type: Vegan (default: "Vegan" if omitted)

Body

multipart/form-data with field file (image). HEIC/HEIF supported.

Response (example shape)

{
  "is_vegan": false,
  "found_forbidden": ["beef", "gelatin"],
  "found_caution": ["may contain traces of milk"],
  "user_type": "Vegan",
  "date": "2025-08-29T12:34:56Z",
  "source": "google-vision+llm-sectioning",
  "notes": "Cross-contamination phrase detected"
}


The frontend stores the response (plus a DataURL preview) into localStorage.resultData and transitions from loading.html to result.html automatically.

🖼️ Frontend Flow



index.html

Lets the user pick an image (camera or gallery).

Persists vegType in localStorage (via initial popup or settings).

Sends the file to /Check_Vegan with header x-user-type.







loading.html

Shows staged messages; warns at ~15s; auto-back at ~45s.

Polls localStorage.resultData every 500ms; when present → result.html.






result.html

Renders image preview and three states: forbidden > caution > safe.

Defensive JSON checks and responsive layout.






settings.html

Manage user profile (name/photo) locally.

Change dietary type (updates localStorage.vegType).






🧪 Testing (logic)

backend/Test_compare_Keywords.py contains examples for keyword logic.
You can expand with pytest for automated runs.

📝 Logging

Named loggers (e.g., "google") write to files under logs/ with rotation by date.

Duplicate handler protection is enabled to avoid multi-write.




🔍 Troubleshooting

Credential errors (Google Vision): verify GOOGLE_APPLICATION_CREDENTIALS path and service account permissions; ensure Vision API is enabled.

HEIC not opening: verify pillow_heif is installed and registered before PIL.Image operations.

CORS / mixed content: if serving frontend via file:// or a different port/domain, prefer relative API paths or enable proper CORS.

Slow responses: use smaller images (client-side resize); Vision document_text_detection is heavier than simple OCR.

LLM timeouts: the app will fall back to rule-based section extraction. Consider shorter prompts or a faster model if available.

PyInstaller build issues (macOS): ensure Python path, collect dynamic libs, and validate --add-data paths use correct separators (: on *nix, ; on Windows).




🔒 Security & Privacy

Images are processed for OCR and ingredient extraction only.

If you store any results, log only non-sensitive metadata.

Do not commit veganlens_API_Key.json or any personal API keys. Use env vars or a secrets store.




📜 Licensing

Your dependency set is compatible with permissive licenses (e.g., MIT, Apache-2.0, BSD-3-Clause). A practical default is MIT.

NOTICE obligations: for Apache-2.0 packages (e.g., Google Cloud libs, OpenAI SDK), if a dependency ships a NOTICE file, include it verbatim in your distribution.

PyInstaller uses GPLv2 with an exception; building and distributing your executable is fine. If you modify PyInstaller itself, follow GPL terms.


MIT License (template)
MIT License

Copyright (c) 2025 VeganLens Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions
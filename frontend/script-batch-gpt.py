"""
script-batch-gpt.py — Multi-provider student-paper grading script.

Supported providers
-------------------
  openrouter — OpenRouter (free tier, OpenAI-compatible) (requires OPENROUTER_API_KEY)
  openai     — OpenAI API                                (requires OPENAI_API_KEY)
  google     — Google AI Studio                          (requires GOOGLE_API_KEY)
  local      — Any OpenAI-compatible local LLM (Ollama, LM Studio, etc.)

Quick start
-----------
  # Auto-detect provider from env vars, grade all PDFs in ./student_papers/
  python script-batch-gpt.py

  # Force OpenRouter (recommended — free tier available)
  python script-batch-gpt.py --provider openrouter

  # Force Google AI Studio
  python script-batch-gpt.py --provider google

  # Force OpenAI with a specific model
  python script-batch-gpt.py --provider openai --model gpt-4o

  # Local Ollama with a custom model
  python script-batch-gpt.py --provider local --model llama3.2
  python script-batch-gpt.py --provider local --local-url http://localhost:1234/v1/chat/completions

  # Choose a project by name and load projects from the backend API
  python script-batch-gpt.py --projects-source api --project-name "My Rubric"

  # List available projects then exit
  python script-batch-gpt.py --list-projects

.env.local keys used
--------------------
  OPENROUTER_API_KEY — OpenRouter key (auto-detected first)
  GOOGLE_API_KEY     — Google AI Studio key  (alias: GEMINI_API_KEY)
  OPENAI_API_KEY     — OpenAI key
  OPENAI_API_URL     — Override OpenAI endpoint (optional)
  LOCAL_LLM_URL      — Override local LLM endpoint (optional)
  LOCAL_LLM_KEY      — Bearer token for local LLM (optional)
  LLM_MODEL          — Default model override (optional)
"""

import argparse
import json
import os
import re
import urllib.error
import urllib.request


# ─── Constants ────────────────────────────────────────────────────────────────

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

PROVIDER_OPENAI      = 'openai'
PROVIDER_GOOGLE      = 'google'
PROVIDER_LOCAL       = 'local'
PROVIDER_OPENROUTER  = 'openrouter'

DEFAULT_MODELS = {
    PROVIDER_OPENAI:     'gpt-4o-mini',
    PROVIDER_GOOGLE:     'gemini-3-flash-preview',
    PROVIDER_LOCAL:      'llama3.2',
    PROVIDER_OPENROUTER: 'z-ai/glm-4.5-air:free',
}

OPENAI_BASE_URL      = 'https://api.openai.com/v1/chat/completions'
GOOGLE_BASE_URL      = 'https://generativelanguage.googleapis.com/v1beta/models'
LOCAL_BASE_URL       = 'http://localhost:11434/v1/chat/completions'
OPENROUTER_BASE_URL  = 'https://openrouter.ai/api/v1/chat/completions'
BACKEND_API_URL      = 'http://localhost:4000/projects'

DEFAULT_PROJECTS_FILE = os.path.join(SCRIPT_DIR, 'projects_gpt.json')
DEFAULT_INPUT_FOLDER  = os.path.join(SCRIPT_DIR, 'student_papers')

SYSTEM_PROMPT = (
    'คุณคือผู้ช่วยสอนที่เข้มงวด '
    'ให้คะแนนผลงานของนักเรียนตามรายละเอียดงานและเกณฑ์การให้คะแนนที่กำหนดให้เท่านั้น '
    'ส่งคืนผลลัพธ์เป็น JSON ที่ถูกต้องเท่านั้น — ห้ามมี markdown หรือข้อความอื่นใดเพิ่มเติม'
)


# ─── Env loader ───────────────────────────────────────────────────────────────

def load_env_file(path):
    if not os.path.exists(path):
        return
    with open(path, encoding='utf-8') as fh:
        for raw in fh:
            line = raw.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            key, value = line.split('=', 1)
            key   = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value


load_env_file(os.path.join(SCRIPT_DIR, '.env.local'))
load_env_file(os.path.join(SCRIPT_DIR, '.env'))


# ─── HTTP helper ──────────────────────────────────────────────────────────────

def http_post(url, body_bytes, headers):
    req = urllib.request.Request(url, data=body_bytes, method='POST', headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode('utf-8', errors='ignore')
        raise RuntimeError(f'HTTP {exc.code}: {detail}') from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f'Network error: {exc}') from exc


# ─── Provider: OpenAI ─────────────────────────────────────────────────────────

def call_openai(prompt, model, api_key, api_url):
    if not api_key:
        raise RuntimeError(
            'OPENAI_API_KEY is not set.\n'
            '  Add it to frontend/.env.local:  OPENAI_API_KEY=sk-...'
        )
    payload = {
        'model': model,
        'temperature': 0.2,
        'response_format': {'type': 'json_object'},
        'messages': [
            {'role': 'system', 'content': SYSTEM_PROMPT},
            {'role': 'user',   'content': prompt},
        ],
    }
    raw = http_post(api_url, json.dumps(payload).encode(), {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json',
    })
    try:
        return extract_json_object(raw['choices'][0]['message']['content'])
    except (KeyError, IndexError, TypeError) as exc:
        raise RuntimeError(f'Unexpected OpenAI response: {raw}') from exc


# ─── Provider: Google AI Studio ───────────────────────────────────────────────

def call_google(prompt, model, api_key):
    if not api_key:
        raise RuntimeError(
            'GOOGLE_API_KEY is not set.\n'
            '  Add it to frontend/.env.local:  GOOGLE_API_KEY=AIza...\n'
            '  Get a free key at: https://aistudio.google.com/app/apikey'
        )
    url = f'{GOOGLE_BASE_URL}/{model}:generateContent?key={api_key}'
    payload = {
        'system_instruction': {
            'parts': [{'text': SYSTEM_PROMPT}]
        },
        'contents': [
            {'role': 'user', 'parts': [{'text': prompt}]}
        ],
        'generationConfig': {
            'temperature': 0.2,
            'responseMimeType': 'application/json',
        },
    }
    raw = http_post(url, json.dumps(payload).encode(), {'Content-Type': 'application/json'})
    try:
        return extract_json_object(raw['candidates'][0]['content']['parts'][0]['text'])
    except (KeyError, IndexError, TypeError) as exc:
        raise RuntimeError(f'Unexpected Google response: {raw}') from exc


# ─── Provider: OpenRouter (OpenAI-compatible, free tier) ─────────────────────

def call_openrouter(prompt, model, api_key):
    if not api_key:
        raise RuntimeError(
            'OPENROUTER_API_KEY is not set.\n'
            '  Add it to frontend/.env.local:  OPENROUTER_API_KEY=sk-or-...\n'
            '  Get a free key at: https://openrouter.ai/keys'
        )
    payload = {
        'model': model,
        'temperature': 0.2,
        'response_format': {'type': 'json_object'},
        'messages': [
            {'role': 'system', 'content': SYSTEM_PROMPT},
            {'role': 'user',   'content': prompt},
        ],
    }
    raw = http_post(OPENROUTER_BASE_URL, json.dumps(payload).encode(), {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json',
    })
    try:
        return extract_json_object(raw['choices'][0]['message']['content'])
    except (KeyError, IndexError, TypeError) as exc:
        raise RuntimeError(f'Unexpected OpenRouter response: {raw}') from exc


# ─── Provider: Local LLM (OpenAI-compatible) ─────────────────────────────────

def call_local(prompt, model, api_url, api_key=None):
    payload = {
        'model': model,
        'temperature': 0.2,
        'messages': [
            {'role': 'system', 'content': SYSTEM_PROMPT},
            {'role': 'user',   'content': prompt},
        ],
    }
    headers = {'Content-Type': 'application/json'}
    if api_key:
        headers['Authorization'] = f'Bearer {api_key}'

    raw = http_post(api_url, json.dumps(payload).encode(), headers)
    try:
        return extract_json_object(raw['choices'][0]['message']['content'])
    except (KeyError, IndexError, TypeError) as exc:
        raise RuntimeError(f'Unexpected local LLM response: {raw}') from exc


# ─── Unified caller ───────────────────────────────────────────────────────────

def call_llm(prompt, provider, model, cfg):
    if provider == PROVIDER_OPENAI:
        return call_openai(prompt, model, cfg['openai_key'], cfg['openai_url'])
    if provider == PROVIDER_GOOGLE:
        return call_google(prompt, model, cfg['google_key'])
    if provider == PROVIDER_LOCAL:
        return call_local(prompt, model, cfg['local_url'], cfg.get('local_key'))
    if provider == PROVIDER_OPENROUTER:
        return call_openrouter(prompt, model, cfg['openrouter_key'])
    raise RuntimeError(f"Unknown provider '{provider}'")


# ─── Provider auto-detection ──────────────────────────────────────────────────

def detect_provider():
    if os.environ.get('OPENROUTER_API_KEY'):
        return PROVIDER_OPENROUTER
    if os.environ.get('GOOGLE_API_KEY') or os.environ.get('GEMINI_API_KEY'):
        return PROVIDER_GOOGLE
    if os.environ.get('OPENAI_API_KEY'):
        return PROVIDER_OPENAI
    return PROVIDER_LOCAL


def build_config(args):
    """Resolve provider, model, and credentials from CLI args + env."""
    provider = args.provider or detect_provider()
    model    = (
        args.model
        or os.environ.get('LLM_MODEL', '')
        or DEFAULT_MODELS[provider]
    )
    cfg = {
        'openai_key':      os.environ.get('OPENAI_API_KEY', '').strip(),
        'openai_url':      (os.environ.get('OPENAI_API_URL') or OPENAI_BASE_URL).strip(),
        'google_key':      (
            os.environ.get('GOOGLE_API_KEY')
            or os.environ.get('GEMINI_API_KEY')
            or ''
        ).strip(),
        'openrouter_key':  os.environ.get('OPENROUTER_API_KEY', '').strip(),
        'local_url':       (
            args.local_url
            or os.environ.get('LOCAL_LLM_URL')
            or LOCAL_BASE_URL
        ).strip(),
        'local_key':       os.environ.get('LOCAL_LLM_KEY', '').strip() or None,
    }
    return provider, model, cfg


# ─── Project loading ──────────────────────────────────────────────────────────

def load_projects_from_file(path):
    if not os.path.exists(path):
        print(f'[ERROR] Projects file not found: {path}')
        return []
    try:
        with open(path, encoding='utf-8') as fh:
            content = fh.read().strip()
            return json.loads(content) if content else []
    except Exception as exc:
        print(f'[ERROR] Cannot read projects file: {exc}')
        return []


def load_projects_from_api(url=BACKEND_API_URL):
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as exc:
        print(f'[ERROR] Cannot fetch projects from {url}: {exc}')
        return []


def list_projects(projects):
    if not projects:
        print('[INFO] No projects found.')
        return
    print('Available projects:')
    for p in projects:
        n = len(p.get('sections', []))
        print(f"  {p.get('id', '?'):>36}  |  {p.get('name', 'Untitled'):<30}  |  {n} sections")


def select_project(projects, project_id=None, project_name=None):
    if project_id:
        for p in projects:
            if p.get('id') == project_id:
                return p
        print(f"[ERROR] No project with id '{project_id}'.")
        return None

    if project_name:
        needle = project_name.strip().casefold()
        exact   = [p for p in projects if str(p.get('name', '')).strip().casefold() == needle]
        partial = [p for p in projects if needle in str(p.get('name', '')).strip().casefold()]
        if exact:
            return exact[0]
        if len(partial) == 1:
            return partial[0]
        print(f"[ERROR] '{project_name}' did not match exactly one project.")
        list_projects(partial or projects)
        return None

    if len(projects) == 1:
        return projects[0]
    if not projects:
        print('[ERROR] No projects available.')
        return None
    print('[ERROR] Multiple projects found — use --project-id or --project-name.')
    list_projects(projects)
    return None


def normalize_project(p):
    sections = []
    for i, s in enumerate(p.get('sections', [])):
        name = str(s.get('name', '')).strip() or f'column {i + 1}'
        sections.append({
            'id':       str(s.get('id', '')).strip() or f'section-{i + 1}',
            'name':     name,
            'maxScore': _pos(s.get('maxScore'), 4.0),
            'rubric':   str(s.get('rubric', '')).strip(),
        })
    return {
        'id':                str(p.get('id', '')).strip(),
        'name':              str(p.get('name', 'Untitled')).strip() or 'Untitled',
        'assignmentDetails': str(p.get('assignmentDetails', '')).strip(),
        'sections':          sections,
    }


# ─── PDF text extraction ──────────────────────────────────────────────────────

def extract_text(pdf_path):
    try:
        import fitz
        doc = fitz.open(pdf_path)
        return ''.join(page.get_text() + '\n' for page in doc)
    except ModuleNotFoundError:
        print('[ERROR] PyMuPDF not installed.  pip install pymupdf')
        return ''
    except Exception as exc:
        print(f'[ERROR] Cannot read {pdf_path}: {exc}')
        return ''


# ─── Prompt builder ───────────────────────────────────────────────────────────

def build_prompt(project, student_text):
    total_max = sum(s['maxScore'] for s in project['sections'])
    section_lines = []
    for i, s in enumerate(project['sections']):
        rubric = s['rubric'] or 'ไม่มีการระบุเกณฑ์การให้คะแนน — ให้คะแนนอย่างระมัดระวังโดยใช้ชื่อหัวข้อเป็นเกณฑ์'
        section_lines.append(
            f"{i + 1}. id={s['id']} | name={s['name']} | max_score={s['maxScore']}\n"
            f"   rubric: {rubric}"
        )

    details = project['assignmentDetails'] or 'ไม่มีรายละเอียดงานที่กำหนด'

    return f"""คุณคือผู้ช่วยสอนที่ตรวจผลงานของนักเรียนตามเกณฑ์การให้คะแนนที่กำหนด
โปรดเขียนคำติชมหรือข้อเสนอแนะที่กระชับและเฉพาะเจาะจงเป็นภาษาไทย

PROJECT:
- id: {project['id']}
- name: {project['name']}
- total_max_score: {total_max}

ASSIGNMENT DETAILS:
{details}

SCORING SECTIONS:
{os.linesep.join(section_lines)}

STUDENT WORK:
{student_text}

RULES:
1. ส่งคืนเป็น JSON เท่านั้น — ห้ามใช้ markdown ห้ามมีข้อความเกริ่นนำ
2. รักษาจำนวนหัวข้อให้เท่ากับที่กำหนดไว้ด้านบนอย่างเคร่งครัด
3. คงค่า id, name, และ max_score ของแต่ละหัวข้อไว้ให้ตรงกัน
4. คะแนนของแต่ละหัวข้อ (score) ต้องอยู่ระหว่าง 0 ถึง max_score ของหัวข้อนั้น
5. total_score ต้องเท่ากับผลรวมของคะแนนทุกหัวข้อ

JSON FORMAT:
{{
  "project_id": "{project['id']}",
  "project_name": "{project['name']}",
  "sections": [
    {{
      "id": "รหัสหัวข้อที่ตรงกัน",
      "name": "ชื่อหัวข้อที่ตรงกัน",
      "max_score": คะแนนเต็มของหัวข้อ,
      "score": คะแนนที่ได้ตั้งแต่ 0 ถึง max_score,
      "feedback": "คำอธิบายเหตุผลและข้อเสนอแนะเฉพาะหัวข้อเป็นภาษาไทย"
    }}
  ],
  "total_score": ผลรวมคะแนนทั้งหมด,
  "strengths": "จุดแข็งของนักเรียน 2-3 ประโยคเป็นภาษาไทย",
  "weaknesses": "จุดอ่อนหรือข้อควรปรับปรุงของนักเรียน 2-3 ประโยคเป็นภาษาไทย",
  "feedback": "คำแนะนำภาพรวมที่นำไปปรับใช้ได้ 3-5 ประโยคเป็นภาษาไทย"
}}""".strip()


# ─── Grading logic ────────────────────────────────────────────────────────────

def normalize_result(raw, project):
    by_id   = {}
    by_name = {}
    for item in raw.get('sections', []):
        if not isinstance(item, dict):
            continue
        sid  = str(item.get('id',   '')).strip()
        name = str(item.get('name', '')).strip()
        if sid:   by_id[sid]     = item
        if name:  by_name[name]  = item

    sections = []
    for i, s in enumerate(project['sections']):
        matched = by_id.get(s['id']) or by_name.get(s['name']) or {}
        score   = _bounded(matched.get('score'), 0.0, s['maxScore'], 0.0)
        sections.append({
            'id':       s['id'],
            'name':     s['name'],
            'max_score': s['maxScore'],
            'score':    round(score, 2),
            'feedback': str(matched.get('feedback', '')).strip()
                        or f'ไม่มีคำติชมสำหรับ {s["name"]}',
            'order':    i + 1,
        })

    total = round(sum(s['score'] for s in sections), 2)
    return {
        'project_id':     project['id'],
        'project_name':   project['name'],
        'sections':       sections,
        'total_score':    total,
        'max_total_score': round(sum(s['max_score'] for s in sections), 2),
        'strengths':      str(raw.get('strengths',  '')).strip() or '-',
        'weaknesses':     str(raw.get('weaknesses', '')).strip() or '-',
        'feedback':       str(raw.get('feedback',   '')).strip() or '-',
    }


def grade(student_text, project, provider, model, cfg):
    if not student_text.strip():
        return None
    prompt = build_prompt(project, student_text)
    raw    = call_llm(prompt, provider, model, cfg)
    return normalize_result(raw, project)


def build_row(filename, g):
    row = {
        'Student_File': filename,
        'Project_ID':   g['project_id'],
        'Project_Name': g['project_name'],
    }
    for s in g['sections']:
        o = s['order']
        row[f'Section_{o}_Name']      = s['name']
        row[f'Section_{o}_Max_Score'] = s['max_score']
        row[f'Section_{o}_Score']     = s['score']
        row[f'Section_{o}_Feedback']  = s['feedback']
    row['Total_Score']      = g['total_score']
    row['Max_Total_Score']  = g['max_total_score']
    row['Strengths']        = g['strengths']
    row['Weaknesses']       = g['weaknesses']
    row['Overall_Feedback'] = g['feedback']
    return row


# ─── Small utilities ──────────────────────────────────────────────────────────

def extract_json_object(text):
    text = text.strip()
    if not text:
        raise ValueError('Empty response from model.')
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start, end = text.find('{'), text.rfind('}')
        if start == -1 or end <= start:
            raise
        return json.loads(text[start:end + 1])


def slugify(value):
    return re.sub(r'[^a-zA-Z0-9]+', '_', value).strip('_').lower() or 'project'


def _pos(value, fallback):
    try:
        n = float(value)
        return n if n > 0 else float(fallback)
    except (TypeError, ValueError):
        return float(fallback)


def _bounded(value, lo, hi, fallback):
    try:
        return max(lo, min(float(value), hi))
    except (TypeError, ValueError):
        return float(fallback)


# ─── CLI ──────────────────────────────────────────────────────────────────────

def build_parser():
    parser = argparse.ArgumentParser(
        description='Grade student PDFs with OpenRouter, OpenAI, Google AI Studio, or a local LLM.',
        formatter_class=argparse.RawTextHelpFormatter,
        epilog=(
            'Examples:\n'
            '  python script-batch-gpt.py                                 # auto-detect provider\n'
            '  python script-batch-gpt.py --provider openrouter           # OpenRouter (free tier)\n'
            '  python script-batch-gpt.py --provider google               # Google AI Studio\n'
            '  python script-batch-gpt.py --provider openai --model gpt-4o\n'
            '  python script-batch-gpt.py --provider local --model llama3.2\n'
            '  python script-batch-gpt.py --projects-source api --project-name "My Project"\n'
        ),
    )

    # ── Provider ──────────────────────────────────────────────────────────────
    parser.add_argument(
        '--provider',
        choices=[PROVIDER_OPENROUTER, PROVIDER_OPENAI, PROVIDER_GOOGLE, PROVIDER_LOCAL],
        default=None,
        metavar='PROVIDER',
        help=(
            'LLM provider  (auto-detected from env if omitted):\n'
            '  openrouter — OpenRouter free tier  (needs OPENROUTER_API_KEY)\n'
            '  openai     — OpenAI API            (needs OPENAI_API_KEY)\n'
            '  google     — Google AI Studio      (needs GOOGLE_API_KEY)\n'
            '  local      — Local OpenAI-compat   (Ollama, LM Studio, …)\n'
        ),
    )
    parser.add_argument(
        '--model',
        default=None,
        metavar='MODEL',
        help=(
            'Model name. Defaults per provider:\n'
            f'  openrouter → {DEFAULT_MODELS[PROVIDER_OPENROUTER]}\n'
            f'  openai     → {DEFAULT_MODELS[PROVIDER_OPENAI]}\n'
            f'  google     → {DEFAULT_MODELS[PROVIDER_GOOGLE]}\n'
            f'  local      → {DEFAULT_MODELS[PROVIDER_LOCAL]}\n'
        ),
    )
    parser.add_argument(
        '--local-url',
        default=None,
        metavar='URL',
        help=f'Local LLM endpoint  (default: {LOCAL_BASE_URL})',
    )

    # ── Projects ──────────────────────────────────────────────────────────────
    parser.add_argument('--project-id',   default=None, help='Exact project id to grade with')
    parser.add_argument('--project-name', default=None, help='Project name (partial match ok)')
    parser.add_argument('--list-projects', action='store_true', help='List projects and exit')
    parser.add_argument(
        '--projects-source',
        choices=['file', 'api'],
        default='file',
        metavar='SOURCE',
        help=(
            'Where to load projects from:\n'
            '  file — local JSON file (default)\n'
            '  api  — backend at http://localhost:4000/projects\n'
        ),
    )
    parser.add_argument(
        '--projects-file',
        default=DEFAULT_PROJECTS_FILE,
        metavar='PATH',
        help=f'Projects JSON file  (default: {DEFAULT_PROJECTS_FILE})',
    )

    # ── I/O ───────────────────────────────────────────────────────────────────
    parser.add_argument(
        '--input-folder',
        default=DEFAULT_INPUT_FOLDER,
        metavar='DIR',
        help=f'Folder with student PDF files  (default: {DEFAULT_INPUT_FOLDER})',
    )
    parser.add_argument(
        '--output-file',
        default=None,
        metavar='FILE',
        help='Excel output path  (auto-named if omitted)',
    )

    return parser


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    args = build_parser().parse_args()

    # Load projects
    projects = (
        load_projects_from_api()
        if args.projects_source == 'api'
        else load_projects_from_file(args.projects_file)
    )

    if args.list_projects:
        list_projects(projects)
        return

    if not projects:
        return

    selected = select_project(projects, project_id=args.project_id, project_name=args.project_name)
    if not selected:
        return

    project = normalize_project(selected)
    if not project['sections']:
        print('[ERROR] Selected project has no grading sections.')
        return

    provider, model, cfg = build_config(args)

    # Runtime banner
    print()
    print('┌─────────────────────────────────────────────────┐')
    print(f'│  Provider  : {provider.upper():<35}│')
    print(f'│  Model     : {model:<35}│')
    if provider == PROVIDER_LOCAL:
        url_disp = cfg["local_url"][:35]
        print(f'│  API URL   : {url_disp:<35}│')
    print(f'│  Project   : {project["name"][:35]:<35}│')
    print(f'│  Sections  : {len(project["sections"]):<35}│')
    print('└─────────────────────────────────────────────────┘')
    print()

    input_folder = args.input_folder
    if not os.path.exists(input_folder):
        print(f'[ERROR] Input folder not found: {input_folder}')
        return

    output_file = args.output_file or os.path.join(
        SCRIPT_DIR,
        f'grading_results_{slugify(project["name"])}_{provider}.xlsx',
    )

    pdfs = [f for f in os.listdir(input_folder) if f.lower().endswith('.pdf')]
    print(f'Found {len(pdfs)} PDF(s) in "{input_folder}"')
    if not pdfs:
        print('[WARNING] No PDF files to grade.')
        return

    results = []
    for filename in pdfs:
        print(f'  Grading: {filename} ...', end=' ', flush=True)
        text = extract_text(os.path.join(input_folder, filename))

        if len(text.strip()) < 50:
            print('[SKIP] empty or image-only PDF')
            continue

        try:
            result = grade(text, project, provider, model, cfg)
        except Exception as exc:
            print(f'[FAILED] {exc}')
            continue

        if result:
            print(f'[DONE]  {result["total_score"]}/{result["max_total_score"]} pts')
            results.append(build_row(filename, result))
        else:
            print('[FAILED] no result returned')

    print()
    if results:
        try:
            import pandas as pd
        except ModuleNotFoundError:
            print('[ERROR] pandas not installed.  pip install pandas openpyxl')
            return
        pd.DataFrame(results).to_excel(output_file, index=False)
        print(f'[SUCCESS] {len(results)} result(s) → "{output_file}"')
    else:
        print('[WARNING] No papers were successfully graded.')


if __name__ == '__main__':
    main()

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import pdfParse from 'pdf-parse';

const GOOGLE_BASE      = 'https://generativelanguage.googleapis.com/v1beta/models';
const OPENAI_BASE      = 'https://api.openai.com/v1/chat/completions';
const OPENROUTER_BASE  = 'https://openrouter.ai/api/v1/chat/completions';
const SYSTEM_PROMPT =
  'You are a strict teaching assistant. Score student work only against the provided rubric. Return valid JSON only — no markdown, no extra text.';

@Injectable()
export class GradingService {
  private readonly googleKey: string;
  private readonly openaiKey: string;
  private readonly openrouterKey: string;
  private readonly explicitProvider: string;
  private readonly explicitModel: string;

  constructor(config: ConfigService) {
    this.googleKey =
      (config.get<string>('GOOGLE_API_KEY') || config.get<string>('GEMINI_API_KEY') || '').trim();
    this.openaiKey = (config.get<string>('OPENAI_API_KEY') || '').trim();
    this.openrouterKey = (config.get<string>('OPENROUTER_API_KEY') || '').trim();
    this.explicitProvider = (config.get<string>('LLM_PROVIDER') || '').trim();
    this.explicitModel = (config.get<string>('LLM_MODEL') || '').trim();
  }

  private resolveProvider(): string {
    if (this.explicitProvider) return this.explicitProvider;
    if (this.openrouterKey) return 'openrouter';
    if (this.googleKey) return 'google';
    if (this.openaiKey) return 'openai';
    throw new Error(
      'No LLM API key configured. Add OPENROUTER_API_KEY, GOOGLE_API_KEY, or OPENAI_API_KEY to backend/.env',
    );
  }

  private resolveModel(provider: string): string {
    if (this.explicitModel) return this.explicitModel;
    if (provider === 'google') return 'gemini-2.0-flash';
    if (provider === 'openrouter') return 'z-ai/glm-4.5-air:free';
    return 'gpt-4o-mini';
  }

  // ── PDF text extraction ──────────────────────────────────────────────────────

  async extractTextFromPdf(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to download PDF (HTTP ${response.status})`);
    const buffer = Buffer.from(await response.arrayBuffer());
    const result = await pdfParse(buffer);
    return result.text || '';
  }

  // ── Prompt ───────────────────────────────────────────────────────────────────

  buildPrompt(project: any, studentText: string): string {
    const totalMax: number = project.sections.reduce(
      (sum: number, s: any) => sum + s.maxScore,
      0,
    );
    const sectionLines: string[] = project.sections.map((s: any, i: number) => {
      const rubric =
        s.rubric || 'No rubric provided — grade conservatively using the section name as a signal.';
      return `${i + 1}. id=${s.id} | name=${s.name} | max_score=${s.maxScore}\n   rubric: ${rubric}`;
    });
    const details = project.assignmentDetails || 'No assignment details provided.';

    return `You are a teaching assistant grading student work against a configurable rubric.
Write concise but specific feedback.

PROJECT:
- id: ${project.id}
- name: ${project.name}
- total_max_score: ${totalMax}

ASSIGNMENT DETAILS:
${details}

SCORING SECTIONS:
${sectionLines.join('\n')}

STUDENT WORK:
${studentText}

RULES:
1. Return JSON only — no markdown, no preamble.
2. Keep exactly the same number of sections as configured above.
3. Preserve each section id, name, and max_score exactly as given.
4. Each section score must be between 0 and its max_score.
5. total_score must equal the sum of all section scores.

JSON FORMAT:
{
  "project_id": "${project.id}",
  "project_name": "${project.name}",
  "sections": [
    {
      "id": "exact section id",
      "name": "exact section name",
      "max_score": exact numeric max,
      "score": numeric 0..max_score,
      "feedback": "specific justification"
    }
  ],
  "total_score": numeric sum,
  "strengths": "2-3 sentences on strengths",
  "weaknesses": "2-3 sentences on weaknesses",
  "feedback": "3-5 sentences of actionable overall feedback"
}`.trim();
  }

  // ── LLM call ─────────────────────────────────────────────────────────────────

  async callLlm(prompt: string): Promise<{ raw: any; provider: string; model: string }> {
    const provider = this.resolveProvider();
    const model = this.resolveModel(provider);

    let raw: any;
    if (provider === 'google') {
      raw = await this.callGoogle(prompt, model);
    } else if (provider === 'openrouter') {
      raw = await this.callOpenAiCompatible(prompt, model, this.openrouterKey, OPENROUTER_BASE);
    } else {
      const apiUrl = process.env.OPENAI_API_URL || OPENAI_BASE;
      raw = await this.callOpenAiCompatible(prompt, model, this.openaiKey, apiUrl);
    }
    return { raw, provider, model };
  }

  private async callGoogle(prompt: string, model: string): Promise<any> {
    const url = `${GOOGLE_BASE}/${model}:generateContent?key=${this.googleKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
      }),
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Google API error ${response.status}: ${err.slice(0, 300)}`);
    }
    const data: any = await response.json();
    return this.parseJsonFromText(data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '');
  }

  private async callOpenAiCompatible(
    prompt: string,
    model: string,
    apiKey: string,
    apiUrl: string,
  ): Promise<any> {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
      }),
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`LLM API error ${response.status}: ${err.slice(0, 300)}`);
    }
    const data: any = await response.json();
    return this.parseJsonFromText(data?.choices?.[0]?.message?.content ?? '');
  }

  private parseJsonFromText(text: string): any {
    text = text.trim();
    if (!text) throw new Error('Empty response from LLM.');
    try {
      return JSON.parse(text);
    } catch {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start === -1 || end <= start) throw new Error('No JSON object found in LLM response.');
      return JSON.parse(text.slice(start, end + 1));
    }
  }

  // ── Result normalisation ─────────────────────────────────────────────────────

  normalizeResult(
    raw: any,
    project: any,
    provider: string,
    model: string,
  ): {
    sections: any[];
    totalScore: number;
    strengths: string;
    weaknesses: string;
    overallFeedback: string;
    provider: string;
    model: string;
  } {
    const byId: Record<string, any> = {};
    const byName: Record<string, any> = {};
    for (const item of (raw.sections ?? []) as any[]) {
      if (item?.id) byId[String(item.id).trim()] = item;
      if (item?.name) byName[String(item.name).trim()] = item;
    }

    const sections = (project.sections as any[]).map((s: any, i: number) => {
      const matched = byId[s.id] ?? byName[s.name] ?? {};
      const raw_score = parseFloat(matched.score) || 0;
      const score = Math.round(Math.max(0, Math.min(raw_score, s.maxScore)) * 100) / 100;
      return {
        id: s.id,
        name: s.name,
        maxScore: s.maxScore,
        score,
        feedback:
          String(matched.feedback ?? '').trim() || `No feedback returned for "${s.name}".`,
        order: i + 1,
      };
    });

    const totalScore =
      Math.round(sections.reduce((sum, s) => sum + s.score, 0) * 100) / 100;

    return {
      sections,
      totalScore,
      strengths: String(raw.strengths ?? '').trim() || '-',
      weaknesses: String(raw.weaknesses ?? '').trim() || '-',
      overallFeedback: String(raw.feedback ?? '').trim() || '-',
      provider,
      model,
    };
  }
}

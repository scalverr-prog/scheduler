// =============================================================================
// VOICE SCRIBE API - Uses Claude to parse natural speech into structured data
// =============================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

const SCRIBE_SYSTEM_PROMPT = `You are a medical scheduling assistant that extracts structured data from voice transcripts.

Given a spoken transcript, extract the following fields if mentioned:
- firstName: Patient's first name
- lastName: Patient's last name
- mrn: Medical Record Number (digits only)
- title: Procedure/encounter type (LP, BMA, BMBx, IT Chemo, PICC, Central Line, Port Access, Sedated MRI, Sedated CT, Colonoscopy, EGD, Bronchoscopy, Biopsy, Infusion, Chemotherapy, Consultation, Follow Up, etc.)
- date: Date in YYYY-MM-DD format (interpret "today", "tomorrow", "Monday", "October 8th" etc. relative to current date)
- startTime: Time in HH:MM 24-hour format (interpret "8 in the morning" as 08:00, "2pm" as 14:00, etc.)
- service: Medical service (Oncology, Cardiology, Pulmonary, Radiology, Neurology, GI, Orthopedics, Urology, General Surgery, etc.)
- sedationist: Name of sedation provider if mentioned
- pmd: Name of attending physician/PMD if mentioned
- notes: Any additional notes or special instructions

IMPORTANT RULES:
1. Only include fields that are clearly mentioned in the transcript
2. For names, capitalize properly (e.g., "super sam" -> firstName: "Super", lastName: "Sam")
3. For dates, calculate the actual YYYY-MM-DD based on today's date
4. For times, always use 24-hour format HH:MM
5. Common procedure aliases: "LP" = lumbar puncture, "BMA" = bone marrow aspiration, "BMBx" = bone marrow biopsy, "IT" = intrathecal
6. If multiple procedures mentioned, pick the primary one for title
7. Return ONLY valid JSON, no explanation

Current date for reference: {{CURRENT_DATE}}

Example input: "new procedure for John Smith LP tomorrow at 9am oncology"
Example output: {"firstName":"John","lastName":"Smith","title":"LP","date":"2026-05-10","startTime":"09:00","service":"Oncology"}`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check for API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const { transcript } = req.body;

    if (!transcript) {
      return res.status(400).json({ error: 'Missing transcript' });
    }

    // Build system prompt with current date
    const currentDate = new Date().toISOString().split('T')[0];
    const systemPrompt = SCRIBE_SYSTEM_PROMPT.replace('{{CURRENT_DATE}}', currentDate);

    // Call Claude API
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system: systemPrompt,
        messages: [
          { role: 'user', content: `Parse this transcript:\n\n"${transcript}"` }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', errorText);
      return res.status(response.status).json({
        error: 'Claude API error',
        details: errorText
      });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '{}';

    // Parse the JSON response
    try {
      const parsed = JSON.parse(text);
      return res.status(200).json({
        success: true,
        fields: parsed
      });
    } catch (parseError) {
      // If Claude didn't return valid JSON, try to extract it
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return res.status(200).json({
            success: true,
            fields: parsed
          });
        } catch {
          // Fall through to error
        }
      }
      return res.status(200).json({
        success: false,
        error: 'Failed to parse response',
        raw: text
      });
    }

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

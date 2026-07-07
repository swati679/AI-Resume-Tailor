export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { baseResume, jd, company, extra } = req.body || {};

  if (!baseResume || !jd) {
    return res.status(400).json({ error: 'Missing baseResume or jd' });
  }

  // Step 1: optional company research via Tavily (free, no card needed)
  let companyContext = '';
  if (company && process.env.TAVILY_API_KEY) {
    try {
      const searchRes = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: process.env.TAVILY_API_KEY,
          query: `${company} company overview industry culture technology`,
          search_depth: 'basic',
          include_answer: true,
          max_results: 4
        })
      });
      const searchData = await searchRes.json();
      const snippets = (searchData.results || [])
        .map(r => `- ${r.title}: ${r.content}`)
        .join('\n');
      companyContext = searchData.answer
        ? `Summary: ${searchData.answer}\n\nSources:\n${snippets}`
        : snippets;
    } catch (e) {
      companyContext = ''; // fail quietly, tailoring still proceeds on JD alone
    }
  }

  // Step 2: build the tailoring prompt
  const systemPrompt = `You are an expert resume writer and ATS optimization specialist.
You will be given a candidate's base resume and a target job description (and optionally a company name and research about it).
Rewrite the resume content to align tightly with the job description: adjust the summary, reorder/rewrite skills to surface relevant keywords, and pick the most relevant projects and experience bullets. If the base resume has a project clearly less relevant to this JD than others, you may drop it in favor of the more relevant ones, but never fabricate experience, skills, or metrics that are not implied by the base resume.
${company ? (companyContext
    ? `A company name was provided: "${company}". Here is researched context about it:\n${companyContext}\n\nUse this ONLY to inform tone and emphasis — e.g. lean formal/enterprise-scale framing for a large consulting firm, or scrappy/ownership framing for a startup; subtly echo language the company itself uses if it fits the candidate's real experience. Never invent facts about the candidate, and never state company facts as certain if they weren't in this research.`
    : `A company name was provided: "${company}", but no reliable research was found about it. Proceed based on the job description alone — do not guess at or invent company facts.`) : ''}
${extra ? `The candidate also gave these additional instructions for this specific tailoring pass: "${extra}". Follow them precisely and give them priority over your own default choices, as long as they don't require fabricating experience, skills, or credentials the candidate doesn't have.` : ''}
Keep bullets concise, action-oriented, and quantified where the original supports it.
Respond with ONLY valid JSON, no markdown fences, no commentary, matching exactly this schema:
{
  "name": string,
  "location": string,
  "phone": string,
  "email": string,
  "linkedin": string,
  "summary": string,
  "skills": [{"category": string, "items": string}],
  "projects": [{"title": string, "subtitle": string, "dates": string, "bullets": [string]}],
  "workExperience": [{"title": string, "subtitle": string, "dates": string, "bullets": [string]}],
  "education": [{"title": string, "subtitle": string, "dates": string}],
  "achievements": [string]
}`;

  const userMsg = `BASE RESUME:
${baseResume}

JOB DESCRIPTION${company ? ' (Company: ' + company + ')' : ''}:
${jd}${extra ? `\n\nADDITIONAL INSTRUCTIONS FROM CANDIDATE:\n${extra}` : ''}`;

  // Step 3: call Groq (OpenAI-compatible chat completions)
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMsg }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 4000
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Groq API error' });
    }

    const text = data.choices?.[0]?.message?.content || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const clean = (jsonMatch ? jsonMatch[0] : text).trim();
    const parsed = JSON.parse(clean);

    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}


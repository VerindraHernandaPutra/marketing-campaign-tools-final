import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { imageBase64, context, currentTitle, currentContent } = await req.json()

    if (!imageBase64) {
      throw new Error('No image provided')
    }

    const openAiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAiKey) {
      throw new Error('Missing OpenAI API Key')
    }

    const hasUserDraft = (currentTitle && currentTitle.trim().length > 0) || (currentContent && currentContent.trim().length > 0);

    let userPrompt = "";
    if (hasUserDraft) {
        userPrompt = `
        I have started writing a campaign. Please act as a professional editor and copywriter.

        MY DRAFT TITLE: "${currentTitle || ''}"
        MY DRAFT CONTENT: "${currentContent || ''}"

        TASK:
        1. Analyze the provided image.
        2. Refine, polish, and complete my draft.
        3. Ensure the tone matches the image.
        4. Fix any grammar issues.
        5. If my draft is very short (e.g., just "Sale"), expand it into a full engaging post.
        `;
    } else {
        userPrompt = "Generate a catchy marketing title and engaging caption for this image from scratch.";
    }

    const systemInstruction = `
      You are a professional social media marketing expert.

      ${context ? `TARGET AUDIENCE CONTEXT: ${context}` : ''}

      CRITICAL INSTRUCTION:
      - If the target audience has a specific country, YOU MUST WRITE IN THAT COUNTRY'S NATIVE LANGUAGE.
      - If the user provided a draft, improve it but keep their core message intent.

      Return ONLY a valid JSON object in this format: { "title": "string", "content": "string" }.
      Do not add markdown formatting like \`\`\`json.
    `;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemInstruction
          },
          {
            role: 'user',
            content: [
              { type: "text", text: userPrompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 400,
      }),
    })

    const data = await response.json()

    if (data.error) {
      console.error("OpenAI Error:", data.error);
      throw new Error(data.error.message);
    }

    const aiContent = data.choices[0].message.content;

    let result;
    try {
      result = JSON.parse(aiContent);
    } catch {
      const cleanJson = aiContent.replace(/```json|```/g, '');
      result = JSON.parse(cleanJson);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

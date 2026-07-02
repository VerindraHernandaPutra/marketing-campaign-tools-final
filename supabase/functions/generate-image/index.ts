import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GenerateImageParams {
  subject: string;
  referenceImage?: string;
  aspectRatio?: string;
  width?: number;
  height?: number;
  quality?: string;
  medium?: string;
  style?: string;
  colorPalette?: string;
  lighting?: string;
  mood?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { params } = await req.json() as { params: GenerateImageParams };

    if (!params) {
      throw new Error('Missing parameters')
    }

    const openAiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAiKey) {
      throw new Error('Missing OpenAI API Key')
    }

    // gpt-image-1 supported sizes: 1024x1024 | 1536x1024 | 1024x1536
    let size = "1024x1024";

    if (params.aspectRatio === 'landscape') {
        size = "1536x1024";
    } else if (params.aspectRatio === 'portrait') {
        size = "1024x1536";
    } else if (params.aspectRatio === 'custom' && params.width && params.height) {
        const ratio = params.width / params.height;
        if (ratio > 1.2) size = "1536x1024";
        else if (ratio < 0.83) size = "1024x1536";
        else size = "1024x1024";
    }

    let finalPrompt = "";

    if (params.referenceImage) {
        console.log("Processing reference image...");
        const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openAiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    {
                        role: "system",
                        content: "Analyze the image. Describe it in extreme detail (subject, composition, lighting, style, colors) so an AI image model can recreate it. Incorporate the user's request. Return ONLY the prompt."
                    },
                    {
                        role: "user",
                        content: [
                            { type: "text", text: `User Request: ${params.subject || "Copy this image style"}` },
                            { type: "image_url", image_url: { url: params.referenceImage } }
                        ]
                    }
                ],
                max_tokens: 300
            })
        });

        const visionData = await visionResponse.json();

        if (visionData.error) {
            console.error("Vision Error:", visionData.error);
            throw new Error(`Vision AI failed: ${visionData.error.message}`);
        }

        if (!visionData.choices || !visionData.choices[0]) {
             throw new Error("Vision AI returned no description.");
        }

        finalPrompt = visionData.choices[0].message.content;

        if (params.aspectRatio !== 'square') finalPrompt += ` --ar ${params.aspectRatio}`;

    } else {
        const safeSubject = params.subject || "A creative artistic composition";

        finalPrompt = `Create a high-quality image based on: "${safeSubject}".\n`;

        if (params.medium) finalPrompt += `\n- **Medium**: ${params.medium}`;
        if (params.style) finalPrompt += `\n- **Style**: ${params.style}`;
        if (params.colorPalette) finalPrompt += `\n- **Colors**: ${params.colorPalette}`;
        if (params.lighting) finalPrompt += `\n- **Lighting**: ${params.lighting}`;
        if (params.mood) finalPrompt += `\n- **Mood**: ${params.mood}`;

        finalPrompt += `\n\nEnsure high quality and detail.`;
    }

    console.log("Final prompt:", finalPrompt.substring(0, 100) + "...");

    const qualityMap: Record<string, string> = {
      standard: "medium",
      hd: "high",
      low: "low",
      medium: "medium",
      high: "high",
    };
    const quality = qualityMap[params.quality || "standard"] ?? "medium";

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: finalPrompt,
        n: 1,
        size: size,
        quality: quality,
      }),
    })

    const data = await response.json()

    if (data.error) {
      console.error("Image Gen Error:", data.error);
      return new Response(JSON.stringify({ error: data.error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const imageBase64 = data.data[0].b64_json;

    return new Response(JSON.stringify({ image: `data:image/png;base64,${imageBase64}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error("Function Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

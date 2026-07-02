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
    const { imageBase64, prompt } = await req.json()

    if (!imageBase64 || !prompt) {
      throw new Error('Missing imageBase64 or prompt')
    }

    const openAiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAiKey) throw new Error('Missing OpenAI API Key')

    // Detect MIME type from data URL prefix
    const mimeMatch = imageBase64.match(/^data:(image\/[a-z]+);base64,/)
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg'
    const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg'

    // Strip data URL prefix and decode to binary
    const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '')
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    const imageBlob = new Blob([bytes], { type: mimeType })

    const formData = new FormData()
    formData.append('image', imageBlob, `image.${ext}`)
    formData.append('prompt', prompt)
    formData.append('model', 'gpt-image-1')
    formData.append('n', '1')
    formData.append('size', '1024x1024')

    console.log(`edit-image: calling OpenAI edits with prompt="${prompt.slice(0, 80)}"`)

    const response = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
      },
      body: formData,
    })

    const data = await response.json()

    if (data.error) {
      console.error('OpenAI edit error:', data.error)
      throw new Error(data.error.message)
    }

    if (!data.data?.[0]?.b64_json) {
      throw new Error('No image returned from OpenAI')
    }

    return new Response(JSON.stringify({
      image: `data:image/png;base64,${data.data[0].b64_json}`,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('edit-image error:', errorMessage)
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

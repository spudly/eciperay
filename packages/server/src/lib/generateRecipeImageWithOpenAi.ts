type FetchFn = typeof fetch;

type OpenAIImageResponse = {
  data?: {b64_json?: string; url?: string}[];
  output_format?: 'png' | 'jpeg' | 'webp';
};

const DEFAULT_IMAGE_MODEL = 'gpt-image-1-mini';

const contentTypeFromFormat = (format: string | undefined): string => {
  if (format === 'jpeg') {
    return 'image/jpeg';
  }
  if (format === 'webp') {
    return 'image/webp';
  }
  return 'image/png';
};

const isGptImageModel = (model: string) => model.startsWith('gpt-image');

const buildRequestBody = (model: string, prompt: string) => {
  if (isGptImageModel(model)) {
    return {
      model,
      prompt,
      size: '1024x1024',
      quality: 'medium',
      output_format: 'png',
    };
  }
  return {model, prompt, n: 1, size: '1024x1024', response_format: 'b64_json'};
};

const downloadImageAsBase64 = async (
  url: string,
  fetchFn: FetchFn,
): Promise<{imageBase64: string; contentType: string}> => {
  const response = await fetchFn(url);
  if (!response.ok) {
    throw new Error('Image generation returned an unreadable image URL');
  }
  const contentType =
    response.headers.get('content-type')?.split(';')[0]?.trim() ?? 'image/png';
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0) {
    throw new Error('Image generation returned an empty image');
  }
  return {imageBase64: buffer.toString('base64'), contentType};
};

export const generateRecipeImageWithOpenAi = async (
  prompt: string,
  fetchFn: FetchFn = fetch,
): Promise<{imageBase64: string; contentType: string}> => {
  const apiKey = process.env['OPENAI_API_KEY'];
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  const model = process.env['OPENAI_IMAGE_MODEL'] ?? DEFAULT_IMAGE_MODEL;
  const response = await fetchFn(
    'https://api.openai.com/v1/images/generations',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildRequestBody(model, prompt)),
    },
  );
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Image generation failed: ${detail}`);
  }
  const json = (await response.json()) as OpenAIImageResponse;
  const image = json.data?.[0];
  if (image?.b64_json) {
    return {
      imageBase64: image.b64_json,
      contentType: contentTypeFromFormat(json.output_format),
    };
  }
  if (image?.url) {
    return downloadImageAsBase64(image.url, fetchFn);
  }
  throw new Error('Image generation returned no image');
};

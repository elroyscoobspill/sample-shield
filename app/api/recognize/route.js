
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export async function POST(request) {
  try {
    const host = getEnv('ACR_HOST').replace(/^https?:\/\//, '').replace(/\/$/, '');
    const accessKey = getEnv('ACR_ACCESS_KEY');
    const accessSecret = getEnv('ACR_ACCESS_SECRET');

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return Response.json({ error: 'No audio file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    if (audioBuffer.length > 10 * 1024 * 1024) {
      return Response.json({
        error: 'File too large for this starter version. Try a shorter MP3/WAV under 10MB.'
      }, { status: 400 });
    }

    const httpMethod = 'POST';
    const httpUri = '/v1/identify';
    const dataType = 'audio';
    const signatureVersion = '1';
    const timestamp = Math.floor(Date.now() / 1000).toString();

    const stringToSign = [
      httpMethod,
      httpUri,
      accessKey,
      dataType,
      signatureVersion,
      timestamp
    ].join('\n');

    const signature = crypto
      .createHmac('sha1', accessSecret)
      .update(Buffer.from(stringToSign, 'utf-8'))
      .digest('base64');

    const acrForm = new FormData();
    acrForm.append('sample', new Blob([audioBuffer]), file.name || 'sample.mp3');
    acrForm.append('access_key', accessKey);
    acrForm.append('data_type', dataType);
    acrForm.append('signature_version', signatureVersion);
    acrForm.append('signature', signature);
    acrForm.append('sample_bytes', String(audioBuffer.length));
    acrForm.append('timestamp', timestamp);

    const response = await fetch(`https://${host}${httpUri}`, {
      method: 'POST',
      body: acrForm
    });

    const data = await response.json();

    return Response.json(data, { status: response.ok ? 200 : response.status });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

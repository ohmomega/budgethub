import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(request) {
  try {
    const userPayload = await getUserFromRequest(request);
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const base64Data = formData.get('base64Data');
    const filename = formData.get('filename');
    const mimeType = formData.get('mimeType');

    if (!base64Data || !filename || !mimeType) {
      return NextResponse.json({ error: 'Missing download fields' }, { status: 400 });
    }

    const buffer = Buffer.from(base64Data, 'base64');
    
    // Fallback filename containing only ASCII characters to support RFC compliance in older/strict parsers
    const asciiFilename = filename.replace(/[^\x20-\x7E]/g, '_');
    const encodedFilename = encodeURIComponent(filename);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`
      }
    });
  } catch (error) {
    console.error('Download API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

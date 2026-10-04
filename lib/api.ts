import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
export function apiError(error: unknown) {
  if (error instanceof ZodError)
    return NextResponse.json(
      { error: 'Please check your details.', issues: error.flatten() },
      { status: 400 },
    );
  console.error('API request failed', error);
  return NextResponse.json(
    {
      error:
        error instanceof Error &&
        /stock|unavailable|already being|cannot be paid|cart|quantity/i.test(
          error.message,
        )
          ? error.message
          : 'We could not complete this request. Please try again.',
    },
    { status: 503 },
  );
}
export async function boundedJson(request: Request) {
  if (Number(request.headers.get('content-length') || 0) > 20000)
    throw new ZodError([
      { code: 'custom', path: [], message: 'Request too large' },
    ]);
  const reader = request.body?.getReader();
  if (!reader)
    throw new ZodError([{ code: 'custom', path: [], message: 'Missing body' }]);
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 20000) {
      await reader.cancel();
      throw new ZodError([
        { code: 'custom', path: [], message: 'Request too large' },
      ]);
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new ZodError([{ code: 'custom', path: [], message: 'Invalid JSON' }]);
  }
}
export function sameOrigin(request: Request) {
  return (
    request.headers.get('origin') ===
    new URL(process.env.NEXT_PUBLIC_SITE_URL!).origin
  );
}

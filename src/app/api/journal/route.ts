import { fetchJournalEvents } from '@/lib/google-sheets';
import { NextResponse, NextRequest } from 'next/server';

export const dynamic = 'force-dynamic'; // Prevent static generation errors when using req.url
// We'll handle caching differently if needed, or Vercel Edge caching can be used

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filiale = searchParams.get('filiale') as 'PV' | 'MD' | null;
    
    const events = await fetchJournalEvents(filiale ?? undefined);
    
    return NextResponse.json({ 
      events, 
      fetchedAt: new Date().toISOString(),
      count: events.length 
    });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('API /api/journal error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch journal events', details: error.message || String(error) },
      { status: 500 }
    );
  }
}

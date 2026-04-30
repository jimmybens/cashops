import { fetchJournalEvents } from '@/lib/google-sheets';
import { NextResponse } from 'next/server';

export const revalidate = 300;  // 5 min cache

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const filiale = searchParams.get('filiale') as 'PV' | 'MD' | null;
    
    const events = await fetchJournalEvents(filiale ?? undefined);
    
    return NextResponse.json({ 
      events, 
      fetchedAt: new Date().toISOString(),
      count: events.length 
    });
  } catch (error) {
    console.error('API /api/journal error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch journal events' },
      { status: 500 }
    );
  }
}

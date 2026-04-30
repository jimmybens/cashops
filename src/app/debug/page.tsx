import { fetchJournalEvents } from '@/lib/google-sheets';

export const revalidate = 0; // Disable cache for debug page

export default async function DebugPage() {
  const events = await fetchJournalEvents();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Google Sheets Connection</h1>
      
      <div className="bg-gray-100 p-4 rounded-md mb-4 text-black">
        <p><strong>Total Events:</strong> {events.length}</p>
        <p><strong>First Event Date:</strong> {events[0]?.event_date?.toISOString() || 'N/A'}</p>
      </div>

      <h2 className="text-xl font-semibold mb-2">First 5 events:</h2>
      <pre className="bg-gray-900 text-green-400 p-4 rounded-md overflow-auto max-h-[500px] text-xs">
        {JSON.stringify(events.slice(0, 5), null, 2)}
      </pre>
    </div>
  );
}

// Registra únicamente el momento del clic en "Ver horarios del CIAC".
export async function onRequestPost({ env }) {
  if (!env.DB) return new Response(null, { status: 503 });
  try {
    await env.DB.prepare('INSERT INTO schedule_link_clicks (clicked_at) VALUES (?)')
      .bind(Date.now()).run();
    return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('schedule_click_tracking_failed', error);
    return new Response(null, { status: 503 });
  }
}

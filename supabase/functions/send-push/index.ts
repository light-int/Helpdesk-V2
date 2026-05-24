import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import webpush from 'npm:web-push@3.6.7';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || '';
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || 'BDehWoN2PXaSrsMRTRiGoH3_LaOFe8mgPS1o0_JZLKxpBLzPvm5ZEyhxMrDdgO2Z3E6z5kt3WrFTsFQSo-5vwbo';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@royalplaza.ga';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

interface PushPayload {
  userId: string;
  title: string;
  message: string;
  link?: string;
}

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { userId, title, message, link }: PushPayload = await req.json();

    if (!userId || !title) {
      return new Response('Missing required fields', { status: 400 });
    }

    const { data: sub } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!sub) {
      return new Response('No subscription found', { status: 404 });
    }

    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    };

    const payload = JSON.stringify({ title, message, link: link || '/' });

    const response = await webpush.sendNotification(pushSubscription, payload, {
      TTL: 86400,
    });

    if (response.statusCode === 410) {
      await supabase.from('push_subscriptions').delete().eq('user_id', userId);
    }

    return new Response('Push sent', { status: 200 });
  } catch (err) {
    console.error('[send-push] Error:', err);
    return new Response(`Error: ${err.message}`, { status: 500 });
  }
});

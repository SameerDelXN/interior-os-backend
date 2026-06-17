// =============================================================================
// InteriorOS Backend — MOM Service
// =============================================================================

import { MeetingMinutes } from '@/models/mom.model';
import { connectDB } from '@/lib/db';
import { AppError } from './auth.service';
import OpenAI from 'openai';
import { getRedisClient } from '@/lib/redis';

const RECALL_API_BASE = process.env.RECALL_API_BASE || 'https://api.recall.ai/api/v1';

export async function inviteBotToMeeting(projectId: string, organizationId: string, meetingUrl: string) {
  const RECALL_API_KEY = process.env.RECALL_API_KEY;
  if (!RECALL_API_KEY) {
    throw new AppError('Recall API key is not configured in .env.local', 500);
  }

  // 1. Call Recall.ai to dispatch bot
  const response = await fetch(`${RECALL_API_BASE}/bot`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Token ${RECALL_API_KEY}`,
    },
    body: JSON.stringify({
      bot_name: 'InteriorOS MOM Bot',
      meeting_url: meetingUrl,
      metadata: {
        projectId,
        organizationId
      }
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Recall.ai Error:', error);
    throw new AppError('Failed to invite bot to meeting. Check if the meeting URL is valid.', 500);
  }

  const data = await response.json();
  const botId = data.id;

  await connectDB();
  
  // 2. Create a pending MOM entry
  const pendingMom = new MeetingMinutes({
    projectId,
    organizationId,
    title: 'AI Meeting Notes (Processing)',
    agenda: 'AI Bot is joining...',
    notes: 'Awaiting completion...',
    date: new Date(),
    status: 'draft',
    botId,
    meetingUrl,
  });

  await pendingMom.save();

  return pendingMom;
}

export async function processRecallWebhook(payload: any) {
  const botEvent = payload.event;
  const botData = payload.data;

  // We process when the bot finishes and transcript is ready
  if (botEvent !== 'bot.status_change' || botData.status !== 'done') {
    return;
  }

  const botId = botData.id;
  const projectId = botData.metadata?.projectId;
  const organizationId = botData.metadata?.organizationId;

  if (!projectId || !organizationId) return;

  await connectDB();
  const mom = await MeetingMinutes.findOne({ botId, projectId });
  if (!mom) return; 

  const RECALL_API_KEY = process.env.RECALL_API_KEY;
  // Fetch the transcript from Recall
  const transcriptResponse = await fetch(`${RECALL_API_BASE}/bot/${botId}/transcript`, {
    headers: {
      'Authorization': `Token ${RECALL_API_KEY}`,
    }
  });

  if (!transcriptResponse.ok) {
    console.error('Failed to fetch transcript from Recall');
    return;
  }

  const transcriptData = await transcriptResponse.json();
  
  // Recall.ai returns an array of utterances
  const fullText = transcriptData.map((utterance: any) => 
    utterance.words.map((w: any) => w.text).join('')
  ).join('\n');

  if (!fullText || !fullText.trim()) {
    mom.notes = "Meeting was too short or no audio was recorded.";
    mom.title = "Empty Meeting";
    await mom.save();
    return;
  }

  try {
    // Use OpenAI to summarize
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Very capable and fast for JSON tasks
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are an expert construction & design project manager. Given a meeting transcript, extract the following into a JSON object strictly following this schema:
  {
    "title": "Short descriptive title of the meeting",
    "attendees": ["list", "of", "names"],
    "agenda": "Brief 1-sentence summary of the main topic",
    "notes": "Detailed summary of the discussion, key points, and decisions. Use markdown formatting.",
    "actionItems": [
      {
        "description": "Task description",
        "status": "open"
      }
    ]
  }`
        },
        {
          role: "user",
          content: fullText
        }
      ]
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (responseContent) {
      const parsed = JSON.parse(responseContent);

      mom.title = parsed.title || 'AI Meeting Notes';
      mom.attendees = parsed.attendees || [];
      mom.agenda = parsed.agenda || '';
      mom.notes = parsed.notes || '';
      mom.actionItems = parsed.actionItems || [];
    }
  } catch (err) {
    console.error('OpenAI parsing error:', err);
    mom.notes = fullText; // fallback to raw transcript
  }

  await mom.save();

  // Note: For real-time sync, you could broadcast via Redis so frontend updates instantly.
  const redis = await getRedisClient();
  if (redis) {
    await redis.publish(`project_mom:${projectId}`, JSON.stringify(mom));
  }
}

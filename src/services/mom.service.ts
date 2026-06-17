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

  const recordings = botData.recordings || [];
  if (recordings.length === 0) {
    console.error('No recordings found for bot');
    mom.notes = "No audio/video recording was captured by the bot.";
    mom.title = "Empty Meeting";
    mom.status = 'draft';
    await mom.save();
    return;
  }

  const recordingId = recordings[0].id;
  console.log(`Starting transcription for recording ID: ${recordingId}`);

  try {
    // 1. Trigger Post-Meeting Transcription
    const createRes = await fetch(`${RECALL_API_BASE}/recording/${recordingId}/create_transcript/`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${RECALL_API_KEY}`,
        'accept': 'application/json',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        provider: {
          recallai_async: { language_code: "auto" }
        },
        diarization: {
          use_separate_streams_when_available: true
        }
      })
    });

    let transcriptId = null;
    if (createRes.ok) {
      const createData = await createRes.json();
      transcriptId = createData.id;
    } else {
      console.error(`Recall API /recording/${recordingId}/create_transcript failed:`, await createRes.text());
    }

    if (!transcriptId) {
      console.error('Failed to trigger post-meeting transcription');
      mom.title = "Transcription Failed";
      mom.notes = "Could not trigger transcription. The API limit may have been reached for this recording.";
      mom.status = 'draft';
      await mom.save();
      return;
    }

    mom.title = "AI Meeting Notes (Transcribing...)";
    await mom.save();

    // 2. Poll for Transcript completion (up to 3 minutes)
    let transcriptData = null;
    for (let i = 0; i < 36; i++) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // wait 5 seconds
      
      const checkRes = await fetch(`${RECALL_API_BASE}/transcript/${transcriptId}/`, {
        headers: {
          'Authorization': `Token ${RECALL_API_KEY}`,
          'accept': 'application/json'
        }
      });
      
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        console.log(`Transcript status check ${i+1}/36:`, checkData.status);
        if (checkData.status === 'done' || checkData.status === 'completed') {
          transcriptData = checkData;
          break;
        } else if (checkData.status === 'failed' || checkData.status === 'error') {
          console.error('Transcription failed:', checkData);
          break;
        }
      } else {
        console.error(`Transcript check failed (${checkRes.status}):`, await checkRes.text());
      }
    }

    if (!transcriptData) {
      mom.notes = "Transcription timed out or failed to process audio.";
      mom.title = "Empty Meeting";
      mom.status = 'draft';
      await mom.save();
      return;
    }

    let fullText = "";
    if (transcriptData.utterances) {
      fullText = transcriptData.utterances.map((u: any) => u.text || u.words?.map((w:any)=>w.text).join('')).join('\n');
    } else if (transcriptData.words) {
      fullText = transcriptData.words.map((w: any) => w.text).join(' ');
    } else if (Array.isArray(transcriptData)) {
       fullText = transcriptData.map((u: any) => u.text || u.words?.map((w:any)=>w.text).join('')).join('\n');
    }

    if (!fullText || !fullText.trim()) {
      mom.notes = "Meeting was too short or no audio was recorded. " + JSON.stringify(transcriptData);
      mom.title = "Empty Meeting";
      mom.status = 'draft';
      await mom.save();
      return;
    }

    // 3. Use OpenAI to summarize
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
    console.error('Post-meeting transcription error:', err);
    mom.notes = "Error processing transcript. The bot may have failed to record audio."; 
  }

  mom.status = 'draft';
  await mom.save();

  // Note: For real-time sync, you could broadcast via Redis so frontend updates instantly.
  const redis = await getRedisClient();
  if (redis) {
    await redis.publish(`project_mom:${projectId}`, JSON.stringify(mom));
  }
}

import twilio from 'twilio';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_MESSAGING_SERVICE_SID,
  TWILIO_PHONE_NUMBER,
  SMS_STATUS_CALLBACK_URL,
  DEFAULT_COUNTRY_CODE, // e.g., +966
} = process.env;

// Lazily create Twilio client to avoid import-time crashes
function getTwilioClient() {
  if (!TWILIO_ACCOUNT_SID || !/^AC[0-9a-f]{32}$/i.test(TWILIO_ACCOUNT_SID)) {
    throw new Error(
      'Invalid or missing TWILIO_ACCOUNT_SID. It must start with AC followed by 32 hex characters.'
    );
  }
  if (!TWILIO_AUTH_TOKEN || typeof TWILIO_AUTH_TOKEN !== 'string') {
    throw new Error('Missing TWILIO_AUTH_TOKEN');
  }
  return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

// Normalize phone to E.164 format
function normalizeE164(input) {
  if (!input) return null;
  let s = String(input).trim().replace(/\s+/g, '');

  // Keep only digits for body, preserve leading + if present
  if (s.startsWith('+')) {
    s = '+' + s.slice(1).replace(/\D/g, '');
    return s;
  }

  // If local number starting with 0 and DEFAULT_COUNTRY_CODE provided
  if (DEFAULT_COUNTRY_CODE && s.startsWith('0')) {
    const prefix = DEFAULT_COUNTRY_CODE.replace(/\s/g, '');
    const digits = s.replace(/\D/g, '').replace(/^0/, '');
    return prefix.startsWith('+') ? `${prefix}${digits}` : `+${prefix}${digits}`;
  }

  // If digits only and we have default country
  if (/^\d+$/.test(s) && DEFAULT_COUNTRY_CODE) {
    const prefix = DEFAULT_COUNTRY_CODE.startsWith('+')
      ? DEFAULT_COUNTRY_CODE
      : `+${DEFAULT_COUNTRY_CODE}`;
    return `${prefix}${s}`;
  }

  // As-is fallback (Twilio will validate)
  return s;
}

// Send SMS with robust configuration
export async function sendSMS(to, body) {
  if (!body || typeof body !== 'string' || !body.trim()) {
    throw new Error('SMS body is required');
  }

  const toE164 = normalizeE164(to);
  if (!toE164 || !toE164.startsWith('+')) {
    throw new Error(`Invalid recipient phone number: ${to}`);
  }

  const params = {
    body: body.trim(),
    to: toE164,
  };

  // Correct usage of Messaging Service SID vs. From number
  if (TWILIO_MESSAGING_SERVICE_SID) {
    params.messagingServiceSid = TWILIO_MESSAGING_SERVICE_SID;
  } else if (TWILIO_PHONE_NUMBER) {
    params.from = TWILIO_PHONE_NUMBER;
  } else {
    throw new Error(
      'Twilio sender not configured. Set TWILIO_MESSAGING_SERVICE_SID or TWILIO_PHONE_NUMBER.'
    );
  }

  // Optional delivery status callback
  if (SMS_STATUS_CALLBACK_URL) {
    params.statusCallback = SMS_STATUS_CALLBACK_URL;
  }

  try {
    const msg = await getTwilioClient().messages.create(params);
    console.log(
      `Twilio SMS queued. SID=${msg.sid}, To=${toE164}, Status=${msg.status}`
    );
    return msg; // Return full Twilio message response
  } catch (err) {
    // Log comprehensive Twilio error details
    console.error('Twilio SMS error', {
      code: err?.code,
      message: err?.message,
      moreInfo: err?.moreInfo,
      status: err?.status,
    });
    throw err;
  }
}

export default sendSMS;
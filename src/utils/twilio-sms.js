import twilio from "twilio";

const getTwilioConfig = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_SID || "";
  const authToken = process.env.TWILIO_AUTH_TOKEN || "";
  const fromNumber =
    process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_PHONE || process.env.TWILIO_FROM || "";

  return { accountSid, authToken, fromNumber };
};

const isTwilioConfigured = ({ accountSid, authToken, fromNumber }) =>
  Boolean(String(accountSid).trim() && String(authToken).trim() && String(fromNumber).trim());

let client = null;

const getClient = () => {
  const config = getTwilioConfig();
  if (!isTwilioConfigured(config)) return null;
  if (!client) {
    client = twilio(config.accountSid, config.authToken);
  }
  return client;
};

/**
 * @param {string} toE164 - E.164, e.g. +919780007922
 * @param {string} body
 */
export const sendTwilioSms = async (toE164, body) => {
  const { fromNumber } = getTwilioConfig();
  const c = getClient();
  if (!c || !toE164) {
    return { sent: false, reason: "twilio_not_configured_or_recipient_missing" };
  }
  await c.messages.create({
    from: fromNumber,
    to: toE164,
    body,
  });
  return { sent: true };
};

export default sendTwilioSms;

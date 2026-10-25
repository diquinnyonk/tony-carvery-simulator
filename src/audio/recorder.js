// Microphone recording with a hard length limit.
export const MAX_CLIP_MS = 5000;

export function canRecord() {
  return !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
}

export async function startRecording(maxMs = MAX_CLIP_MS) {
  if (!canRecord()) throw new Error('This browser cannot record audio. Try Chrome, Edge, Firefox or Safari over https.');
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const rec = new MediaRecorder(stream);
  const chunks = [];
  rec.ondataavailable = (e) => {
    if (e.data && e.data.size) chunks.push(e.data);
  };
  const done = new Promise((resolve) => {
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      resolve(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }));
    };
  });
  rec.start();
  const timer = setTimeout(() => {
    if (rec.state !== 'inactive') rec.stop();
  }, maxMs);
  return {
    stop() {
      clearTimeout(timer);
      if (rec.state !== 'inactive') rec.stop();
    },
    done,
  };
}

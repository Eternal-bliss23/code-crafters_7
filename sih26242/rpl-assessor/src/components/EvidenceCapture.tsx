import { useRef, useState } from 'react';
import { useApp } from '../state';
import type { EvidenceRecord, EvidenceType } from '../types';

interface Props {
  assessmentId: string;
  taskId: string;
  type: EvidenceType;
  onCaptured: (rec: EvidenceRecord) => void;
}

const acceptFor = (t: EvidenceType): string =>
  t === 'video' ? 'video/*' : t === 'audio' ? 'audio/*' : 'image/*';

export function EvidenceCapture({ assessmentId, taskId, type, onCaptured }: Props) {
  const { actions } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string>();
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const store = async (blob: Blob, mime: string) => {
    setBusy(true);
    try {
      const rec = await actions.attachEvidence({
        assessmentId,
        taskId,
        type,
        mime,
        size: blob.size,
        blob,
        capturedAt: new Date().toISOString(),
        note: ''
      });
      onCaptured(rec);
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await store(file, file.type || 'application/octet-stream');
    if (fileRef.current) fileRef.current.value = '';
  };

  const startRecording = async () => {
    setError(undefined);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (ev) => ev.data.size && chunksRef.current.push(ev.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'video/webm' });
        await store(blob, blob.type);
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      setError('Camera/microphone not available. Use the file button instead.');
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  const canRecord = type === 'video' || type === 'audio';

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row">
        <button type="button" className="btn secondary sm" disabled={busy} onClick={() => fileRef.current?.click()}>
          {type === 'video' ? 'Choose / record video' : type === 'audio' ? 'Choose audio' : 'Choose / take photo'}
        </button>
        {canRecord && !recording && (
          <button type="button" className="btn ghost sm" disabled={busy} onClick={startRecording}>
            Record live
          </button>
        )}
        {recording && (
          <button type="button" className="btn danger sm" onClick={stopRecording}>
            Stop recording
          </button>
        )}
        {busy && <span className="hint">Saving locally…</span>}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept={acceptFor(type)}
        capture="environment"
        className="sr-only"
        onChange={onFile}
      />
      <p className="hint">
        Evidence is stored on this device and queued for sync. It is an aid for the assessor, not an automatic
        pass/fail.
      </p>
      {error && <p className="hint" style={{ color: 'var(--red)' }}>{error}</p>}
    </div>
  );
}

export function EvidenceStrip({
  items,
  onRemove
}: {
  items: EvidenceRecord[];
  onRemove?: (id: string) => void;
}) {
  const urlsRef = useRef<Record<string, string>>({});
  if (items.length === 0) return null;
  return (
    <div className="evidence-strip">
      {items.map((e) => {
        const url = (urlsRef.current[e.id] ||= URL.createObjectURL(e.blob));
        const isImage = e.mime.startsWith('image/');
        return (
          <div className="evidence-thumb" key={e.id}>
            {isImage ? <img src={url} alt="captured evidence" /> : <video src={url} controls muted />}
            <div className="cap">
              {e.type} · {(e.size / 1024).toFixed(0)} KB · {e.synced ? 'synced' : 'local'}
            </div>
            {onRemove && (
              <button type="button" onClick={() => onRemove(e.id)} aria-label="Remove evidence">
                ×
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

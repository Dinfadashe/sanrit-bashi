"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { submitLivenessPhotoAction } from "@/lib/actions/kyc";
import { Alert } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function LivenessCapture({ alreadyCaptured }: { alreadyCaptured: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const router = useRouter();

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(alreadyCaptured);

  useEffect(() => {
    if (done || previewUrl) return;

    let cancelled = false;

    const getUserMedia = navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices);

    Promise.resolve()
      .then(() => {
        if (!getUserMedia) {
          throw new Error("unsupported");
        }
        return getUserMedia({ video: { facingMode: "user" }, audio: false });
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof Error && err.message === "unsupported") {
          setCameraError("Your browser doesn't support camera access. Please try a different browser or device.");
        } else {
          setCameraError("Could not access your camera. Please allow camera access in your browser and reload this page.");
        }
      });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [done, previewUrl]);

  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setCapturedBlob(blob);
        setPreviewUrl(URL.createObjectURL(blob));
        streamRef.current?.getTracks().forEach((t) => t.stop());
      },
      "image/jpeg",
      0.85
    );
  }

  function retake() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCapturedBlob(null);
    setSubmitError(null);
  }

  async function submit() {
    if (!capturedBlob) return;
    setSubmitting(true);
    setSubmitError(null);

    const formData = new FormData();
    formData.append("photo", capturedBlob, "selfie.jpg");
    const result = await submitLivenessPhotoAction(formData);

    setSubmitting(false);
    if (result.error) {
      setSubmitError(result.error);
      return;
    }
    setDone(true);
    router.refresh();
  }

  if (done) {
    return <p className="text-sm text-emerald-700">✓ Photo captured.</p>;
  }

  return (
    <div className="space-y-3">
      {submitError && <Alert variant="error">{submitError}</Alert>}

      {cameraError ? (
        <Alert variant="warning">{cameraError}</Alert>
      ) : previewUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Captured selfie preview"
            className="w-full max-w-xs rounded-xl border border-slate-200"
          />
          <div className="flex gap-3">
            <Button variant="outline" size="sm" type="button" onClick={retake} disabled={submitting}>
              Retake
            </Button>
            <Button size="sm" type="button" onClick={submit} loading={submitting}>
              Use This Photo
            </Button>
          </div>
        </>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full max-w-xs rounded-xl border border-slate-200 bg-slate-900"
          />
          <Button size="sm" type="button" onClick={capture}>
            Capture Photo
          </Button>
        </>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
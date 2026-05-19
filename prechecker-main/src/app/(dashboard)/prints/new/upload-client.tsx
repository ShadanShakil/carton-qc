"use client";
import { useRouter } from "next/navigation";
import { useState, useRef, type DragEvent } from "react";
import { motion } from "framer-motion";
import {
  UploadCloud,
  FileImage,
  Loader2,
  AlertCircle,
  ScanLine,
  Camera,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { ScannerUI, Point } from "@/components/ScannerUI";
import { Search, Check } from "lucide-react";

type Option = { id: string; title: string };

export default function UploadPrintClient({ artworks }: { artworks: Option[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [artworkId, setArtworkId] = useState<string>(artworks[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  
  // Scanner state
  const [showScanner, setShowScanner] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredArtworks = artworks.filter(a => 
    a.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedArtwork = artworks.find(a => a.id === artworkId);

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileSelected(f);
  }

  function handleFileSelected(f: File) {
    setFile(f);
    setShowScanner(true);
    setError(null);
  }

  async function submit(corners: Point[]) {
    if (!file || !artworkId) return;
    setLoading(true);
    setError(null);
    setShowScanner(false); // Hide scanner while uploading
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("artworkId", artworkId);
      fd.append("corners", JSON.stringify(corners));
      
      const res = await fetch("/api/prints", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Upload failed (${res.status})`);
      }
      const { print } = await res.json();
      await fetch(`/api/prints/${print.id}/analyze`, { method: "POST" });
      router.push(`/prints/${print.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setFile(null); // Reset to allow try again easily
    } finally {
      setLoading(false);
    }
  }

  if (artworks.length === 0) {
    return (
      <Callout title="No approved artwork yet" tone="info">
        Ask a reviewer to approve an artwork first. Approved artwork is the
        reference image we align printed cartons against.
      </Callout>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
      <Card className="p-6">
        {showScanner && file ? (
          <ScannerUI 
            file={file} 
            onConfirm={(corners) => submit(corners)} 
            onCancel={() => {
              setFile(null);
              setShowScanner(false);
            }} 
          />
        ) : loading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-4">
            <Loader2 size={32} className="animate-spin text-brand-600" style={{ color: "var(--color-brand-600)" }} />
            <div className="text-sm font-medium text-slate-700">Uploading & analyzing print...</div>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <label className="block mb-2 text-sm font-semibold text-slate-900">
                1. Select Reference Artwork
              </label>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search artwork by title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-3 text-sm text-slate-900 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 focus:outline-none transition-all shadow-sm"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredArtworks.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setArtworkId(a.id)}
                    className={`relative flex items-center justify-between gap-3 rounded-xl border p-4 text-left transition-all ${
                      artworkId === a.id
                        ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600"
                        : "border-slate-100 bg-slate-50 hover:border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-semibold truncate ${artworkId === a.id ? "text-brand-900" : "text-slate-900"}`}>
                        {a.title}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mt-0.5">
                        Approved Reference
                      </div>
                    </div>
                    {artworkId === a.id && (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white shadow-sm">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                ))}
                {filteredArtworks.length === 0 && (
                  <div className="col-span-full py-8 text-center text-slate-500 text-sm italic">
                    No matching artworks found.
                  </div>
                )}
              </div>
            </div>

            <label className="block mb-4 text-sm font-semibold text-slate-900">
              2. Upload Printed Photo
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Take Photo Button */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="group flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-slate-200 bg-white px-6 py-10 text-center transition-all hover:border-brand-500 hover:shadow-md"
                style={{ "--hover-border": "var(--color-brand-500)" } as any}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-600 group-hover:bg-brand-50 group-hover:text-brand-600">
                  <Camera size={24} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">Take Photo</div>
                  <div className="text-xs text-slate-500">Use device camera</div>
                </div>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFileSelected(e.target.files[0]);
                  }}
                />
              </button>

              {/* Upload Drag & Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                className={`group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                  dragOver
                    ? "border-emerald-500 bg-emerald-50/60"
                    : "border-slate-300 bg-slate-50/60 hover:border-emerald-500 hover:bg-emerald-50/40"
                }`}
              >
                <motion.div
                  animate={{
                    y: dragOver ? -4 : 0,
                    scale: dragOver ? 1.05 : 1,
                  }}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm"
                >
                  <UploadCloud size={24} />
                </motion.div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">Upload Photo</div>
                  <div className="text-xs text-slate-500">PNG, JPG, WebP</div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFileSelected(e.target.files[0]);
                  }}
                />
              </div>
            </div>

            {error && (
              <div className="mt-6 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                <AlertCircle size={16} className="mt-0.5 flex-none" />
                {error}
              </div>
            )}
          </div>
        )}
      </Card>

      <div className="space-y-4">
        <Callout title="What happens next?" tone="brand">
          The printed carton is aligned to the approved artwork. Using the 4 corners you provide, the image is perspective-corrected to perfectly match the artwork before analysis.
        </Callout>
        <Callout tone="info">
          Take a flat, well-lit, top-down photo. Drag the 4 corner handles exactly to the physical corners of the carton for the best results.
        </Callout>
      </div>
    </div>
  );
}

import { FileUp, Loader2, ScanText } from "lucide-react"
import { useRef, useState } from "react"
import type { DragEvent } from "react"
import { useNavigate } from "react-router"

import { Container } from "@/components/PageState"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { api, ApiError } from "@/lib/api"

const MAX_BYTES = 10 * 1024 * 1024

export function Sell() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setError(null)
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    if (!isPdf) return setError("Please upload your ticket as a PDF.")
    if (file.size > MAX_BYTES) return setError("That file is over 10 MB. Upload the original ticket PDF.")

    setUploading(file.name)
    try {
      const result = await api.uploadTicket(file)
      navigate(`/sell/${result.listing.id}`, { state: result })
    } catch (e) {
      const errors = e instanceof ApiError ? Object.values(e.errors) : []
      setError(errors[0] ?? (e instanceof ApiError ? e.message : "Upload failed. Please try again."))
      setUploading(null)
    } finally {
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    if (!uploading) handleFile(e.dataTransfer.files[0])
  }

  return (
    <Container className="max-w-2xl">
      <div className="mb-6 space-y-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Sell a ticket</h1>
        <p className="text-muted-foreground">
          Upload the PDF you received from the organiser. We read the event details from it, then you set your price.
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {uploading ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border bg-muted/40 px-6 py-16 text-center" role="status" aria-live="polite">
          <div className="relative grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
            <ScanText className="size-6" />
            <Loader2 className="absolute inset-0 size-14 animate-spin text-primary/40" />
          </div>
          <div>
            <p className="font-medium">Reading your ticket…</p>
            <p className="text-sm text-muted-foreground">This usually takes 10–30 seconds. Keep this page open.</p>
          </div>
          <p className="max-w-full truncate text-xs text-muted-foreground">{uploading}</p>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center gap-4 rounded-xl border-2 border-dashed px-6 py-16 text-center transition-colors ${
            dragging ? "border-primary bg-primary/5" : "border-border"
          }`}
        >
          <div className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
            <FileUp className="size-6" />
          </div>
          <div>
            <p className="font-medium">Drag your ticket PDF here</p>
            <p className="text-sm text-muted-foreground">PDF only, up to 10 MB</p>
          </div>
          <Button onClick={() => inputRef.current?.click()}>Choose file</Button>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            onChange={(e) => handleFile(e.target.files?.[0])}
            aria-label="Ticket PDF"
          />
        </div>
      )}

      <ul className="mt-6 space-y-1 text-sm text-muted-foreground">
        <li>· Your PDF is stored privately and only sent to the buyer after they pay.</li>
        <li>· Each ticket can only be listed once.</li>
        <li>· You can ask at most 120% of the price printed on the ticket.</li>
      </ul>
    </Container>
  )
}

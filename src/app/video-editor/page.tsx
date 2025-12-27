import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Film, Type, Sparkles, UploadCloud } from "lucide-react"
import Link from "next/link"

export default function VideoEditorPage() {
  return (
    <div className="container py-8">
      <Card>
        <CardHeader>
          <CardTitle>AI Video Editor</CardTitle>
          <CardDescription>Create amazing videos with our AI-powered editing suite</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-2 border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Film className="h-5 w-5 text-primary" />
                  Visual Editor
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Drag and drop interface for arranging scenes, adding captions, and incorporating AI-generated B-roll footage.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary"></span>
                    Timeline-based scene arrangement
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary"></span>
                    Real-time video preview
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary"></span>
                    AI-powered B-roll suggestions
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary"></span>
                    Caption positioning and styling
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="h-5 w-5 text-primary" />
                  Transcript Editor
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Upload videos and automatically generate editable transcripts. Edit text to automatically trim your video.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary"></span>
                    Automatic speech recognition
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary"></span>
                    Click-to-sync video playback
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary"></span>
                    Text-based video trimming
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary"></span>
                    Export to visual editor
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="rounded-lg border bg-muted p-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI-Powered Features
            </h3>
            <p className="text-sm text-muted-foreground mt-2">
              Our AI assistant helps you create professional videos faster:
            </p>
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3 text-sm">
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary"></span>
                Automatic B-roll suggestions
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary"></span>
                Smart caption placement
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary"></span>
                Brand-consistent styling
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button size="lg" asChild>
              <Link href="/dashboard/video-editor">
                <Film className="mr-2 h-5 w-5" />
                Open Visual Editor
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/dashboard/video-editor/transcript-editor">
                <Type className="mr-2 h-5 w-5" />
                Open Transcript Editor
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

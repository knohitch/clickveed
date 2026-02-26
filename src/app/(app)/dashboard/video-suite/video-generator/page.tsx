import { VideoGeneratorStudio } from '@/components/video-generator-studio';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function VideoGeneratorPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Video Generator</CardTitle>
        <CardDescription>
          Generate videos directly from prompts with Veo as primary provider and automatic fallbacks.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <VideoGeneratorStudio />
      </CardContent>
    </Card>
  );
}


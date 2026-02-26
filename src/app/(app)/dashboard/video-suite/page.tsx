
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, FileText, ImageIcon, MicVocal, Link as LinkIcon, Library, UserSquare, Clapperboard, Scissors, Workflow, Video } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const tools = [
    {
        title: "AI Video Generator",
        description: "Generate direct text-to-video renders with Veo first and smart fallback providers.",
        icon: Video,
        href: "/dashboard/video-suite/video-generator",
        cta: "Generate Video",
    },
    {
        title: "Video Pipeline",
        description: "A step-by-step wizard to create a complete video from scratch.",
        icon: Workflow,
        href: "/dashboard/video-pipeline",
        cta: "Start Pipeline",
    },
    {
        title: "Video Editor",
        description: "Assemble scenes, add B-roll, captions, and finalize your video.",
        icon: Clapperboard,
        href: "/dashboard/video-editor",
        cta: "Open Editor",
    },
    {
        title: "Magic Clips Generator",
        description: "Auto-magically find 20+ viral clips from a single long-form video.",
        icon: Scissors,
        href: "/dashboard/video-suite/magic-clips",
        cta: "Find Clips",
    },
    {
        title: "AI Script Generator",
        description: "Generate a complete video script from a simple topic or idea.",
        icon: FileText,
        href: "/dashboard/video-suite/script-generator",
        cta: "Create Script",
    },
    {
        title: "AI Voice Over",
        description: "Generate realistic voice overs from your scripts in multiple voices.",
        icon: MicVocal,
        href: "/dashboard/video-suite/voice-over",
        cta: "Generate Voice",
    },
    {
        title: "AI Image to Video",
        description: "Transform a static image into a dynamic video with effects and music.",
        icon: ImageIcon,
        href: "/dashboard/video-suite/image-to-video",
        cta: "Create Video",
    },
    {
        title: "AI Voice Cloning",
        description: "Create a digital clone of your voice by providing audio samples.",
        icon: MicVocal,
        href: "/dashboard/video-suite/voice-cloning",
        cta: "Clone Voice",
    },
    {
        title: "AI Video From URL",
        description: "Paste a link to an article to generate a summary video script.",
        icon: LinkIcon,
        href: "/dashboard/video-suite/video-from-url",
        cta: "Generate from URL",
    },
    {
        title: "AI Stock Media Generator",
        description: "Generate unique, royalty-free images for your projects with a text prompt.",
        icon: Library,
        href: "/dashboard/video-suite/stock-media-library",
        cta: "Generate Media",
    },
    {
        title: "AI Persona & Avatar Studio",
        description: "Define an AI personality and generate a visual avatar for your videos.",
        icon: UserSquare,
        href: "/dashboard/video-suite/persona-avatar-studio",
        cta: "Create Persona",
    },
];

export default function VideoSuitePage() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tools.map((tool) => (
                <Card key={tool.title} className="flex flex-col">
                    <CardHeader className="flex-row items-center gap-4 space-y-0 pb-4">
                        <div className="p-3 bg-muted rounded-full">
                           <tool.icon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <CardTitle>{tool.title}</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <CardDescription>{tool.description}</CardDescription>
                    </CardContent>
                    <CardContent>
                        <Button asChild className="w-full">
                            <Link href={tool.href}>
                                {tool.cta} <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

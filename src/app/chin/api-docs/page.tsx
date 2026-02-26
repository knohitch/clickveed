import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, ImageIcon, Video, MicVocal, Workflow, KeyRound, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";

const ApiDocCard = ({ title, icon: Icon, docs }: { title: string, icon: React.ElementType, docs: { name: string, url: string }[] }) => (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Icon className="h-5 w-5" /> {title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
            {docs.map((doc, index) => (
                <React.Fragment key={doc.name}>
                    <div className="flex justify-between items-center">
                        <span className="font-medium">{doc.name}</span>
                        <Button variant="outline" size="sm" asChild>
                            <Link href={doc.url} target="_blank" rel="noopener noreferrer">
                                View Docs <ExternalLink className="ml-2 h-3 w-3"/>
                            </Link>
                        </Button>
                    </div>
                    {index < docs.length - 1 && <Separator />}
                </React.Fragment>
            ))}
        </CardContent>
    </Card>
);

export default function ChinApiDocsPage() {
    const apiDocs = {
        languageModels: [
            { name: "Google Gemini", url: "https://ai.google.dev/tutorials/get_api_key" },
            { name: "OpenAI (GPT-4o, etc.)", url: "https://platform.openai.com/api-keys" },
        ],
        videoGeneration: [
            { name: "Google VEO", url: "https://deepmind.google/technologies/veo/" },
            { name: "Pexels (Stock Video)", url: "https://www.pexels.com/api/documentation/" },
            { name: "Pixabay (Stock Video)", url: "https://pixabay.com/api/docs/" },
        ],
        platformAndWorkflow: [
            { name: "n8n", url: "https://docs.n8n.io/integrations/credentials/api-key/" },
            { name: "Make.com", url: "https://www.make.com/en/help/connections/connecting-to-make-with-an-api-key" },
            { name: "Replicate", url: "https://replicate.com/docs/get-started/nodejs#get-an-api-token" },
        ],
        imageGeneration: [
            { name: "Unsplash (Stock Photos)", url: "https://unsplash.com/documentation#getting-started" },
        ],
        audioAndVoice: [
            { name: "Minimax (Primary TTS)", url: "https://www.minimax.io/platform/document" },
            { name: "ElevenLabs", url: "https://elevenlabs.io/docs/api-reference/quick-start" },
        ],
    };

    return (
        <div className="container py-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">API Documentation</h1>
                <p className="text-muted-foreground">
                    Find links to the official documentation for each integrated service to learn how to obtain and configure API keys.
                </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="space-y-8">
                    <ApiDocCard title="Language Models" icon={Bot} docs={apiDocs.languageModels} />
                    <ApiDocCard title="Video Generation & Stock" icon={Video} docs={apiDocs.videoGeneration} />
                </div>
                 <div className="space-y-8">
                    <ApiDocCard title="Image Generation & Stock" icon={ImageIcon} docs={apiDocs.imageGeneration} />
                    <ApiDocCard title="Audio & Voice" icon={MicVocal} docs={apiDocs.audioAndVoice} />
                    <ApiDocCard title="Platform & Workflow" icon={Workflow} docs={apiDocs.platformAndWorkflow} />
                </div>
            </div>
        </div>
    );
}

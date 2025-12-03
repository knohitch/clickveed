
'use client';

import * as React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, FileText, Mic, Video, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScriptStep } from '@/components/pipeline/script-step';
import { VoiceStep } from '@/components/pipeline/voice-step';
import { VideoStep } from '@/components/pipeline/video-step';
import { ReviewStep } from '@/components/pipeline/review-step';
import Link from 'next/link';

type Step = 'script' | 'voice' | 'video' | 'review';

const steps = [
  { id: 'script', name: 'Script', icon: FileText },
  { id: 'voice', name: 'Voice & Audio', icon: Mic },
  { id: 'video', name: 'Generate Video', icon: Video },
  { id: 'review', name: 'Review & Finish', icon: Check },
];

export default function VideoPipelinePage() {
  const [currentStep, setCurrentStep] = useState<Step>('script');
  const [completedSteps, setCompletedSteps] = useState<Set<Step>>(new Set());
  
  // State to hold the outputs of each step
  const [script, setScript] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);
  
  const isNextStepDisabled = () => {
    switch(currentStep) {
        case 'script':
            return !script;
        case 'voice':
            return !audioUrl;
        case 'video':
            return !videoUrl;
        case 'review':
            return true; // No next step from review
        default:
            return true;
    }
  }

  const goToNextStep = () => {
    const nextStepIndex = currentStepIndex + 1;
    if (nextStepIndex < steps.length) {
      setCompletedSteps(prev => new Set(prev).add(currentStep));
      setCurrentStep(steps[nextStepIndex].id as Step);
    }
  };

  const goToPreviousStep = () => {
    const prevStepIndex = currentStepIndex - 1;
    if (prevStepIndex >= 0) {
        setCurrentStep(steps[prevStepIndex].id as Step);
    }
  };
  
  const goToStep = (stepId: Step) => {
    const stepIndex = steps.findIndex(s => s.id === stepId);
    if(stepIndex < currentStepIndex || completedSteps.has(stepId)) {
        setCurrentStep(stepId);
    }
  }

  const handleScriptGenerated = (newScript: string) => {
    setScript(newScript);
    // When a new script is made, invalidate subsequent steps
    setAudioUrl(null);
    setVideoUrl(null);
    setCompletedSteps(new Set<Step>(['script']));
    goToNextStep();
  };

  const handleVoiceoverGenerated = (newAudio: string) => {
    setAudioUrl(newAudio);
    // Invalidate the video step as the audio has changed
    setVideoUrl(null);
    const newCompleted = new Set<Step>(['script', 'voice']);
    setCompletedSteps(newCompleted);
    goToNextStep();
  };
  
  const handleVideoGenerated = (newVideo: string) => {
    setVideoUrl(newVideo);
    const newCompleted = new Set<Step>(['script', 'voice', 'video']);
    setCompletedSteps(newCompleted);
    goToNextStep();
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">AI Video Pipeline</h1>
        <p className="text-muted-foreground">
          Create a complete video in a few easy steps, from script to final cut.
        </p>
      </div>

      {/* Stepper Navigation */}
      <div className="flex justify-between items-center border-b pb-4">
        {steps.map((step, index) => {
            const isCompleted = completedSteps.has(step.id as Step);
            const isActive = index === currentStepIndex;

            return (
                <React.Fragment key={step.id}>
                    <div 
                        onClick={() => (isCompleted || index < currentStepIndex) && goToStep(step.id as Step)}
                        className={cn(
                            "flex items-center gap-3",
                            (isCompleted || index < currentStepIndex) && "cursor-pointer"
                        )}
                    >
                        <div className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                            isCompleted ? "bg-primary border-primary text-primary-foreground" : "bg-muted",
                            isActive ? "border-primary" : "border-border"
                        )}>
                            {isCompleted ? <Check className="h-6 w-6" /> : <step.icon className="h-5 w-5 text-muted-foreground" />}
                        </div>
                        <div>
                            <p className={cn(
                                "text-sm font-medium transition-colors",
                                 isActive ? "text-primary" : "text-muted-foreground"
                            )}>
                                Step {index + 1}
                            </p>
                            <p className="text-lg font-semibold">{step.name}</p>
                        </div>
                    </div>
                    {index < steps.length - 1 && (
                        <div className="h-px w-full flex-1 bg-border hidden md:block mx-4" />
                    )}
                </React.Fragment>
            )
        })}
      </div>

      {/* Main Content Area */}
      <Card>
        <CardHeader>
          <CardTitle>Step {currentStepIndex + 1}: {steps[currentStepIndex].name}</CardTitle>
           <CardDescription>
            {currentStep === 'script' && 'Provide a topic or a brief idea, and our AI will generate a complete video script for you.'}
            {currentStep === 'voice' && 'Choose a voice for your video\'s narration based on the generated script.'}
            {currentStep === 'video' && 'Generate the visual content for your video based on the script.'}
            {currentStep === 'review' && 'Review the final video, audio, and script. Download your assets when you\'re ready.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
            {currentStep === 'script' && (
                <ScriptStep 
                    onScriptGenerated={handleScriptGenerated}
                />
            )}
            {currentStep === 'voice' && script && (
                <VoiceStep 
                    script={script}
                    onVoiceoverGenerated={handleVoiceoverGenerated}
                />
            )}
            {currentStep === 'video' && script && (
                <VideoStep 
                    script={script}
                    onVideoGenerated={handleVideoGenerated}
                />
            )}
            {currentStep === 'review' && (
                <ReviewStep
                    script={script}
                    audioUrl={audioUrl}
                    videoUrl={videoUrl}
                />
            )}

        </CardContent>
      </Card>
      
      {/* Navigation Buttons */}
       <div className="flex justify-between">
            <Button variant="outline" onClick={goToPreviousStep} disabled={currentStepIndex === 0}>
                Previous Step
            </Button>
            {currentStep === 'review' ? (
                 <Button asChild>
                    <Link href="/dashboard/projects">
                        Finish & Go to Projects <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            ) : (
                 <Button onClick={goToNextStep} disabled={isNextStepDisabled()}>
                    Next Step
                </Button>
            )}
        </div>
    </div>
  );
}

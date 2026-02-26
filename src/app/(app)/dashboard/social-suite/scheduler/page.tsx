
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, Clapperboard, Send, Clock, PenSquare, Save } from 'lucide-react';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getProjects, type Project } from '@/server/actions/project-actions';
import {
    Facebook,
    Instagram,
    Youtube,
} from "lucide-react";

// A placeholder for a TikTok icon
const TikTokIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-2.43.05-4.84-.95-6.6-2.73-1.75-1.78-2.55-4.16-2.4-6.6.14-2.44 1.11-4.75 2.87-6.36 1.75-1.62 4.06-2.43 6.42-2.29.02 1.52.02 3.04.01 4.56-.52-.01-1.04.04-1.56.04-1.29 0-2.54.49-3.47 1.44-.92.95-1.39 2.22-1.38 3.54.02 1.37.47 2.68 1.44 3.63.97.96 2.29 1.41 3.63 1.41.02 0 .02 0 .03 0 .86 0 1.69-.21 2.44-.6.81-.39 1.49-.96 1.99-1.66.44-.6.75-1.32.92-2.09.13-.6.18-1.22.2-1.84.02-3.33.01-6.67 0-10.01z" />
    </svg>
);

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" fill="currentColor" {...props}>
        <path d="M 25 2 C 12.318 2 2 12.318 2 25 C 2 28.96 3.0228906 32.853062 4.9628906 36.289062 L 2.0371094 46.730469 C 1.9411094 47.073469 2.03325 47.440312 2.28125 47.695312 C 2.47225 47.892313 2.733 48 3 48 C 3.08 48 3.1612344 47.989703 3.2402344 47.970703 L 14.136719 45.271484 C 17.463719 47.057484 21.21 48 25 48 C 37.682 48 48 37.682 48 25 C 48 12.318 37.682 2 25 2 z M 16.642578 14 C 17.036578 14 17.428437 14.005484 17.773438 14.021484 C 18.136437 14.039484 18.624516 13.883484 19.103516 15.021484 C 19.595516 16.189484 20.775875 19.058563 20.921875 19.351562 C 21.069875 19.643563 21.168656 19.984047 20.972656 20.373047 C 20.776656 20.762047 20.678813 21.006656 20.382812 21.347656 C 20.086813 21.688656 19.762094 22.107141 19.496094 22.369141 C 19.200094 22.660141 18.892328 22.974594 19.236328 23.558594 C 19.580328 24.142594 20.765484 26.051656 22.521484 27.597656 C 24.776484 29.583656 26.679531 30.200188 27.269531 30.492188 C 27.859531 30.784188 28.204828 30.734703 28.548828 30.345703 C 28.892828 29.955703 30.024969 28.643547 30.417969 28.060547 C 30.810969 27.477547 31.204094 27.572578 31.746094 27.767578 C 32.288094 27.961578 35.19125 29.372062 35.78125 29.664062 C 36.37125 29.956063 36.766062 30.102703 36.914062 30.345703 C 37.062062 30.587703 37.062312 31.754234 36.570312 33.115234 C 36.078313 34.477234 33.717984 35.721672 32.583984 35.888672 C 31.565984 36.037672 30.277281 36.10025 28.863281 35.65625 C 28.006281 35.38625 26.907047 35.028734 25.498047 34.427734 C 19.575047 31.901734 15.706156 26.012047 15.410156 25.623047 C 15.115156 25.234047 13 22.46275 13 19.59375 C 13 16.72475 14.524406 15.314469 15.066406 14.730469 C 15.608406 14.146469 16.248578 14 16.642578 14 z" />
    </svg>
);

const SnapchatIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" fill="currentColor" {...props}>
        <path d="M46.6,35.1c-5.8-1-8.4-7.1-8.5-7.1c0,0,0-0.1-0.1-0.1c-0.3-0.6-0.3-0.9-0.2-1.2c0.2-0.6,1.6-1,2.2-1.2c0,0,0.1,0,0.1-0.1	c0,0,0.1,0,0.1,0c0.1,0,0.3-0.1,0.4-0.1c1.7-0.7,2.6-1.6,2.6-2.7c0-1-0.9-1.8-1.8-2c-0.2-0.1-0.4-0.1-0.5-0.1	c-0.2,0-0.4-0.1-0.6-0.1c-0.3,0-0.7,0-1.1,0.2C38.6,20.9,38,21,37.6,21c0-0.2,0-0.4,0-0.6l0,0l0-0.3c0.2-3.2,0.5-6.8-0.6-9	C33.9,4,27.3,3.5,25.4,3.5h-0.9c-2,0-8.6,0.5-11.6,7.5c-0.9,2.3-0.8,5.9-0.6,9.3c0,0.2,0,0.4,0,0.7c-0.1,0-0.2,0-0.3,0	c-0.5,0-1.2-0.2-1.8-0.5c-0.4-0.2-0.8-0.2-1-0.2c-1.2,0-2.5,0.7-2.7,2c0,0,0,0.1,0,0.1c0,1.2,0.9,2.2,2.6,2.8	c0.2,0.1,0.3,0.1,0.4,0.1c0,0,0.1,0,0.1,0c0,0,0.1,0,0.1,0.1c0.6,0.2,2,0.7,2.2,1.2c0,0,0,0.1,0,0.1c0.1,0.1,0.1,0.4-0.2,1	c0,0,0,0.1,0,0.1c0,0.1-2.6,6.2-8.5,7.1c-0.1,0-0.2,0-0.3,0.1c-0.4,0.2-1,0.7-1,1.4v0.2c0,0.2,0,0.3,0.1,0.4	c0.6,1.2,2.6,2.1,6.1,2.6c0,0.1,0.1,0.2,0.1,0.3c0.1,0.1,0.1,0.3,0.2,0.4c0,0.3,0.1,0.5,0.2,0.8l0.1,0.2c0.2,0.8,0.8,1.3,1.6,1.3	c0.2,0,0.6,0,1.1-0.1l0.4-0.1c0.5-0.1,1.2-0.2,1.9-0.2c0.5,0,1.1,0.1,1.6,0.2c1,0.2,1.9,0.7,3,1.5c0,0,0.1,0.1,0.1,0.1	c1.7,1.1,3.5,2.4,6.4,2.4h0.5c2.9,0,4.8-1.3,6.3-2.5l0.4-0.2c0.9-0.6,1.8-1.1,2.6-1.3c1.3-0.2,2.4-0.2,3.4,0c0.2,0,0.4,0.1,0.5,0.1	c0.5,0.1,0.9,0.1,1.1,0.1h0.1c0.8,0,1.3-0.4,1.5-1.1c0.1-0.2,0.1-0.4,0.1-0.7c0-0.1,0-0.2,0.1-0.3c0,0,0-0.1,0-0.1	c0.1-0.4,0.1-0.6,0.2-0.7c3.4-0.5,5.3-1.3,6-2.5c0.3-0.4,0.3-0.7,0.3-0.9C47.9,35.8,47.3,35.2,46.6,35.1z" />
    </svg>
);

const ThreadsIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" fill="currentColor" {...props}>
        <path d="M46,9v32c0,2.757-2.243,5-5,5H9c-2.757,0-5-2.243,5-5V9c0-2.757,2.243-5,5-5h32C43.757,4,46,6.243,46,9z M33.544,35.913	c2.711-2.708,2.635-6.093,1.746-8.17c-0.54-1.255-1.508-2.33-2.798-3.108l-0.223-0.138c-0.33-0.208-0.609-0.375-1.046-0.542	c-0.008-0.278-0.025-0.556-0.058-0.807c-0.59-4.561-3.551-5.535-5.938-5.55c-2.154,0-3.946,0.92-5.044,2.592l1.672,1.098	c0.736-1.121,1.871-1.689,3.366-1.689c2.367,0.015,3.625,1.223,3.96,3.801c-1.141-0.231-2.426-0.314-3.807-0.233	c-3.924,0.226-5.561,2.591-5.442,4.836c0.134,2.486,2.278,4.222,5.216,4.222c0.13,0,0.259-0.003,0.384-0.011	c2.297-0.126,5.105-1.29,5.61-6.063c0.021,0.013,0.041,0.026,0.062,0.039l0.253,0.157c0.932,0.562,1.621,1.317,1.994,2.185	c0.643,1.501,0.682,3.964-1.322,5.966c-1.732,1.73-3.812,2.479-6.936,2.502c-3.47-0.026-6.099-1.145-7.812-3.325	c-1.596-2.028-2.42-4.953-2.451-8.677c0.031-3.728,0.855-6.646,2.451-8.673c1.714-2.181,4.349-3.299,7.814-3.325	c3.492,0.026,6.165,1.149,7.944,3.338c0.864,1.063,1.525,2.409,1.965,3.998l1.928-0.532c-0.514-1.858-1.301-3.449-2.341-4.728	c-2.174-2.674-5.363-4.045-9.496-4.076c-4.12,0.031-7.278,1.406-9.387,4.089c-1.875,2.383-2.844,5.712-2.879,9.91	c0.035,4.193,1.004,7.529,2.879,9.913c2.109,2.682,5.262,4.058,9.385,4.088C28.857,38.973,31.433,38.021,33.544,35.913z M28.993,25.405c0.07,0.016,0.138,0.031,0.202,0.046c-0.005,0.078-0.01,0.146-0.015,0.198c-0.314,3.928-2.295,4.489-3.761,4.569	c-0.091,0.005-0.181,0.008-0.271,0.008c-1.851,0-3.144-0.936-3.218-2.329c-0.065-1.218,0.836-2.576,3.561-2.732	c0.297-0.018,0.589-0.027,0.875-0.027C27.325,25.137,28.209,25.227,28.993,25.405z" />
    </svg>
);

const LinkedInIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M4.98 3.5C4.98 4.88 3.86 6 2.48 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8h4V24h-4V8zm7 0h3.8v2.2h.1c.53-1 1.83-2.2 3.78-2.2 4.04 0 4.79 2.66 4.79 6.12V24h-4v-7.7c0-1.84-.03-4.2-2.56-4.2-2.56 0-2.95 2-2.95 4.06V24h-4V8z"/>
    </svg>
);

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1227" fill="currentColor" {...props}>
        <path d="M714 519 1160 0h-106L667 450 358 0H0l468 681L0 1227h106l409-476 327 476h358L714 519zM568 689l-47-67L150 91h163l300 428 47 67 389 550H886L568 689z" />
    </svg>
);

const socialPlatforms = [
    { id: 'instagram', name: 'Instagram', icon: Instagram },
    { id: 'youtube', name: 'YouTube', icon: Youtube },
    { id: 'tiktok', name: 'TikTok', icon: TikTokIcon },
    { id: 'facebook', name: 'Facebook', icon: Facebook },
    { id: 'linkedin', name: 'LinkedIn', icon: LinkedInIcon },
    { id: 'x', name: 'X (Twitter)', icon: XIcon },
    { id: 'threads', name: 'Threads', icon: ThreadsIcon },
    { id: 'snapchat', name: 'Snapchat', icon: SnapchatIcon },
    { id: 'whatsapp', name: 'WhatsApp', icon: WhatsAppIcon },
];

type ScheduleMode = 'now' | 'later' | 'draft';
type PlatformId = typeof socialPlatforms[number]['id'];
type Captions = Record<PlatformId, string>;

export default function SchedulerPage() {
    const { toast } = useToast();
    const [allProjects, setAllProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
    const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformId[]>([]);
    const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('now');
    const [scheduleDate, setScheduleDate] = useState<Date | undefined>(new Date());
    const [scheduleTime, setScheduleTime] = useState('14:30');
    
    const [mainCaption, setMainCaption] = useState('');
    const [customCaptions, setCustomCaptions] = useState<Captions>({
        instagram: '',
        youtube: '',
        tiktok: '',
        facebook: '',
        linkedin: '',
        x: '',
        threads: '',
        snapchat: '',
        whatsapp: '',
    });
    const [activeTab, setActiveTab] = useState<PlatformId | null>(null);
    
    useEffect(() => {
        const fetchUserProjects = async () => {
            setLoading(true);
            const projects = await getProjects();
            setAllProjects(projects);
            setLoading(false);
        };
        fetchUserProjects();
    }, []);

    const selectedProject = allProjects.find(p => p.id === selectedProjectId) || null;

    useEffect(() => {
        // Sync custom captions with the main caption if they haven't been customized yet.
        const newCustomCaptions = { ...customCaptions };
        for (const platformId of selectedPlatforms) {
            // If the custom caption is empty, it should be synced with the main caption.
            if (newCustomCaptions[platformId] === '') {
                newCustomCaptions[platformId] = mainCaption;
            }
        }
        setCustomCaptions(newCustomCaptions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mainCaption, selectedPlatforms]);


    useEffect(() => {
        // Set the active tab to the first selected platform
        if (selectedPlatforms.length > 0 && !activeTab) {
            setActiveTab(selectedPlatforms[0]);
        } else if (selectedPlatforms.length === 0) {
            setActiveTab(null);
        } else if (activeTab && !selectedPlatforms.includes(activeTab)) {
            // If the active tab is unselected, switch to the first available one
            setActiveTab(selectedPlatforms[0] || null);
        }
    }, [selectedPlatforms, activeTab]);

    const handlePlatformToggle = (platformId: PlatformId) => {
        setSelectedPlatforms(prev =>
            prev.includes(platformId)
                ? prev.filter(id => id !== platformId)
                : [...prev, platformId]
        );
    };

    const handleSchedule = () => {
        if (!selectedProjectId || selectedPlatforms.length === 0 || !mainCaption) {
            toast({
                variant: 'destructive',
                title: 'Missing Information',
                description: 'Please select a project, at least one platform, and write a caption.'
            });
            return;
        }

        let toastMessage = '';
        if (scheduleMode === 'now') {
            toastMessage = `Your post for "${selectedProject?.title}" will be published immediately to ${selectedPlatforms.join(', ')}.`;
        } else if (scheduleMode === 'later') {
            toastMessage = `Your post for "${selectedProject?.title}" will be published ${format(scheduleDate || new Date(), 'PPP')} at ${scheduleTime} to ${selectedPlatforms.join(', ')}.`;
        } else { // draft
             toastMessage = `Your post for "${selectedProject?.title}" has been saved as a draft.`;
        }
        
        toast({
            title: scheduleMode === 'draft' ? 'Draft Saved!' : 'Post Scheduled!',
            description: toastMessage,
        });
    };

    const getButtonContent = () => {
        switch (scheduleMode) {
            case 'now':
                return { icon: Send, text: 'Publish Now' };
            case 'later':
                return { icon: Clock, text: 'Schedule Post' };
            case 'draft':
                return { icon: Save, text: 'Save Draft' };
            default:
                return { icon: Send, text: 'Publish Now' };
        }
    };

    const { icon: ButtonIcon, text: buttonText } = getButtonContent();
    const captionForPreview = activeTab ? customCaptions[activeTab] : mainCaption;

    return (
        <div className="grid lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Form & Controls */}
            <div className="lg:col-span-7 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>1. Select Project</CardTitle>
                        <CardDescription>Choose the video project you want to schedule.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Select onValueChange={(val) => setSelectedProjectId(Number(val))} disabled={loading}>
                            <SelectTrigger>
                                <SelectValue placeholder={loading ? "Loading projects..." : "Select a project..."} />
                            </SelectTrigger>
                            <SelectContent>
                                {allProjects.map(p => (
                                    <SelectItem key={p.id} value={String(p.id)}>{p.title}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>2. Choose Platforms</CardTitle>
                        <CardDescription>Select where you want to post this video.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {socialPlatforms.map(platform => (
                            <div 
                                key={platform.id}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-2 p-4 border rounded-lg cursor-pointer transition-all",
                                    selectedPlatforms.includes(platform.id) ? "border-primary bg-primary/10" : "hover:bg-muted"
                                )}
                                onClick={() => handlePlatformToggle(platform.id)}
                            >
                                <platform.icon className="h-8 w-8" />
                                <span className="text-sm font-medium">{platform.name}</span>
                                <Checkbox checked={selectedPlatforms.includes(platform.id)} className="mt-2" />
                            </div>
                        ))}
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle>3. Write Caption</CardTitle>
                        <CardDescription>Craft your message. This will be the default for all platforms.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea 
                            placeholder="Tell your audience about this video..." 
                            rows={6}
                            value={mainCaption}
                            onChange={(e) => setMainCaption(e.target.value)}
                        />
                    </CardContent>
                </Card>
                
                {selectedPlatforms.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>4. Customize Posts (Optional)</CardTitle>
                            <CardDescription>Refine captions for each platform.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs value={activeTab || ''} onValueChange={(value) => setActiveTab(value as PlatformId)}>
                                <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${selectedPlatforms.length}, minmax(0, 1fr))`}}>
                                    {selectedPlatforms.map(platformId => {
                                        const platform = socialPlatforms.find(p => p.id === platformId);
                                        return platform ? <TabsTrigger key={platform.id} value={platform.id}>{platform.name}</TabsTrigger> : null;
                                    })}
                                </TabsList>
                                {selectedPlatforms.map(platformId => (
                                    <TabsContent key={platformId} value={platformId} className="mt-4">
                                        <Textarea
                                            value={customCaptions[platformId]}
                                            onChange={(e) => setCustomCaptions(prev => ({...prev, [platformId]: e.target.value}))}
                                            rows={5}
                                            placeholder={`Custom caption for ${socialPlatforms.find(p=>p.id === platformId)?.name}...`}
                                        />
                                    </TabsContent>
                                ))}
                            </Tabs>
                        </CardContent>
                    </Card>
                )}


                <Card>
                    <CardHeader>
                        <CardTitle>5. Schedule Post</CardTitle>
                        <CardDescription>Publish immediately, save as a draft, or choose a specific time.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <RadioGroup value={scheduleMode} onValueChange={(val: ScheduleMode) => setScheduleMode(val)} className="space-y-4">
                            <Label className="flex items-center gap-3 p-4 border rounded-lg has-[:checked]:border-primary">
                                <RadioGroupItem value="now" id="now" />
                                <div>
                                    <p className="font-semibold">Post Now</p>
                                    <p className="text-sm text-muted-foreground">Publish the post as soon as you confirm.</p>
                                </div>
                            </Label>
                             <Label className="flex items-center gap-3 p-4 border rounded-lg has-[:checked]:border-primary">
                                <RadioGroupItem value="later" id="later" />
                                <div>
                                    <p className="font-semibold">Schedule for Later</p>
                                    <p className="text-sm text-muted-foreground">Choose a specific date and time to publish.</p>
                                </div>
                            </Label>
                             <Label className="flex items-center gap-3 p-4 border rounded-lg has-[:checked]:border-primary">
                                <RadioGroupItem value="draft" id="draft" />
                                <div>
                                    <p className="font-semibold">Save as Draft</p>
                                    <p className="text-sm text-muted-foreground">Save the post to finish and schedule later.</p>
                                </div>
                            </Label>
                        </RadioGroup>
                        {scheduleMode === 'later' && (
                            <div className="grid sm:grid-cols-2 gap-4 mt-4 p-4 border-t">
                                 <Popover>
                                    <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn("w-full justify-start text-left font-normal", !scheduleDate && "text-muted-foreground")}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {scheduleDate ? format(scheduleDate, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={scheduleDate} onSelect={setScheduleDate} initialFocus />
                                    </PopoverContent>
                                </Popover>
                                <Input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} />
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Button size="lg" className="w-full" onClick={handleSchedule}>
                    <ButtonIcon className="mr-2 h-5 w-5" />
                    {buttonText}
                </Button>
            </div>

            {/* Right Column: Preview */}
            <div className="lg:col-span-5 lg:sticky top-20">
                <Card>
                    <CardHeader>
                        <CardTitle>Live Preview</CardTitle>
                        {activeTab && <CardDescription>Previewing for {socialPlatforms.find(p=>p.id===activeTab)?.name}</CardDescription>}
                    </CardHeader>
                    <CardContent>
                        <Card className="overflow-hidden">
                            <CardContent className="p-4 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-muted rounded-full">
                                        <Clapperboard className="h-5 w-5 text-primary" />
                                    </div>
                                    <span className="font-semibold">Your Brand</span>
                                </div>
                                
                                <p className="text-sm whitespace-pre-wrap min-h-[40px]">
                                    {captionForPreview || "Your caption will appear here..."}
                                </p>
                            </CardContent>
                            <CardFooter className="p-0">
                                {selectedProject ? (
                                    <Image src={selectedProject.thumbnail} data-ai-hint={selectedProject.hint} alt={selectedProject.title} width={500} height={400} className="w-full aspect-[4/3] object-cover bg-muted" />
                                ) : (
                                    <div className="w-full aspect-[4/3] bg-muted flex items-center justify-center">
                                        <p className="text-sm text-muted-foreground">Select a project to see preview</p>
                                    </div>
                                )}
                            </CardFooter>
                        </Card>
                        <div className="mt-4">
                            <Label>Posting to:</Label>
                            <div className="flex items-center gap-3 mt-2">
                                {selectedPlatforms.length > 0 ? (
                                    socialPlatforms
                                        .filter(p => selectedPlatforms.includes(p.id))
                                        .map(p => {
                                            const PlatformIcon = p.icon;
                                            return <PlatformIcon key={p.id} className="h-5 w-5 text-muted-foreground" />
                                        })
                                ) : (
                                    <p className="text-sm text-muted-foreground">No platforms selected.</p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

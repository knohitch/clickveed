"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { 
    LayoutDashboard, 
    Settings, 
    Palette, 
    Bot, 
    Cpu, 
    Share2, 
    Database, 
    KeyRound,
    Wand2,
    Sparkles,
    FileText,
    AudioLines,
    MicVocal,
    ImageIcon,
    PenSquare,
    UserSquare,
    BarChart,
    Link as LinkIcon,
    Download,
    ChevronDown,
    Folder,
    Camera,
    Library,
    Image,
    PanelLeft,
    Workflow,
    Lightbulb,
    Target,
    Facebook,
    CalendarClock,
    User,
    MessageCircle,
    Clapperboard,
    Scissors,
    Lock
} from "lucide-react";
import Link from "next/link";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/auth-context";
import { checkFeatureAccess } from "@/lib/feature-access";

const mainLinks = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/dashboard/projects', icon: Folder, label: 'Projects' },
];

const videoSuiteTools = [
    { href: "/dashboard/video-suite", icon: Workflow, label: "All Tools", featureId: "video-suite" },
    { href: "/dashboard/video-pipeline", icon: Workflow, label: "Video Pipeline", featureId: "video-pipeline" },
    { href: "/dashboard/video-editor", icon: Clapperboard, label: "Video Editor", featureId: "video-editor" },
    { href: "/dashboard/video-suite/magic-clips", icon: Scissors, label: "Magic Clips", featureId: "magic-clips" },
    { href: "/dashboard/video-suite/script-generator", icon: FileText, label: "Script Generator", featureId: "script-generator" },
    { href: "/dashboard/video-suite/voice-over", icon: MicVocal, label: "Voice Over", featureId: "voice-over" },
    { href: "/dashboard/video-suite/image-to-video", icon: ImageIcon, label: "Image to Video", featureId: "image-to-video" },
    { href: "/dashboard/video-suite/voice-cloning", icon: MicVocal, label: "Voice Cloning", featureId: "voice-cloning" },
    { href: "/dashboard/video-suite/video-from-url", icon: LinkIcon, label: "Video from URL", featureId: "video-from-url" },
    { href: "/dashboard/video-suite/stock-media-library", icon: Library, label: "Stock Media", featureId: "stock-media" },
    { href: "/dashboard/video-suite/persona-avatar-studio", icon: UserSquare, label: "Persona Studio", featureId: "persona-studio" },
];

const imageEditingTools = [
    { href: "/dashboard/image-editing/ai-image-generator", icon: Wand2, label: "AI Image Generator", featureId: "ai-image-generator" },
    { href: "/dashboard/image-editing/flux-pro", icon: PenSquare, label: "Flux Pro Editor", featureId: "flux-pro" },
    { href: "/dashboard/image-editing/background-remover", icon: Wand2, label: "Background Remover", featureId: "background-remover" },
];

const aiAssistantTools = [
    { href: "/dashboard/ai-assistant", icon: Sparkles, label: "Assistant Home", featureId: "ai-assistant" },
    { href: "/dashboard/ai-assistant/chat", icon: MessageCircle, label: "Creative Assistant", featureId: "creative-assistant" },
    { href: "/dashboard/ai-assistant/topic-researcher", icon: Lightbulb, label: "Topic Researcher", featureId: "topic-researcher" },
    { href: "/dashboard/ai-assistant/thumbnail-tester", icon: Target, label: "Thumbnail Tester", featureId: "thumbnail-tester" },
];

const aiAgents = [
     { href: "/dashboard/ai-agents", icon: Bot, label: "AI Agent Builder", featureId: "ai-agents" },
     { href: "/dashboard/ai-agents/integrations", icon: Cpu, label: "N8n/Make Integrations", featureId: "n8n-integrations" },
]

const socialSuiteLinks = [
    { href: "/dashboard/social-suite/analytics", icon: BarChart, label: "Analytics", featureId: "social-analytics" },
    { href: "/dashboard/social-suite/scheduler", icon: CalendarClock, label: "Scheduler", featureId: "social-scheduler" },
    { href: "/dashboard/social-suite/integrations", icon: Share2, label: "Integrations", featureId: "social-integrations" },
];

const mediaManagement = [
     { href: "/dashboard/media/library", icon: Database, label: "Media Library", featureId: "media-library" },
];

const settingsLinks = [
    { href: "/dashboard/settings", icon: User, label: "Profile & Plan", featureId: "profile-settings" },
    { href: "/dashboard/settings/brand-kit", icon: Palette, label: "Brand Kit", featureId: "brand-kit" },
];

const menuSections = [
    { name: "AI Assistant", icon: Sparkles, items: aiAssistantTools, path: "/dashboard/ai-assistant", featureId: "ai-assistant" },
    { name: "Video Suite", icon: Clapperboard, items: videoSuiteTools, path: "/dashboard/video-suite", featureId: "video-suite" },
    { name: "Image Editing", icon: Image, items: imageEditingTools, path: "/dashboard/image-editing", featureId: "ai-image-generator" },
    { name: "AI Agents", icon: Bot, items: aiAgents, path: "/dashboard/ai-agents", featureId: "ai-agents" },
    { name: "Social Suite", icon: Share2, items: socialSuiteLinks, path: "/dashboard/social-suite", featureId: "social-integrations" },
    { name: "Media Management", icon: Library, items: mediaManagement, path: "/dashboard/media", featureId: "media-library" },
    { name: "Settings", icon: Settings, items: settingsLinks, path: "/dashboard/settings", featureId: "profile-settings" },
];

export function DashboardNav() {
    const pathname = usePathname();
    const { subscriptionPlan } = useAuth();
    const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
        // Initialize all sections as closed
        const initialOpenSections: Record<string, boolean> = {};
        menuSections.forEach(section => {
            initialOpenSections[section.name] = false;
        });
        return initialOpenSections;
    });

    const toggleSection = (name: string) => {
        setOpenSections(prev => {
            const newState = {...prev, [name]: !prev[name]};
            console.log(`Toggling section ${name} to ${newState[name]}`);
            return newState;
        });
    }

    // Filter menu sections based on user's plan
    const filteredMenuSections = menuSections.filter(section => {
        if (!section.featureId) return true; // Always show sections without featureId
        const featureAccess = checkFeatureAccess(subscriptionPlan?.name || null, section.featureId);
        return featureAccess.canAccess;
    }).map(section => ({
        ...section,
        items: section.items.filter(item => {
            if (!item.featureId) return true; // Always show items without featureId
            const featureAccess = checkFeatureAccess(subscriptionPlan?.name || null, item.featureId);
            return featureAccess.canAccess;
        })
    })).filter(section => section.items.length > 0); // Only show sections that have accessible items

    return (
        <div className="flex flex-col gap-2 px-4 py-2">
            <SidebarMenu className="space-y-1">
                {mainLinks.map((item) => (
                    <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                            asChild
                            isActive={pathname === item.href}
                            tooltip={item.label}
                            variant="ghost"
                            className="justify-start gap-3"
                        >
                            <Link href={item.href}>
                                <item.icon className="w-5 h-5 text-sidebar-primary group-data-[active=true]:text-sidebar-primary-foreground" />
                                <span className="text-base font-medium group-data-[collapsible=icon]:hidden">{item.label}</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
            
            <SidebarMenu className="mt-4 space-y-1">
                {filteredMenuSections.map((section) => {
                    const isSectionActive = section.path === '/dashboard/video-suite' 
                        ? pathname.startsWith(section.path) || pathname === '/dashboard/video-pipeline' || pathname === '/dashboard/video-editor'
                        : pathname.startsWith(section.path);

                    return (
                        <Collapsible key={section.name} open={openSections[section.name] || isSectionActive} onOpenChange={(open) => {
            console.log(`Collapsible onOpenChange for ${section.name}: ${open}`);
            if (open !== (openSections[section.name] || isSectionActive)) {
                toggleSection(section.name);
            }
        }}>
                            <SidebarMenuItem>
                                <CollapsibleTrigger asChild>
                                    <SidebarMenuButton
                                        variant="ghost"
                                        className="w-full justify-start gap-3"
                                        isActive={isSectionActive}
                                    >
                                        <section.icon className="w-5 h-5 text-sidebar-primary group-data-[active=true]:text-sidebar-primary-foreground" />
                                        <span className="text-base font-medium group-data-[collapsible=icon]:hidden">{section.name}</span>
                                        <ChevronDown className={cn("ml-auto h-4 w-4 shrink-0 transition-transform duration-200 group-data-[collapsible=icon]:hidden", (openSections[section.name] || isSectionActive) && "rotate-180")} />
                                    </SidebarMenuButton>
                                </CollapsibleTrigger>
                            </SidebarMenuItem>
                            <CollapsibleContent>
                                <SidebarMenuSub>
                                    {section.items.map((item) => {
                                        const isActive = pathname === item.href;
                                        return (
                                            <SidebarMenuSubItem key={`${item.href}-${item.label}`}>
                                                <SidebarMenuSubButton
                                                    asChild
                                                    isActive={isActive}
                                                >
                                                    <Link href={item.href}>
                                                        <item.icon className="w-4 h-4" />
                                                        <span>{item.label}</span>
                                                    </Link>
                                                </SidebarMenuSubButton>
                                            </SidebarMenuSubItem>
                                        );
                                    })}
                                </SidebarMenuSub>
                            </CollapsibleContent>
                        </Collapsible>
                    )
                })}
            </SidebarMenu>
        </div>
    );
}

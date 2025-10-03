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
    Instagram,
    Youtube,
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
    Scissors
} from "lucide-react";
import Link from "next/link";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton } from "@/components/ui/sidebar";

const mainLinks = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/dashboard/projects', icon: Folder, label: 'Projects' },
];

const videoSuiteTools = [
    { href: "/dashboard/video-suite", icon: Workflow, label: "All Tools" },
    { href: "/dashboard/video-pipeline", icon: Workflow, label: "Video Pipeline" },
    { href: "/dashboard/video-editor", icon: Clapperboard, label: "Video Editor" },
    { href: "/dashboard/video-suite/magic-clips", icon: Scissors, label: "Magic Clips" },
    { href: "/dashboard/video-suite/script-generator", icon: FileText, label: "Script Generator" },
    { href: "/dashboard/video-suite/voice-over", icon: MicVocal, label: "Voice Over" },
    { href: "/dashboard/video-suite/image-to-video", icon: ImageIcon, label: "Image to Video" },
    { href: "/dashboard/video-suite/voice-cloning", icon: MicVocal, label: "Voice Cloning" },
    { href: "/dashboard/video-suite/video-from-url", icon: LinkIcon, label: "Video from URL" },
    { href: "/dashboard/video-suite/stock-media-library", icon: Library, label: "Stock Media" },
    { href: "/dashboard/video-suite/persona-avatar-studio", icon: UserSquare, label: "Persona Studio" },
];

const imageEditingTools = [
    { href: "/dashboard/image-editing/ai-image-generator", icon: Wand2, label: "AI Image Generator" },
    { href: "/dashboard/image-editing/flux-pro", icon: PenSquare, label: "Flux Pro Editor" },
    { href: "/dashboard/image-editing/background-remover", icon: Wand2, label: "Background Remover" },
];

const aiAssistantTools = [
    { href: "/dashboard/ai-assistant", icon: Sparkles, label: "Assistant Home" },
    { href: "/dashboard/ai-assistant/chat", icon: MessageCircle, label: "Creative Assistant" },
    { href: "/dashboard/ai-assistant/topic-researcher", icon: Lightbulb, label: "Topic Researcher" },
    { href: "/dashboard/ai-assistant/thumbnail-tester", icon: Target, label: "Thumbnail Tester" },
];

const aiAgents = [
     { href: "/dashboard/ai-agents", icon: Bot, label: "AI Agent Builder" },
     { href: "/dashboard/ai-agents/integrations", icon: Cpu, label: "N8n/Make Integrations" },
]

const socialSuiteLinks = [
    { href: "/dashboard/social-suite/analytics", icon: BarChart, label: "Analytics" },
    { href: "/dashboard/social-suite/scheduler", icon: CalendarClock, label: "Scheduler" },
    { href: "/dashboard/social-suite/integrations", icon: Share2, label: "Integrations" },
];

const mediaManagement = [
     { href: "/dashboard/media/library", icon: Database, label: "Media Library" },
];

const settingsLinks = [
    { href: "/dashboard/settings", icon: User, label: "Profile & Plan" },
    { href: "/dashboard/settings/brand-kit", icon: Palette, label: "Brand Kit" },
];

const menuSections = [
    { name: "AI Assistant", icon: Sparkles, items: aiAssistantTools, path: "/dashboard/ai-assistant" },
    { name: "Video Suite", icon: Clapperboard, items: videoSuiteTools, path: "/dashboard/video-suite" },
    { name: "Image Editing", icon: Image, items: imageEditingTools, path: "/dashboard/image-editing" },
    { name: "AI Agents", icon: Bot, items: aiAgents, path: "/dashboard/ai-agents" },
    { name: "Social Suite", icon: Share2, items: socialSuiteLinks, path: "/dashboard/social-suite" },
    { name: "Media Management", icon: Library, items: mediaManagement, path: "/dashboard/media" },
    { name: "Settings", icon: Settings, items: settingsLinks, path: "/dashboard/settings" },
];

export function DashboardNav() {
    const pathname = usePathname();
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
                {menuSections.map((section) => {
                    const isSectionActive = section.path === '/dashboard/video-suite' 
                        ? pathname.startsWith(section.path) || pathname === '/dashboard/video-pipeline' || pathname === '/dashboard/video-editor'
                        : pathname.startsWith(section.path);

                    return (
                        <Collapsible key={section.name} open={openSections[section.name] || isSectionActive} onOpenChange={() => {
            console.log(`Collapsible onOpenChange for ${section.name}`);
            toggleSection(section.name);
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

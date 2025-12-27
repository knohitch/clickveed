
'use client';

import { useState, useEffect, useRef, useTransition, Suspense } from "react";
import { useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FolderSearch, PlusCircle } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getProjects, createProject } from "@/server/actions/project-actions";
import { Skeleton } from "@/components/ui/skeleton";
import type { Project } from "@/server/actions/project-actions";


type ProjectStatusFilter = "All" | "In Progress" | "Completed" | "Archived";
const filterOptions: ProjectStatusFilter[] = ["All", "In Progress", "Completed", "Archived"];


function ProjectsPageContent() {
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [allProjects, setAllProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<ProjectStatusFilter>("All");
    const [isDialogOpen, setDialogOpen] = useState(false);
    
    const [isPending, startTransition] = useTransition();
    const formRef = useRef<HTMLFormElement>(null);
    
    // Auto-open dialog if directed from dashboard
    useEffect(() => {
        if (searchParams.get('action') === 'create') {
            setDialogOpen(true);
        }
    }, [searchParams]);

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const projects = await getProjects();
            setAllProjects(projects);
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error Fetching Projects",
                description: "Could not load project data. Please try again later.",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    
    const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const title = formData.get('projectTitle') as string;

        if (!title) {
            toast({ variant: "destructive", title: "Title is required" });
            return;
        }

        startTransition(async () => {
            try {
                await createProject(title);
                toast({
                    title: "Project Created!",
                    description: `Your new project "${title}" has been added.`
                });
                formRef.current?.reset();
                setDialogOpen(false);
                fetchProjects(); // Re-fetch projects to update the list
            } catch (e) {
                 const error = e as Error;
                 toast({
                    variant: "destructive",
                    title: "Error Creating Project",
                    description: error.message,
                });
            }
        });
    }

    const getStatusVariant = (status: Project['status']): "secondary" | "default" | "outline" | "destructive" => {
        switch (status) {
            case 'In Progress':
                return 'secondary';
            case 'Completed':
                return 'default';
            case 'Archived':
                return 'outline';
            default:
                return 'secondary';
        }
    }

    const filteredProjects = allProjects.filter(project => {
        if (filter === "All") return true;
        return project.status === filter;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline">My Projects</h1>
                    <p className="text-muted-foreground">
                        Manage all your video projects from one place.
                    </p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            New Project
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Project</DialogTitle>
                            <DialogDescription>
                                Give your new project a name to get started. You can add videos and other assets later.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleFormSubmit} ref={formRef} className="space-y-4">
                             <div className="space-y-2">
                                <Label htmlFor="projectTitle">Project Title</Label>
                                <Input id="projectTitle" name="projectTitle" placeholder="e.g., Q4 Marketing Campaign" required />
                             </div>
                             <DialogFooter>
                                 <Button type="submit" disabled={isPending}>
                                    {isPending ? 'Creating...' : 'Create Project'}
                                </Button>
                             </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="flex items-center gap-2">
                {filterOptions.map(option => (
                     <Button 
                        key={option} 
                        variant={filter === option ? 'default' : 'outline'}
                        onClick={() => setFilter(option)}
                    >
                        {option}
                    </Button>
                ))}
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                 {loading && (
                    Array.from({length:3}).map((_,i) => <Skeleton key={i} className="h-80 w-full" />)
                )}
                {!loading && filteredProjects.map(project => (
                    <Link key={project.id} href="/dashboard/video-editor" className="group">
                        <Card className="overflow-hidden h-full flex flex-col transition-all duration-200 group-hover:border-primary group-hover:shadow-lg">
                            <CardHeader className="p-0">
                               <div className="overflow-hidden">
                                    <Image src={project.thumbnail} alt={project.title} data-ai-hint={project.hint} width={400} height={300} className="object-cover aspect-[4/3] w-full h-full transition-transform duration-300 group-hover:scale-105" />
                               </div>
                            </CardHeader>
                            <CardContent className="p-4 space-y-2 flex-1">
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-xl">{project.title}</CardTitle>
                                    <Badge variant={getStatusVariant(project.status)}>{project.status}</Badge>
                                </div>
                                <CardDescription className="text-foreground/80">Last updated: {project.lastUpdated}</CardDescription>
                            </CardContent>
                            <CardFooter className="p-4">
                                 <Button variant="outline" className="w-full">Open Project</Button>
                            </CardFooter>
                        </Card>
                    </Link>
                ))}
            </div>

            {!loading && filteredProjects.length === 0 && (
                 <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-md col-span-full">
                    <FolderSearch className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No Projects Found</h3>
                    <p className="mt-1 text-sm">There are no projects with the status "{filter}". Try a different filter or create a new project.</p>
                </div>
            )}

        </div>
    );
}

export default function ProjectsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ProjectsPageContent />
        </Suspense>
    );
}

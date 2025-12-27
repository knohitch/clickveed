
'use server';

import { formatDistanceToNow } from 'date-fns';
import prisma from '@/server/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export interface Project {
    id: number;
    title: string;
    lastUpdated: string;
    status: "In Progress" | "Completed" | "Archived";
    thumbnail: string;
    hint: string;
}

/**
 * Retrieves all projects for the current user from the database.
 */
export async function getProjects(): Promise<Project[]> {
    const session = await auth();
    if (!session?.user?.id) return [];

    try {
        const projects = await prisma.project.findMany({
            where: { userId: session.user.id },
            orderBy: { updatedAt: 'desc' },
        });

        return projects.map(p => ({
            id: p.id,
            title: p.title,
            lastUpdated: formatDistanceToNow(p.updatedAt, { addSuffix: true }),
            status: p.status as Project['status'],
            thumbnail: p.thumbnailUrl || "https://placehold.co/400x300.png",
            hint: p.thumbnailHint || "abstract",
        }));
    } catch (error) {
        console.error("Failed to fetch projects:", error);
        return [];
    }
}

/**
 * Creates a new project in the database.
 * @param title The title of the new project.
 */
export async function createProject(title: string): Promise<void> {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("You must be logged in to create a project.");
    }

    try {
        await prisma.project.create({
            data: {
                title,
                userId: session.user.id,
                status: 'In Progress',
                // Default thumbnail values
                thumbnailUrl: "https://placehold.co/400x300.png",
                thumbnailHint: "new project",
            },
        });
        revalidatePath('/dashboard/projects');
    } catch (error) {
        console.error("Failed to create project:", error);
        throw new Error("Database error: Could not create the project.");
    }
}

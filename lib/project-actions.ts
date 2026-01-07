'use server';

import prisma from './prisma';
import { formatDistanceToNow } from 'date-fns';

export interface Project {
    id: string;
    title: string;
    lastUpdated: string;
    status: "In Progress" | "Completed" | "Archived";
    thumbnail: string;
    hint: string;
}

/**
 * Retrieves all projects for the authenticated user from database.
 */
export async function getProjects(userId?: string): Promise<Project[]> {
  if (!userId) return [];

  const projects = await prisma.project.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  });
  
  return projects.map(p => ({
    id: String(p.id),
    title: p.title,
    lastUpdated: formatDistanceToNow(p.updatedAt),
    status: p.status as "In Progress" | "Completed" | "Archived",
    thumbnail: p.thumbnailUrl || 'https://placehold.co/400x300.png',
    hint: p.thumbnailHint?.substring(0, 50) || 'No description'
  }));
}

/**
 * Creates a new project in database.
 * @param title The title of new project.
 * @param userId The user ID creating the project.
 */
export async function createProject(title: string, userId: string): Promise<Project> {
  const newProject = await prisma.project.create({
    data: {
      title,
      status: 'In Progress',
      userId,
      thumbnailUrl: 'https://placehold.co/400x300.png',
    }
  });

  return {
    id: String(newProject.id),
    title: newProject.title,
    lastUpdated: formatDistanceToNow(newProject.updatedAt),
    status: newProject.status as "In Progress" | "Completed" | "Archived",
    thumbnail: newProject.thumbnailUrl || 'https://placehold.co/400x300.png',
    hint: ''
  };
}

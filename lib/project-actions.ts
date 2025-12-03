
'use server';

import { formatDistanceToNow } from 'date-fns';
import prisma from './prisma';

// This file is now empty as project logic will be handled via Prisma directly in the components/actions.
// Keeping it for future project-specific server actions.

export interface Project {
    id: number;
    title: string;
    lastUpdated: string;
    status: "In Progress" | "Completed" | "Archived";
    thumbnail: string;
    hint: string;
}

const mockProjects: Project[] = [
    { id: 1, title: "Summer Ad Campaign", lastUpdated: "2 days ago", status: "In Progress" as const, thumbnail: "https://placehold.co/400x300.png", hint: "summer beach" },
    { id: 2, title: "New Product Launch", lastUpdated: "5 days ago", status: "Completed" as const, thumbnail: "https://placehold.co/400x300.png", hint: "product launch" },
    { id: 3, title: "Social Media Shorts - Q3", lastUpdated: "1 week ago", status: "Archived" as const, thumbnail: "https://placehold.co/400x300.png", hint: "social media" },
    { id: 4, title: "Client Testimonial Video", lastUpdated: "3 days ago", status: "In Progress" as const, thumbnail: "https://placehold.co/400x300.png", hint: "interview" },
    { id: 5, title: "Weekly YouTube Update", lastUpdated: "1 day ago", status: "In Progress" as const, thumbnail: "https://placehold.co/400x300.png", hint: "vlog setup" },
    { id: 6, title: "Onboarding Tutorial", lastUpdated: "2 weeks ago", status: "Completed" as const, thumbnail: "https://placehold.co/400x300.png", hint: "tutorial screencast" },
];

/**
 * Retrieves all projects from the in-memory store.
 */
export async function getProjects(): Promise<Project[]> {
  // Simulate a network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  // Return a deep copy to prevent mutations
  return JSON.parse(JSON.stringify(mockProjects.sort((a, b) => b.id - a.id)));
}

/**
 * Creates a new project in the in-memory store.
 * @param title The title of the new project.
 */
export async function createProject(title: string): Promise<Project> {
  const newProject: Project = {
    id: Date.now(),
    title,
    lastUpdated: "Just now",
    status: "In Progress",
    thumbnail: "https://placehold.co/400x300.png",
    hint: "new project"
  };
  
  mockProjects.unshift(newProject);
  
  // Simulate a network delay
  await new Promise(resolve => setTimeout(resolve, 300));

  return newProject;
}

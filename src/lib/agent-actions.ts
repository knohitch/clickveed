

'use server';

import prisma from './prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { formatDistanceToNow } from 'date-fns';

export interface Agent {
    id: number;
    name: string;
    platform: 'n8n' | 'Make.com';
    trigger: string;
    createdAt: string;
    workflowJson: any;
}

/**
 * Retrieves all agents for the currently authenticated user.
 */
export async function getAgents(): Promise<Agent[]> {
    const session = await auth();
    if (!session?.user?.id) return [];

    const agents = await prisma.agent.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
    });
    
    return agents.map(agent => ({
        ...agent,
        createdAt: formatDistanceToNow(new Date(agent.createdAt), { addSuffix: true }),
        workflowJson: agent.workflowJson, // Already parsed by Prisma
    }));
}

/**
 * Creates a new agent in the database.
 * @param data The agent data to create.
 */
export async function createAgent(data: { name: string, workflowJson: any }): Promise<Agent> {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("You must be logged in to create an agent.");
    }
    
    // Determine platform and trigger from the workflow JSON
    const platform = data.workflowJson.nodes ? 'n8n' : 'Make.com';
    const trigger = 'ClickVid Pro Trigger'; // This would be more dynamic in a real app

    const newAgent = await prisma.agent.create({
        data: {
            name: data.name,
            platform,
            trigger,
            workflowJson: data.workflowJson,
            userId: session.user.id,
        },
    });

    revalidatePath('/dashboard/ai-agents');
    return {
        ...newAgent,
        createdAt: formatDistanceToNow(new Date(newAgent.createdAt), { addSuffix: true }),
        workflowJson: newAgent.workflowJson,
    };
}

/**
 * Deletes an agent from the database.
 * @param agentId The ID of the agent to delete.
 */
export async function deleteAgent(agentId: number): Promise<void> {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("You must be logged in to delete an agent.");
    }

    const agent = await prisma.agent.findUnique({
        where: { id: agentId, userId: session.user.id },
    });

    if (!agent) {
        throw new Error("Agent not found or you do not have permission to delete it.");
    }

    await prisma.agent.delete({
        where: { id: agentId },
    });
    
    revalidatePath('/dashboard/ai-agents');
}

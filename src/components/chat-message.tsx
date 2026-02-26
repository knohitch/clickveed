
'use client';

import { Bot, User } from "lucide-react";
import { cn } from "../lib/utils";
import type { Message } from "../lib/types";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Skeleton } from "./ui/skeleton";

// A simple component for the pulsing cursor
const PulsingCursor = () => (
    <span className="inline-block w-2.5 h-5 bg-primary animate-pulse" />
)

export function ChatMessage({ message }: { message: Message }) {
    const isUserModel = message.role === 'user';
    
    // Handle the "thinking" placeholder
    if ((message.id === 'thinking' || message.id.startsWith('pending-')) && message.role === 'model') {
        return (
            <div className="flex items-start gap-4">
                <Avatar className="w-8 h-8 border">
                    <AvatarFallback><Bot className="w-5 h-5"/></AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2 pt-1">
                    <Skeleton className="h-4 w-8" />
                    <Skeleton className="h-4 w-32" />
                </div>
            </div>
        )
    }

    return (
        <div className={cn(
            "flex items-start gap-4",
            isUserModel && "justify-end"
        )}>
            {!isUserModel && (
                 <Avatar className="w-8 h-8 border">
                    <AvatarFallback><Bot className="w-5 h-5"/></AvatarFallback>
                </Avatar>
            )}
            <div className={cn(
                "max-w-xl rounded-lg px-4 py-3",
                isUserModel ? "bg-primary text-primary-foreground" : "bg-muted"
            )}>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
             {isUserModel && (
                <Avatar className="w-8 h-8 border">
                    <AvatarFallback><User className="w-5 h-5"/></AvatarFallback>
                </Avatar>
            )}
        </div>
    );
}

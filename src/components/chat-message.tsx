
'use client';

import { Bot, User } from "lucide-react";
import { cn } from "../lib/utils";
import type { Message } from "../lib/types";
import { Avatar, AvatarFallback } from "./ui/avatar";

export function ChatMessage({ message }: { message: Message }) {
    const isUserModel = message.role === 'user';
    
    // Handle the "thinking" placeholder
    if ((message.id === 'thinking' || message.id.startsWith('pending-')) && message.role === 'model') {
        return (
            <div className="flex items-start gap-4">
                <Avatar className="w-8 h-8 border">
                    <AvatarFallback><Bot className="w-5 h-5"/></AvatarFallback>
                </Avatar>
                <div className="max-w-xl rounded-lg px-4 py-3 bg-muted">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Assistant is working</span>
                        <span className="inline-flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse [animation-delay:180ms]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse [animation-delay:320ms]" />
                        </span>
                    </div>
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

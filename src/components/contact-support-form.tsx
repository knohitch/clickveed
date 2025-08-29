

'use client';

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { createTicket } from "@/lib/support-actions";

export const ContactSupportForm = ({ user, closeDialog }: { user: any, closeDialog: () => void }) => {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        const formData = new FormData(e.currentTarget);
        const subject = formData.get('subject') as string;
        const initialMessage = formData.get('message') as string;

        try {
            await createTicket({
                userName: user.name || 'User',
                userEmail: user.email || 'No email provided',
                userAvatar: user.image || '',
                subject,
                initialMessage
            });
            toast({ title: "Ticket Submitted", description: "A support agent will get back to you shortly."});
            closeDialog();
        } catch(err) {
             const error = err as Error;
             toast({ variant: 'destructive', title: "Error", description: error.message });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" name="subject" required />
            </div>
            <div className="space-y-1">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" name="message" required rows={5} />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                {isLoading ? 'Submitting...' : 'Submit Ticket'}
            </Button>
        </form>
    )
}

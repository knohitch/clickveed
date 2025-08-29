

'use client';

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createTicket } from "@/server/actions/support-actions";
import { useAuth } from "@/contexts/auth-context";
import { ContactSupportForm } from "@/components/contact-support-form";


export default function SupportPage() {
    const { currentUser } = useAuth();
    
    return (
        <Card>
            <CardHeader>
                 <CardTitle>Contact Support</CardTitle>
                 <CardDescription>Have a question or need help? Submit a support ticket here.</CardDescription>
            </CardHeader>
            <CardContent>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button className="w-full sm:w-auto">
                            <MessageSquare className="mr-2 h-4 w-4"/> Create New Support Ticket
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>New Support Ticket</DialogTitle>
                            <DialogDescription>Describe your issue below and our team will get back to you.</DialogDescription>
                        </DialogHeader>
                        <ContactSupportForm user={currentUser} closeDialog={() => (document.querySelector('[data-radix-dialog-trigger]') as HTMLElement)?.click()} />
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    )
}

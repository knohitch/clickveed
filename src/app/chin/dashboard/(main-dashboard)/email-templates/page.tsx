

'use client';

import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAdminSettings } from "@/contexts/admin-settings-context";
import { useToast } from "@/hooks/use-toast";
import { Save, Mail, Loader2, UserPlus, KeyRound, ShoppingCart, BellRing, Ban, ShieldAlert, BadgeCheck, FileX, MessageSquare, Reply, Ticket } from "lucide-react";
import type { EmailTemplate, EmailTemplates } from '@/contexts/admin-settings-context';
import { Separator } from '@/components/ui/separator';

type TemplateKey = keyof EmailTemplates;

const templateInfo: Record<TemplateKey, { title: string; description: string; icon: React.ElementType, placeholders: string[] }> = {
    userSignup: { 
        title: "Welcome & Verification", 
        icon: UserPlus,
        description: "Sent to new users upon successful signup.",
        placeholders: ["{{name}}", "{{appName}}"]
    },
    passwordReset: { 
        title: "Password Reset", 
        icon: KeyRound,
        description: "Sent when a user requests to reset their password.",
        placeholders: ["{{name}}", "{{resetLink}}"]
    },
    subscriptionActivated: { 
        title: "Subscription Activated", 
        icon: ShoppingCart,
        description: "Sent when a user successfully subscribes to a new plan.",
        placeholders: ["{{name}}", "{{planName}}", "{{amount}}"]
    },
    subscriptionRenewal: { 
        title: "Subscription Renewal Reminder", 
        icon: BellRing,
        description: "Sent to users a few days before their subscription renews.",
        placeholders: ["{{name}}", "{{planName}}", "{{renewalDate}}"]
    },
    subscriptionCanceled: {
        title: "Subscription Canceled",
        icon: Ban,
        description: "Confirmation sent to a user after they cancel their subscription.",
        placeholders: ["{{name}}", "{{planName}}", "{{endDate}}"]
    },
    userNewTicket: {
        title: "Support Ticket Received",
        icon: MessageSquare,
        description: "Sent to a user to confirm their support ticket has been opened.",
        placeholders: ["{{userName}}", "{{ticketId}}", "{{ticketSubject}}"]
    },
    userTicketReply: {
        title: "Reply to your Support Ticket",
        icon: Reply,
        description: "Notifies a user that an agent has replied to their ticket.",
        placeholders: ["{{userName}}", "{{ticketId}}", "{{ticketSubject}}", "{{replyMessage}}"]
    },
    userTicketStatusChange: {
        title: "Support Ticket Status Updated",
        icon: Ticket,
        description: "Informs a user that their ticket's status has changed.",
        placeholders: ["{{userName}}", "{{ticketId}}", "{{ticketSubject}}", "{{newStatus}}"]
    },
    adminNewUser: {
        title: "Admin: New User Signup",
        icon: ShieldAlert,
        description: "Internal notification sent to admins when a new user signs up.",
        placeholders: ["{{userEmail}}", "{{signupDate}}", "{{planName}}"]
    },
    adminSubscriptionRenewed: {
        title: "Admin: Subscription Renewed",
        icon: BadgeCheck,
        description: "Internal notification for a successful subscription renewal.",
        placeholders: ["{{userEmail}}", "{{userName}}", "{{planName}}", "{{amount}}"]
    },
    adminSubscriptionCanceled: {
        title: "Admin: Subscription Canceled",
        icon: FileX,
        description: "Internal notification for a user's subscription cancellation.",
        placeholders: ["{{userEmail}}", "{{userName}}", "{{planName}}", "{{endDate}}"]
    },
    adminNewTicket: {
        title: "Admin: New Support Ticket",
        icon: Ticket,
        description: "Internal notification for a new support ticket.",
        placeholders: ["{{userName}}", "{{userEmail}}", "{{ticketId}}", "{{ticketSubject}}"]
    },
};

const TemplateEditor = ({ templateKey, template, onChange }: { templateKey: TemplateKey, template: EmailTemplate, onChange: (key: TemplateKey, field: 'subject' | 'body', value: string) => void }) => {
    const info = templateInfo[templateKey];

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><info.icon className="h-5 w-5" /> {info.title}</CardTitle>
                <CardDescription>{info.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor={`${templateKey}-subject`}>Subject</Label>
                    <Input 
                        id={`${templateKey}-subject`} 
                        value={template.subject}
                        onChange={(e) => onChange(templateKey, 'subject', e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor={`${templateKey}-body`}>Body (HTML is supported)</Label>
                    <Textarea 
                        id={`${templateKey}-body`}
                        value={template.body}
                        onChange={(e) => onChange(templateKey, 'body', e.target.value)}
                        rows={10}
                        className="font-mono"
                    />
                </div>
                 <div className="space-y-2">
                    <Label>Available Placeholders</Label>
                    <div className="flex flex-wrap gap-2">
                        {info.placeholders.map(p => (
                            <code key={p} className="text-xs bg-muted px-2 py-1 rounded">{p}</code>
                        ))}
                    </div>
                 </div>
            </CardContent>
        </Card>
    )
}

export default function AdminEmailTemplatesPage() {
    const { emailTemplates, setEmailTemplates, loading } = useAdminSettings();
    const { toast } = useToast();
    const [localTemplates, setLocalTemplates] = useState<EmailTemplates>(emailTemplates);

    useEffect(() => {
        setLocalTemplates(emailTemplates);
    }, [emailTemplates]);

    const handleTemplateChange = (key: TemplateKey, field: 'subject' | 'body', value: string) => {
        setLocalTemplates(prev => ({
            ...prev,
            [key]: {
                ...prev[key],
                [field]: value
            }
        }));
    };

    const handleSaveChanges = () => {
        setEmailTemplates(localTemplates);
        toast({ title: "Templates Saved", description: "Your email templates have been updated successfully." });
    };

    if (loading) {
        return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }
    
    return (
        <div className="space-y-8">
             <div>
                <h1 className="text-3xl font-bold font-headline">Email Templates</h1>
                <p className="text-muted-foreground">
                    Customize the transactional emails sent to your users and administrators. Use placeholders for dynamic content.
                </p>
            </div>
            
            <div>
                <CardTitle className="mb-4">User-Facing Emails</CardTitle>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <TemplateEditor templateKey="userSignup" template={localTemplates.userSignup} onChange={handleTemplateChange} />
                    <TemplateEditor templateKey="passwordReset" template={localTemplates.passwordReset} onChange={handleTemplateChange} />
                    <TemplateEditor templateKey="subscriptionActivated" template={localTemplates.subscriptionActivated} onChange={handleTemplateChange} />
                    <TemplateEditor templateKey="subscriptionRenewal" template={localTemplates.subscriptionRenewal} onChange={handleTemplateChange} />
                    <TemplateEditor templateKey="subscriptionCanceled" template={localTemplates.subscriptionCanceled} onChange={handleTemplateChange} />
                     <TemplateEditor templateKey="userNewTicket" template={localTemplates.userNewTicket} onChange={handleTemplateChange} />
                    <TemplateEditor templateKey="userTicketReply" template={localTemplates.userTicketReply} onChange={handleTemplateChange} />
                    <TemplateEditor templateKey="userTicketStatusChange" template={localTemplates.userTicketStatusChange} onChange={handleTemplateChange} />
                </div>
            </div>
            
            <Separator />
            
             <div>
                <CardTitle className="mb-4">Admin Notifications</CardTitle>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <TemplateEditor templateKey="adminNewUser" template={localTemplates.adminNewUser} onChange={handleTemplateChange} />
                    <TemplateEditor templateKey="adminSubscriptionRenewed" template={localTemplates.adminSubscriptionRenewed} onChange={handleTemplateChange} />
                    <TemplateEditor templateKey="adminSubscriptionCanceled" template={localTemplates.adminSubscriptionCanceled} onChange={handleTemplateChange} />
                    <TemplateEditor templateKey="adminNewTicket" template={localTemplates.adminNewTicket} onChange={handleTemplateChange} />
                </div>
            </div>


            <div className="flex justify-end sticky bottom-6 z-10">
                <Button size="lg" onClick={handleSaveChanges}>
                    <Save className="mr-2 h-4 w-4" />
                    Save All Templates
                </Button>
            </div>
        </div>
    );
}

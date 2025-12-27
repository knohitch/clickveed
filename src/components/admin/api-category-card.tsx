
'use client';

import { useAdminSettings } from "@/contexts/admin-settings-context";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import React from "react";

type ApiKeyName = keyof ReturnType<typeof useAdminSettings>['apiKeys'];

export const ApiKeyInput = ({ name, label, value, onChange }: { name: ApiKeyName, label: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) => (
    <div className="space-y-2">
        <Label htmlFor={name}>{label}</Label>
        <Input 
            id={name} 
            name={name}
            type="password" 
            autoComplete="new-password"
            placeholder={`Enter your ${label}`} 
            value={value || ''}
            onChange={onChange}
        />
    </div>
);

export const ApiCategoryCard = ({ title, icon: Icon, children }: { title: string, icon: React.ElementType, children: React.ReactNode }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Icon className="h-5 w-5" /> {title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                 {children}
            </CardContent>
        </Card>
    );
};

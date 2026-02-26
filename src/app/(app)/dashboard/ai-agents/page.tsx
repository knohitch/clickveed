
'use client';

import { useState, useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { generateAutomationWorkflowAction } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Bot, ChevronRight, Copy, Cpu, Sparkles, CheckCircle, AlertCircle, Save, Trash2, UserSearch, FileX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminSettings } from '@/contexts/admin-settings-context';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Agent } from '@/lib/agent-actions';
import { createAgent, getAgents, deleteAgent } from '@/lib/agent-actions';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


type GenerateState = {
  message: string;
  workflow: any;
  errors: {
    prompt?: string[];
    platform?: string[];
    [key: string]: string[] | undefined; // Allow for other potential error keys
  };
};

const generateInitialState: GenerateState = {
  message: '',
  workflow: null,
  errors: { prompt: undefined, platform: undefined },
};

function GenerateButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? <Sparkles className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
      Generate Agent
    </Button>
  );
}

const IntegrationStatus = ({ label, isConfigured }: { label: string, isConfigured: boolean }) => (
    <div className={cn("flex items-center gap-2 text-sm", isConfigured ? "text-green-600" : "text-muted-foreground")}>
        {isConfigured ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
        <span>{label}: <span className="font-semibold">{isConfigured ? "Connected" : "Not Connected"}</span></span>
    </div>
)

export default function AIAgentsPage() {
  const [generateState, formAction] = useFormState(generateAutomationWorkflowAction, generateInitialState);
  const { toast } = useToast();
  const { isN8nConfigured, isMakeConfigured, appName } = useAdminSettings();
  
  const [generatedWorkflow, setGeneratedWorkflow] = useState<any>(null);
  const [agentName, setAgentName] = useState('');
  
  const [savedAgents, setSavedAgents] = useState<Agent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);

  useEffect(() => {
    async function loadAgents() {
        setLoadingAgents(true);
        const agents = await getAgents();
        setSavedAgents(agents);
        setLoadingAgents(false);
    }
    loadAgents();
  }, []);

  useEffect(() => {
    if (generateState.message === 'success' && generateState.workflow) {
      setGeneratedWorkflow(generateState.workflow);
      toast({ title: 'Success', description: 'AI Agent workflow generated successfully.' });
    } else if (generateState.message && generateState.message !== 'success' && generateState.message !== 'Validation failed') {
        toast({
            variant: "destructive",
            title: "Error Generating Agent",
            description: generateState.message,
          });
    }
  }, [generateState, toast]);

  const copyWorkflow = (workflow: any) => {
    if (workflow) {
      navigator.clipboard.writeText(JSON.stringify(workflow, null, 2));
      toast({
        title: "Copied!",
        description: "The workflow JSON has been copied to your clipboard.",
      });
    }
  };
  
  const handleSaveAgent = async () => {
    if (!generatedWorkflow || !agentName.trim()) {
        toast({ variant: 'destructive', title: 'Cannot Save', description: 'Please provide a name for the agent before saving.'});
        return;
    }

    try {
        const newAgent = await createAgent({
            name: agentName,
            workflowJson: generatedWorkflow,
        });
        setSavedAgents(prev => [newAgent, ...prev]);
        setGeneratedWorkflow(null);
        setAgentName('');
        toast({ title: "Agent Saved!", description: `${agentName} has been saved to your Deployed Agents.`});
    } catch(e) {
        const error = e as Error;
        toast({ variant: 'destructive', title: "Error Saving Agent", description: error.message});
    }
  }

  const handleDeleteAgent = async (agentId: number) => {
      // Optimistically update UI
      setSavedAgents(prev => prev.filter(agent => agent.id !== agentId));
      try {
        await deleteAgent(agentId);
        toast({ title: 'Agent Deleted', description: 'The agent has been removed successfully.'});
      } catch (e) {
        const error = e as Error;
        toast({ variant: 'destructive', title: 'Error Deleting Agent', description: error.message });
        // Revert UI if delete fails
        const agents = await getAgents();
        setSavedAgents(agents);
      }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create a New Agent</CardTitle>
          <CardDescription>
            This tool generates a workflow compatible with n8n or Make.com. You can then import it into your platform.
          </CardDescription>
           <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <IntegrationStatus label="n8n" isConfigured={isN8nConfigured} />
                <IntegrationStatus label="Make.com" isConfigured={isMakeConfigured} />
            </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-8">
            <form action={formAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prompt">Describe your workflow</Label>
                <Textarea
                  id="prompt"
                  name="prompt"
                  placeholder={`e.g., When a new video is ready in ${appName}, post it to my Facebook page every Friday at 3 PM.`}
                  rows={5}
                  required
                />
                {/* {generateState.errors?.prompt && <p className="text-sm text-destructive">{generateState.errors.prompt as string}</p>} */}
              </div>
              <div className="space-y-2">
                <Label htmlFor="platform">Target Platform</Label>
                <Select name="platform" defaultValue="n8n" required>
                  <SelectTrigger id="platform">
                    <SelectValue placeholder="Select a platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="n8n">n8n</SelectItem>
                    <SelectItem value="Make.com">Make.com</SelectItem>
                  </SelectContent>
                </Select>
                 {'platform' in generateState.errors && generateState.errors.platform && <p className="text-sm text-destructive">{generateState.errors.platform[0]}</p>}
              </div>
              <GenerateButton />
            </form>
            <div>
              <Label>Generated Workflow</Label>
              <div className="mt-2 rounded-md border bg-muted min-h-[200px] p-4 relative">
                 
                { generatedWorkflow ? (
                  <div className="space-y-4">
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => copyWorkflow(generatedWorkflow)}>
                        <Copy className="h-4 w-4" />
                    </Button>
                    <pre className="text-sm whitespace-pre-wrap font-mono max-h-60 overflow-y-auto">
                        {JSON.stringify(generatedWorkflow, null, 2)}
                    </pre>
                    <div className="flex gap-2">
                         <Input 
                            placeholder="Name your agent before saving..." 
                            value={agentName}
                            onChange={(e) => setAgentName(e.target.value)}
                        />
                        <Button onClick={handleSaveAgent}><Save className="mr-2 h-4 w-4"/>Save</Button>
                    </div>
                  </div>
                ) : (
                    <>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-5/6" />
                   </div>
                  <div className="text-sm text-muted-foreground text-center flex flex-col items-center justify-center h-full">
                    <Sparkles className="h-10 w-10 mb-2" />
                    <p>Your generated agent workflow will appear here.</p>
                  </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
          <CardHeader>
            <CardTitle>Deployed Agents</CardTitle>
            <CardDescription>View and manage your previously created agents.</CardDescription>
          </CardHeader>
          <CardContent>
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Platform</TableHead>
                        <TableHead>Trigger</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loadingAgents ? (
                         Array.from({ length: 3 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                            </TableRow>
                        ))
                    ) : savedAgents.length > 0 ? (
                        savedAgents.map(agent => (
                            <TableRow key={agent.id}>
                                <TableCell className="font-semibold">{agent.name}</TableCell>
                                <TableCell><Badge variant="secondary">{agent.platform}</Badge></TableCell>
                                <TableCell>{agent.trigger}</TableCell>
                                <TableCell>{agent.createdAt}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button variant="outline" size="sm" onClick={() => copyWorkflow(agent.workflowJson)}>
                                        <Copy className="mr-2 h-3 w-3" /> Copy Workflow
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="sm">
                                                <Trash2 className="mr-2 h-3 w-3" /> Delete
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will permanently delete the "{agent.name}" agent. This action cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteAgent(agent.id)} className="bg-destructive hover:bg-destructive/90">
                                                    Yes, Delete Agent
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                         <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                <FileX className="mx-auto h-12 w-12" />
                                You have no saved agents yet.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
          </CardContent>
      </Card>
    </div>
  );
}

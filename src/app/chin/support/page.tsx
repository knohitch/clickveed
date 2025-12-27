'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, Send, CheckCircle, Clock, MessageSquare, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { getTickets, updateTicket } from '@/lib/support-actions';
import type { SupportTicket, Message, TicketStatus } from '@/lib/support-actions';

const getStatusVariant = (status: TicketStatus) => {
  switch (status) {
    case 'Open': return 'destructive';
    case 'Pending': return 'secondary';
    case 'Resolved': return 'default';
    default: return 'outline';
  }
}

export default function ChinSupportPage() {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setLoading(true);
        const fetchedTickets = await getTickets();
        setTickets(fetchedTickets);
        if (fetchedTickets.length > 0) {
          setSelectedTicketId(fetchedTickets[0].id);
        }
      } catch (error) {
        console.error("Failed to fetch tickets:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load support tickets. Please try again.",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, [toast]);

  const selectedTicket = tickets.find(t => t.id === selectedTicketId) || undefined;

  const filteredTickets = tickets.filter(ticket => 
    ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.preview.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const handleStatusChange = async (ticketId: string, newStatus: TicketStatus) => {
    try {
      const updatedTicket = await updateTicket(ticketId, { status: newStatus });
      setTickets(prevTickets =>
        prevTickets.map(t => (t.id === ticketId ? updatedTicket : t))
      );
      toast({ title: "Status Updated", description: `Ticket marked as ${newStatus}.`});
    } catch (error) {
      console.error("Failed to update ticket status:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update ticket status. Please try again.",
      });
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;

    try {
      const newReply: Message = {
        sender: 'agent',
        text: replyText,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      };

      const updatedConversation = [...selectedTicket.conversation, newReply];
      // Ensure selectedTicket.id exists before calling updateTicket
      if (!selectedTicket.id) return;
      
      const updatedTicket = await updateTicket(selectedTicket.id, {
        conversation: updatedConversation,
        preview: replyText,
      });

      setTickets(prev => prev.map(t => (t.id === selectedTicket.id ? updatedTicket : t)));
      setReplyText('');
      toast({ title: 'Reply Sent!', description: 'Your message has been sent to the user.' });
    } catch (error) {
      console.error("Failed to send reply:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send reply. Please try again.",
      });
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className='flex-shrink-0'>
        <h1 className="text-3xl font-bold font-headline">Support Center</h1>
        <p className="text-muted-foreground">
          Manage user support requests.
        </p>
      </div>
      <Card className="mt-6 flex-1 grid lg:grid-cols-12 overflow-hidden">
        <div className="lg:col-span-4 border-r flex flex-col">
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search tickets..." 
                className="pl-10" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {loading ? (
                Array.from({length: 5}).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
              ) : filteredTickets.length > 0 ? (
                filteredTickets.map(ticket => (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={cn(
                      "p-3 rounded-lg cursor-pointer hover:bg-muted",
                      selectedTicket?.id === ticket.id && "bg-muted"
                    )}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={ticket.userAvatar || undefined} />
                          <AvatarFallback>{ticket.userName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="font-semibold">{ticket.userName}</div>
                      </div>
                      <Badge variant={getStatusVariant(ticket.status)}>{ticket.status}</Badge>
                    </div>
                    <h4 className="font-semibold text-sm mt-2">{ticket.subject}</h4>
                    <p className="text-xs text-muted-foreground truncate">{ticket.preview}</p>
                    <p className="text-xs text-muted-foreground mt-2 text-right">{ticket.lastUpdate}</p>
                  </div>
                ))
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-2" />
                  <p className="font-semibold">No tickets found</p>
                  <p className="text-sm">No support tickets match your search or filters.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
        <div className="lg:col-span-8 flex flex-col">
          {selectedTicket ? (
            <>
              <div className="p-4 border-b">
                <CardTitle>{selectedTicket.subject}</CardTitle>
                <div className="flex justify-between items-center">
                  <CardDescription>Conversation with {selectedTicket.userName}</CardDescription>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm"
                      variant={selectedTicket.status === 'Resolved' ? 'default' : 'outline'}
                      onClick={() => selectedTicket.id && handleStatusChange(selectedTicket.id, 'Resolved')}>
                      <CheckCircle className="mr-2 h-4 w-4" /> Mark as Resolved
                    </Button>
                    <Button 
                      size="sm" 
                      variant={selectedTicket.status === 'Pending' ? 'secondary' : 'outline'}
                      onClick={() => selectedTicket.id && handleStatusChange(selectedTicket.id, 'Pending')}>
                      <Clock className="mr-2 h-4 w-4" /> Mark as Pending
                    </Button>
                  </div>
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-6 space-y-6">
                  {selectedTicket.conversation.map((msg, index) => (
                    <div key={index} className={cn("flex items-start gap-4", msg.sender === 'agent' && "justify-end")}>
                      {msg.sender === 'user' && (
                        <Avatar>
                          <AvatarImage src={selectedTicket.userAvatar || undefined} />
                          <AvatarFallback>{selectedTicket.userName.charAt(0)}</AvatarFallback>
                        </Avatar>
                      )}
                      <div className={cn("max-w-lg rounded-lg px-4 py-3", msg.sender === 'user' ? "bg-muted" : "bg-primary text-primary-foreground")}>
                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                        <p className="text-xs text-right mt-2 opacity-70">{msg.timestamp}</p>
                      </div>
                      {msg.sender === 'agent' && (
                        <Avatar>
                          <AvatarFallback>A</AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="p-4 border-t bg-background">
                <div className="relative">
                  <Textarea 
                    placeholder="Type your reply..." 
                    rows={3} 
                    className="pr-12"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleReply();
                      }
                    }}
                  />
                  <Button size="icon" className="absolute right-3 bottom-2" onClick={handleReply} disabled={!replyText.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
              <MessageSquare className="h-12 w-12 mb-4"/>
              <p className="text-lg font-semibold">Select a ticket</p>
              <p className="text-sm">Choose a conversation from the left to view details and respond.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}


'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, MoreVertical, Video, Image as ImageIcon, Music, Download, Link as LinkIcon, Trash2, ArrowUpDown, FolderOpen } from 'lucide-react';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { type MediaAsset as MediaAssetType } from '@/lib/media-actions';
import { useToast } from '@/hooks/use-toast';

type AssetTypeFilter = 'all' | 'IMAGE' | 'VIDEO' | 'AUDIO';

const AssetCard = ({ asset }: { asset: MediaAssetType }) => {
    const { toast } = useToast();
    const TypeIcon = asset.type === 'VIDEO' ? Video : asset.type === 'IMAGE' ? ImageIcon : Music;

    const copyShareLink = () => {
        navigator.clipboard.writeText(asset.url);
        toast({ title: 'Link Copied!', description: 'The public URL has been copied to your clipboard.' });
    };

    return (
        <Card className="overflow-hidden">
            <CardHeader className="p-0 bg-muted aspect-video flex items-center justify-center">
                {asset.type === 'IMAGE' ? (
                    <Image src={asset.url} alt={asset.name} width={400} height={300} className="object-cover aspect-video" />
                ) : (
                    <TypeIcon className="w-16 h-16 text-muted-foreground" />
                )}
            </CardHeader>
            <CardContent className="p-4">
                <div className="flex justify-between items-start">
                    <CardTitle className="text-base truncate leading-tight pr-2">{asset.name}</CardTitle>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                               <a href={asset.url} download><Download className="mr-2 h-4 w-4" />Download</a>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={copyShareLink}>
                                <LinkIcon className="mr-2 h-4 w-4" />Get Share Link
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                    <TypeIcon className="h-4 w-4" />
                    <span>{asset.size.toFixed(2)} MB</span>
                    <span className="text-xs">&bull;</span>
                    <span>{asset.createdAt}</span>
                </div>
            </CardContent>
        </Card>
    );
};

export function MediaLibraryClient({ initialAssets }: { initialAssets: MediaAssetType[] }) {
    const [assets] = useState<MediaAssetType[]>(initialAssets);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<AssetTypeFilter>('all');
    const [sortBy, setSortBy] = useState('date-desc');

    const filteredAssets = assets
        .filter(asset =>
            (filterType === 'all' || asset.type === filterType) &&
            asset.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => {
            if (sortBy === 'date-desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            if (sortBy === 'date-asc') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
            if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
            return 0;
        });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search media..." 
                        className="pl-10" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Select onValueChange={setSortBy} defaultValue="date-desc">
                        <SelectTrigger className="w-full md:w-[180px]">
                             <ArrowUpDown className="mr-2 h-4 w-4" />
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="date-desc">Newest</SelectItem>
                            <SelectItem value="date-asc">Oldest</SelectItem>
                            <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                            <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            
             <div className="flex items-center gap-2">
                <Button variant={filterType === 'all' ? 'default' : 'outline'} onClick={() => setFilterType('all')}>All</Button>
                <Button variant={filterType === 'IMAGE' ? 'default' : 'outline'} onClick={() => setFilterType('IMAGE')}>Images</Button>
                <Button variant={filterType === 'VIDEO' ? 'default' : 'outline'} onClick={() => setFilterType('VIDEO')}>Videos</Button>
                <Button variant={filterType === 'AUDIO' ? 'default' : 'outline'} onClick={() => setFilterType('AUDIO')}>Audio</Button>
            </div>

            {filteredAssets.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredAssets.map(asset => (
                        <AssetCard key={asset.id} asset={asset} />
                    ))}
                </div>
            ) : (
                <Card className="col-span-full">
                    <CardContent className="p-8 text-center text-muted-foreground">
                        <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground" />
                        <p className="mt-4 text-lg font-semibold">Your Media Library is Empty</p>
                        <p>Generate some media using the AI tools to see it here.</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

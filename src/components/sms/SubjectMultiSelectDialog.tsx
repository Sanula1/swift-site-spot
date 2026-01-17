import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { enhancedCachedClient } from "@/api/enhancedCachedClient";
import { CACHE_TTL } from "@/config/cacheTTL";
import { getImageUrl } from "@/utils/imageUrlHelper";
import { Image as ImageIcon, Search } from "lucide-react";

export interface SmsSubjectOption {
  id: string;
  name: string;
  code: string;
  imgUrl?: string | null;
  instituteId?: string | null;
}

interface Props {
  instituteId: string;
  userId?: string;
  role?: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  triggerLabel?: string;
}

export default function SubjectMultiSelectDialog({
  instituteId,
  userId,
  role,
  selectedIds,
  onChange,
  triggerLabel = "Select subjects",
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<SmsSubjectOption[]>([]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const data: any = await enhancedCachedClient.get(
          "/subjects/all",
          {},
          {
            ttl: CACHE_TTL.SUBJECTS,
            forceRefresh: false,
            userId,
            role: role || "User",
            instituteId,
          }
        );

        const arr: any[] = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
        const normalized: SmsSubjectOption[] = arr.map((s: any) => ({
          id: String(s.id),
          name: String(s.name || ""),
          code: String(s.code || ""),
          imgUrl: s.imgUrl ?? s.imageUrl ?? s.image ?? null,
          instituteId: s.instituteId ?? null,
        }));

        // If API returns mixed institutes, keep only current institute when possible.
        const filteredByInstitute = normalized.some((x) => x.instituteId)
          ? normalized.filter((x) => String(x.instituteId) === String(instituteId))
          : normalized;

        if (!cancelled) setItems(filteredByInstitute);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [open, instituteId, userId, role]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q));
  }, [items, search]);

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) onChange(selectedIds.filter((x) => x !== id));
    else onChange([...selectedIds, id]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select subjects</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search subject" />
        </div>

        <ScrollArea className="h-[420px] rounded-md border bg-card">
          <div className="divide-y">
            {loading ? (
              <div className="p-4 text-sm text-muted-foreground">Loading subjects…</div>
            ) : filtered.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">No subjects found.</div>
            ) : (
              filtered.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggle(s.id)}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/60"
                >
                  <Checkbox checked={selectedIds.includes(s.id)} />
                  <div className="h-10 w-10 rounded-md overflow-hidden bg-muted shrink-0">
                    <img
                      src={getImageUrl(s.imgUrl)}
                      alt={s.name ? `Subject ${s.name} image` : "Subject image"}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = "/placeholder.svg";
                      }}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{s.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{s.code}</div>
                  </div>

                  {!s.imgUrl && <ImageIcon className="h-4 w-4 text-muted-foreground" />}
                </button>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Selected: {selectedIds.length}</div>
          <Button type="button" onClick={() => setOpen(false)}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

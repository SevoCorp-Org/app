"use client";

import { createTask } from "@/actions/task.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface Workspace {
  id: string;
  name: string;
}

interface CreateTaskSheetProps {
  workspaces: Workspace[];
}

const PRIORITIES = [
  { value: "LOW",    label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH",   label: "High" },
  { value: "URGENT", label: "Urgent" },
] as const;

export function CreateTaskSheet({ workspaces }: CreateTaskSheetProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [title, setTitle]             = useState("");
  const [description, setDescription] = useState("");
  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.id ?? "");
  const [priority, setPriority]       = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [dueDate, setDueDate]         = useState("");
  const [error, setError]             = useState("");

  function reset() {
    setTitle("");
    setDescription("");
    setWorkspaceId(workspaces[0]?.id ?? "");
    setPriority("MEDIUM");
    setDueDate("");
    setError("");
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    setOpen(next);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    startTransition(async () => {
      const result = await createTask({
        title,
        description: description || undefined,
        workspaceId,
        priority,
        dueDate: dueDate || undefined,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      toast.success("Task created successfully.");
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          New Task
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Create a new task</SheetTitle>
        </SheetHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 pb-6"
        >
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Title <span className="text-red-500">*</span></Label>
            <Input
              id="task-title"
              placeholder="e.g. Design onboarding flow"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={3}
              maxLength={200}
              disabled={isPending}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="task-description">Description</Label>
            <Textarea
              id="task-description"
              placeholder="What needs to be done?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={5000}
              rows={4}
              disabled={isPending}
            />
          </div>

          {/* Workspace */}
          <div className="space-y-1.5">
            <Label htmlFor="task-workspace">Workspace <span className="text-red-500">*</span></Label>
            {workspaces.length === 0 ? (
              <p className="text-sm text-slate-500">
                You need to create a workspace first before adding tasks.
              </p>
            ) : (
              <select
                id="task-workspace"
                value={workspaceId}
                onChange={(e) => setWorkspaceId(e.target.value)}
                required
                disabled={isPending}
                className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm text-slate-900 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {workspaces.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <Label htmlFor="task-priority">Priority</Label>
            <select
              id="task-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as typeof priority)}
              disabled={isPending}
              className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm text-slate-900 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Due date */}
          <div className="space-y-1.5">
            <Label htmlFor="task-due-date">Due date <span className="text-slate-400 font-normal">(optional)</span></Label>
            <Input
              id="task-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              disabled={isPending}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="mt-auto flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isPending || workspaces.length === 0}
            >
              {isPending ? "Creating…" : "Create task"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

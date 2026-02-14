"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";

interface DeleteEpisodeButtonProps {
  episodeId: string;
  episodeTitle: string;
}

export default function DeleteEpisodeButton({
  episodeId,
  episodeTitle,
}: DeleteEpisodeButtonProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${episodeTitle}"?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("episodes")
        .delete()
        .eq("id", episodeId);

      if (error) throw error;

      router.refresh();
    } catch (err) {
      console.error("Failed to delete episode:", err);
      toast({
        variant: "destructive",
        title: "Deletion failed",
        description: "Failed to delete episode. Please try again.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="rounded-md border border-red-900/30 p-1.5 text-muted-text-3 transition-colors duration-150 hover:border-red-800/50 hover:text-red-400 disabled:opacity-50"
      title="Delete Episode"
    >
      {isDeleting ? (
        <LoadingSpinner size="sm" className="text-red-400" />
      ) : (
        <Trash2 className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

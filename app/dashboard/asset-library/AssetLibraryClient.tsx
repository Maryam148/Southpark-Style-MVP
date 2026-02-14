"use client";

import { useState, useCallback, memo } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabaseClient";
import type { Asset, AssetType } from "@/types";
import { Upload, Trash2, ImageIcon, Users, Mountain, Box } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";

/* ── Cloudinary Widget Types ──────────────────────────── */
interface CloudinaryResult {
  event: string;
  info: {
    public_id: string;
    secure_url: string;
    original_filename: string;
    bytes: number;
    format: string;
  };
}

declare global {
  interface Window {
    cloudinary?: {
      createUploadWidget: (
        options: Record<string, unknown>,
        callback: (error: unknown, result: CloudinaryResult) => void
      ) => { open: () => void };
    };
  }
}

const ASSET_TYPES: { value: AssetType; label: string; icon: typeof Users }[] = [
  { value: "character", label: "Character", icon: Users },
  { value: "background", label: "Background", icon: Mountain },
  { value: "prop", label: "Prop", icon: Box },
];

const TYPE_FILTER_ALL = "all" as const;
type FilterType = AssetType | typeof TYPE_FILTER_ALL;

interface AssetLibraryClientProps {
  initialAssets: Asset[];
  userId: string;
}

/* ── Asset Card ───────────────────────────────────────── */
const AssetCard = memo(function AssetCard({
  asset,
  deleting,
  onDelete,
}: {
  asset: Asset;
  deleting: boolean;
  onDelete: (asset: Asset) => void;
}) {
  const typeInfo = ASSET_TYPES.find((t) => t.value === asset.asset_type);
  return (
    <div className="group relative overflow-hidden rounded-lg border border-sk-border bg-surface-1 transition-colors duration-150 hover:border-sk-border-hover">
      <div className="relative aspect-square bg-surface-2">
        <Image
          src={asset.url}
          alt={asset.name}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
        <button
          onClick={() => onDelete(asset)}
          disabled={deleting}
          className="absolute right-2 top-2 rounded-md bg-red-600/80 p-1.5 text-white opacity-0 transition-opacity duration-150 hover:bg-red-500 group-hover:opacity-100 disabled:opacity-50"
          title="Delete asset"
        >
          {deleting ? (
            <LoadingSpinner size="sm" className="text-white" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </button>
        <span className="absolute bottom-2 left-2 rounded-full bg-surface-0/80 px-2.5 py-0.5 text-[10px] font-medium text-muted-text-1 backdrop-blur-sm">
          {typeInfo?.label || asset.asset_type}
        </span>
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-medium text-white">{asset.name}</p>
        <p className="text-xs text-muted-text-3">
          {asset.size_bytes
            ? `${(asset.size_bytes / 1024).toFixed(1)} KB`
            : "—"}
        </p>
      </div>
    </div>
  );
});

export default function AssetLibraryClient({
  initialAssets,
  userId,
}: AssetLibraryClientProps) {
  const { toast } = useToast();
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [uploadType, setUploadType] = useState<AssetType>("character");
  const [filterType, setFilterType] = useState<FilterType>(TYPE_FILTER_ALL);
  const [assetName, setAssetName] = useState("");
  const [showUploadPanel, setShowUploadPanel] = useState(false);

  const supabase = createClient();

  const fetchAssets = useCallback(async () => {
    const { data } = await supabase
      .from("assets")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(0, 49);
    setAssets((data as Asset[]) || []);
  }, [supabase, userId]);

  const openCloudinaryWidget = () => {
    if (!assetName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter an asset name before uploading.",
      });
      return;
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    if (!cloudName) {
      toast({
        variant: "destructive",
        title: "Configuration error",
        description: "Cloudinary cloud name is not configured.",
      });
      return;
    }

    const widget = window.cloudinary?.createUploadWidget(
      {
        cloudName,
        uploadPreset: "skunkstudio_unsigned",
        folder: `skunkstudio/${userId}`,
        sources: ["local", "url", "camera"],
        multiple: false,
        maxFiles: 1,
        clientAllowedFormats: ["png", "jpg", "jpeg", "webp"],
        maxFileSize: 10 * 1024 * 1024,
        cropping: false,
      },
      async (error: unknown, result: CloudinaryResult) => {
        if (error) {
          console.error("Upload error:", error);
          return;
        }
        if (result.event === "success") {
          const info = result.info;
          const { error: insertError } = await supabase.from("assets").insert({
            user_id: userId,
            name: assetName.trim(),
            asset_type: uploadType,
            cloudinary_id: info.public_id,
            url: info.secure_url,
            size_bytes: info.bytes,
            metadata: { format: info.format },
          });

          if (insertError) {
            console.error("Failed to save asset:", insertError);
            toast({
              variant: "destructive",
              title: "Save failed",
              description: "Upload succeeded but failed to save to database.",
            });
          } else {
            setAssetName("");
            setShowUploadPanel(false);
            fetchAssets();
          }
        }
      }
    );

    widget?.open();
  };

  const handleDelete = async (asset: Asset) => {
    if (!confirm(`Delete "${asset.name}"? This cannot be undone.`)) return;
    setDeleting(asset.id);

    const res = await fetch("/api/assets/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assetId: asset.id,
        cloudinaryId: asset.cloudinary_id,
      }),
    });

    setDeleting(null);
    if (res.ok) {
      setAssets((prev) => prev.filter((a) => a.id !== asset.id));
    } else {
      toast({
        variant: "destructive",
        title: "Deletion failed",
        description: "Failed to delete asset.",
      });
    }
  };

  const filteredAssets =
    filterType === TYPE_FILTER_ALL
      ? assets
      : assets.filter((a) => a.asset_type === filterType);

  return (
    <div className="space-y-6">
      <script
        src="https://upload-widget.cloudinary.com/global/all.js"
        async
      />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Asset Library</h1>
          <p className="mt-1 text-sm text-muted-text-1">
            Characters, backgrounds, and props for your episodes.
          </p>
        </div>
        <button
          onClick={() => setShowUploadPanel(!showUploadPanel)}
          className="inline-flex items-center gap-2 rounded-md bg-violet-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-violet-hover"
        >
          {showUploadPanel ? (
            "Close"
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Upload Asset
            </>
          )}
        </button>
      </div>

      {/* Upload Panel */}
      {showUploadPanel && (
        <div className="rounded-lg border border-violet-primary/30 bg-violet-primary/5 p-6">
          <h2 className="text-sm font-semibold text-white">Upload New Asset</h2>
          <p className="mt-1 text-xs text-muted-text-2">
            Name assets to match script references (e.g.{" "}
            <code className="rounded bg-surface-3 px-1.5 py-0.5 text-violet-primary">
              jax_body
            </code>
            ,{" "}
            <code className="rounded bg-surface-3 px-1.5 py-0.5 text-violet-primary">
              jax_head
            </code>
            ).
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted-text-1">
                Asset Name
              </label>
              <input
                type="text"
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                placeholder="jax_body"
                className="w-full rounded-md border border-sk-border bg-surface-2 px-3 py-2 text-sm text-white placeholder-muted-text-3 outline-none transition-colors duration-150 focus:border-violet-primary focus:ring-1 focus:ring-violet-primary/50"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted-text-1">
                Type
              </label>
              <select
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value as AssetType)}
                className="w-full rounded-md border border-sk-border bg-surface-2 px-3 py-2 text-sm text-white outline-none transition-colors duration-150 focus:border-violet-primary focus:ring-1 focus:ring-violet-primary/50"
              >
                {ASSET_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={openCloudinaryWidget}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-sk-border-hover bg-surface-2 px-4 py-2 text-sm font-semibold text-muted-text-1 transition-colors duration-150 hover:border-violet-primary hover:text-violet-primary"
              >
                <Upload className="h-4 w-4" />
                Choose File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        <button
          onClick={() => setFilterType(TYPE_FILTER_ALL)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${filterType === TYPE_FILTER_ALL
              ? "bg-violet-primary text-white"
              : "bg-surface-2 text-muted-text-2 hover:text-white"
            }`}
        >
          All ({assets.length})
        </button>
        {ASSET_TYPES.map((t) => {
          const count = assets.filter((a) => a.asset_type === t.value).length;
          const Icon = t.icon;
          return (
            <button
              key={t.value}
              onClick={() => setFilterType(t.value)}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${filterType === t.value
                  ? "bg-violet-primary text-white"
                  : "bg-surface-2 text-muted-text-2 hover:text-white"
                }`}
            >
              <Icon className="h-3 w-3" />
              {t.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Asset Grid */}
      {filteredAssets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-sk-border py-20 text-center">
          <ImageIcon className="h-10 w-10 text-muted-text-3" />
          <h3 className="mt-4 text-sm font-semibold text-muted-text-1">
            {filterType === TYPE_FILTER_ALL
              ? "No assets yet"
              : `No ${filterType} assets`}
          </h3>
          <p className="mt-1 text-xs text-muted-text-3">
            Upload characters, backgrounds, and props to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredAssets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              deleting={deleting === asset.id}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

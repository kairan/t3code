import { mediaFileReference } from "@t3tools/client-runtime/media-reference";
import type { EnvironmentId, ScopedThreadRef } from "@t3tools/contracts";
import { resolvePathLinkTarget } from "@t3tools/shared/fileLinks";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useRef } from "react";

import { Button } from "~/components/ui/button";
import type { ExpandedImagePreview } from "~/components/chat/ExpandedImagePreview";
import { fileFolderListing, folderImages } from "./filePath";
import { workspaceAssetResource } from "./filePreviewMode";
import { ImageGalleryContext } from "./imageGallery";
import { useProjectEntriesQuery } from "./projectFilesQueryState";

function scrollsHorizontally(from: Node, boundary: HTMLElement): boolean {
  for (
    let node = from instanceof HTMLElement ? from : from.parentElement;
    node && node !== boundary;
    node = node.parentElement
  ) {
    if (node.scrollWidth > node.clientWidth) return true;
  }
  return false;
}

export function ImageSiblingNavigation(props: {
  readonly environmentId: EnvironmentId;
  readonly threadRef: ScopedThreadRef;
  readonly draft: boolean;
  readonly cwd: string;
  readonly path: string;
  readonly workspaceMutationId: string | null;
  readonly onNavigate: (path: string) => void;
  readonly children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const listing = fileFolderListing(props.cwd, props.path);
  const entries = useProjectEntriesQuery(
    props.environmentId,
    listing.cwd,
    listing.directoryPath,
    props.workspaceMutationId,
  );
  const folder = entries.data
    ? folderImages(entries.data.entries, listing.directoryPath, listing.name)
    : null;
  const pathAt = (offset: number) => {
    if (!folder) return null;
    const { images, index } = folder;
    return listing.openPath(images[(index + offset + images.length) % images.length]!.path);
  };
  const previous = pathAt(-1);
  const next = pathAt(1);

  const gallery = folder
    ? (): ExpandedImagePreview => ({
        index: folder.index,
        images: folder.images.map((image) => {
          const absolutePath = resolvePathLinkTarget(listing.openPath(image.path), props.cwd);
          const resource = workspaceAssetResource({
            kind: "workspace-file",
            threadRef: props.threadRef,
            draft: props.draft,
            workspaceRoot: props.cwd,
            absolutePath,
          });
          return {
            src: null,
            name: image.label,
            ...(props.workspaceMutationId ? { assetRevision: props.workspaceMutationId } : {}),
            actionsSource: {
              kind: "image" as const,
              name: image.label,
              src: null,
              reference: mediaFileReference(absolutePath, props.cwd),
              asset: { environmentId: props.environmentId, resource },
            },
          };
        }),
      })
    : null;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (previous === null || next === null || event.defaultPrevented) return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    // React bubbles keys from portals such as the full-size viewer; only this frame's own DOM navigates.
    const target = event.target as Node;
    if (!event.currentTarget.contains(target)) return;
    // A zoomed image keeps arrow keys for panning.
    if (scrollsHorizontally(target, event.currentTarget)) return;
    event.preventDefault();
    // The focused image remounts with the next path, so keep focus on this stable frame.
    ref.current?.focus({ preventScroll: true });
    props.onNavigate(event.key === "ArrowLeft" ? previous : next);
  };

  return (
    <div
      ref={ref}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden outline-none"
    >
      <ImageGalleryContext value={gallery}>{props.children}</ImageGalleryContext>
      {folder && previous !== null && next !== null ? (
        <>
          <div className="absolute top-1/2 left-2 z-10 -translate-y-1/2">
            <Button
              variant="glass"
              size="icon-sm"
              aria-label="Previous image"
              onClick={() => props.onNavigate(previous)}
            >
              <ChevronLeftIcon />
            </Button>
          </div>
          <div className="absolute top-1/2 right-2 z-10 -translate-y-1/2">
            <Button
              variant="glass"
              size="icon-sm"
              aria-label="Next image"
              onClick={() => props.onNavigate(next)}
            >
              <ChevronRightIcon />
            </Button>
          </div>
          <div
            aria-live="polite"
            className="pointer-events-none absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full bg-background/80 px-2 py-0.5 text-2xs text-muted-foreground tabular-nums shadow-sm"
          >
            {folder.index + 1} / {folder.images.length}
          </div>
        </>
      ) : null}
    </div>
  );
}

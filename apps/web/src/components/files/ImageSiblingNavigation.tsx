import { mediaFileReference } from "@t3tools/client-runtime/media-reference";
import type { EnvironmentId, ScopedThreadRef } from "@t3tools/contracts";
import { resolvePathLinkTarget } from "@t3tools/shared/fileLinks";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useRef } from "react";

import { Button } from "~/components/ui/button";
import type { ExpandedImagePreview } from "~/components/chat/ExpandedImagePreview";
import { adjacentImages, fileBreadcrumbs, fileFolderListing } from "./filePath";
import { workspaceAssetResource } from "./filePreviewMode";
import { ImageGalleryContext } from "./imageGallery";
import { useProjectEntriesQuery } from "./projectFilesQueryState";

function scrollsHorizontally(from: EventTarget, boundary: HTMLElement): boolean {
  for (
    let node = from as HTMLElement | null;
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
  const siblings = entries.data
    ? adjacentImages(entries.data.entries, listing.directoryPath, listing.name)
    : null;

  const gallery: ExpandedImagePreview | null = siblings && {
    index: siblings.position - 1,
    images: siblings.paths.map((entryPath) => {
      const absolutePath = resolvePathLinkTarget(listing.openPath(entryPath), props.cwd);
      const reference = mediaFileReference(absolutePath, props.cwd);
      const name = fileBreadcrumbs("", entryPath).at(-1)?.label ?? entryPath;
      const resource = workspaceAssetResource({
        kind: reference.relativePath !== undefined ? "workspace-file" : "media-file",
        threadRef: props.threadRef,
        draft: props.draft,
        workspaceRoot: props.cwd,
        absolutePath,
      });
      return {
        src: null,
        name,
        actionsSource: {
          kind: "image" as const,
          name,
          src: null,
          reference,
          asset: { environmentId: props.environmentId, resource },
        },
      };
    }),
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!siblings || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    // A zoomed image keeps arrow keys for panning.
    if (scrollsHorizontally(event.target, event.currentTarget)) return;
    event.preventDefault();
    // The focused image remounts with the next path, so keep focus on this stable frame.
    ref.current?.focus({ preventScroll: true });
    props.onNavigate(
      listing.openPath(event.key === "ArrowLeft" ? siblings.previous : siblings.next),
    );
  };

  return (
    <div
      ref={ref}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden outline-none"
    >
      <ImageGalleryContext value={gallery}>{props.children}</ImageGalleryContext>
      {siblings ? (
        <>
          <div className="absolute top-1/2 left-2 z-10 -translate-y-1/2">
            <Button
              variant="glass"
              size="icon-sm"
              aria-label="Previous image"
              onClick={() => props.onNavigate(listing.openPath(siblings.previous))}
            >
              <ChevronLeftIcon />
            </Button>
          </div>
          <div className="absolute top-1/2 right-2 z-10 -translate-y-1/2">
            <Button
              variant="glass"
              size="icon-sm"
              aria-label="Next image"
              onClick={() => props.onNavigate(listing.openPath(siblings.next))}
            >
              <ChevronRightIcon />
            </Button>
          </div>
          <div
            aria-live="polite"
            className="pointer-events-none absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full bg-background/80 px-2 py-0.5 text-2xs text-muted-foreground tabular-nums shadow-sm"
          >
            {siblings.position} / {siblings.count}
          </div>
        </>
      ) : null}
    </div>
  );
}

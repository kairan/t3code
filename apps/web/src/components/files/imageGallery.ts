import { createContext } from "react";

import type { ExpandedImagePreview } from "~/components/chat/ExpandedImagePreview";

/** The open image's folder, so the full-size viewer can step through it. */
export const ImageGalleryContext = createContext<ExpandedImagePreview | null>(null);

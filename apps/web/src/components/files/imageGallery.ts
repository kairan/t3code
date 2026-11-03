import { createContext } from "react";

import type { ExpandedImagePreview } from "~/components/chat/ExpandedImagePreview";

/** Builds the open image's folder as a gallery, only once the full-size viewer opens. */
export const ImageGalleryContext = createContext<(() => ExpandedImagePreview) | null>(null);

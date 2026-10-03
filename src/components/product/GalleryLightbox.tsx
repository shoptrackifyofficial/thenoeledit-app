"use client";

import { useRef } from "react";
import Lightbox, { type Slide } from "yet-another-react-lightbox";
import Counter from "yet-another-react-lightbox/plugins/counter";
import Video from "yet-another-react-lightbox/plugins/video";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/counter.css";

/** Split out so the lightbox's JS and CSS load only when a shopper opens zoom. */
export default function GalleryLightbox({
  slides,
  index,
  onClose,
}: {
  slides: Slide[];
  index: number;
  onClose: (index: number) => void;
}) {
  const current = useRef(index);
  return (
    <Lightbox
      open
      index={index}
      slides={slides}
      plugins={[Zoom, Video, Counter]}
      zoom={{ maxZoomPixelRatio: 3, scrollToZoom: true }}
      on={{ view: ({ index: viewed }) => (current.current = viewed) }}
      close={() => onClose(current.current)}
      controller={{ closeOnBackdropClick: true }}
      styles={{ container: { backgroundColor: "rgb(7 20 14 / 0.96)" } }}
    />
  );
}

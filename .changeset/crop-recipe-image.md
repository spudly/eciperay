---
'@eciperay/app': patch
'@eciperay/web': patch
---

Recipe image upload now offers optional cropping before the image is saved
(#406): after choosing or taking a photo, the pending recipe image can be
cropped with a draggable/resizable crop box (defaulting to the 4:3 recipe
display ratio), used as-is, or discarded. Confirming the crop replaces the
pending image with the cropped result before the existing upload path runs;
cancelling or skipping passes the original photo through unchanged. Cropping
applies only to the pending recipe image — meal photos and photo import are
untouched, and no upload API or schema changed.

---
'@eciperay/app': patch
'@eciperay/web': patch
---

Recipe image upload now offers **Take photo** beside the existing browse/choose
controls (#405): in the app it opens the camera after the existing
camera-permission flow, and on web it uses a camera-capture file input, so a
photo can be snapped in place instead of leaving for the camera app first.
Captured photos flow through the same upload and preview path as picked images.

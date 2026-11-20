# 3D model attribution

These models are served locally from this directory so the landing page does not depend on a third-party CDN at runtime.

## Airliner — `airliner.glb`

- Source: [amvlab aircraft models](https://github.com/amvlab/aircraft-models), file `models/A350_nologo.glb`
- Author/copyright: © 2026 amvlab
- Licence: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- Changes: renamed to `airliner.glb`; no geometry or texture changes.

## Ship — `ship.glb`

- Source: [worldhood](https://github.com/worldhood/worldhood), file `public/models/boats/amphion.glb`
- Original model: “Swedish royal schooner yacht Amphion” by Museovirasto (Finnish Heritage Agency), CC BY 4.0, <https://sketchfab.com/3d-models/751174e48b764e829410cd323144833c>
- The worldhood copy is simplified and recoloured and is distributed under CC BY 4.0 per the project [NOTICE.md](https://github.com/worldhood/worldhood/blob/main/NOTICE.md).
- Licence: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- Changes: renamed to `ship.glb`; no geometry or texture changes.

## Car — `sports-car.glb`

- Source: [Khronos glTF Sample Assets](https://github.com/KhronosGroup/glTF-Sample-Assets), file `Models/CarConcept/glTF-Binary/CarConcept.glb`
- Copyright: © 2024 Darmstadt Graphics Group GmbH; model and textures by Eric Chadwick. Based on the public-domain CC0 model “Free Concept Car 004” by Unity Fan.
- Licence: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- Changes: optimised with glTF Transform — geometry simplified, meshes joined/deduplicated, textures resized to 1024 px and encoded as WebP. Geometry compression was not used, so no additional decoder is required at runtime.

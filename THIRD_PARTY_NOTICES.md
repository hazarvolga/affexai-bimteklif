# Third-party notices

The application includes the following pinned, self-hosted browser dependencies for the optional IFC review view. They are loaded lazily and are not used as a quantity takeoff source.

## web-ifc 0.0.78

- Project: That Open Company / web-ifc
- License: Mozilla Public License 2.0
- Source: https://github.com/ThatOpen/engine_web-ifc
- Local license text: `node_modules/web-ifc/LICENSE.md`
- Distributed asset: `web-ifc.wasm`, emitted by Vite from the pinned package.

## three 0.186.1

- Project: three.js
- License: MIT
- Source: https://github.com/mrdoob/three.js
- Local license text: `node_modules/three/LICENSE`

## @types/three 0.186.0

- Project: DefinitelyTyped / three
- License: MIT
- Source: https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/three

## veraPDF 1.30.3 (IFC/PDF worker image)

- Project: veraPDF Consortium / veraPDF greenfield CLI
- License: dual GPL-3.0-or-later / MPL-2.0-or-later (recipient's choice; BIMMetraj relies on MPL-2.0)
- Source: https://github.com/veraPDF/veraPDF-apps, https://github.com/veraPDF/veraPDF-library
- Installer: https://software.verapdf.org/releases/1.30/verapdf-greenfield-1.30.3-installer.zip
  (SHA-256 `b512bf24945503a33fc10738ecffc1f2dccaaf8593a448e94ee9ac86a9559a59`)
- Use: unmodified, executed as a separate process for PDF/A validation only. No conversion or metadata fixing.
- Runtime: Debian `openjdk-17-jre-headless` (GPL-2.0 with Classpath Exception).

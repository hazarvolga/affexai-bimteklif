import * as THREE from "three";
import { IfcAPI } from "web-ifc";
import wasmUrl from "web-ifc/web-ifc.wasm?url";
import {
  IFC_VIEWER_MAX_MEMORY_BYTES,
  assertGeometryBudget,
  buildViewerIdentityIndex,
  computeFitCameraDistance,
  computePanDelta,
  computeSectionCutConstant,
  getCameraPresetAngles,
  type IfcCameraPreset,
  type IfcSectionAxis,
} from "./model";
import type { IfcSourceIdentity } from "../types";

export type IfcViewerInteractionMode = "orbit" | "pan";

export interface IfcViewerController {
  selectElement(elementKey: string | null): void;
  focusElement(elementKey: string | null): void;
  hideElement(elementKey: string): void;
  showAll(): void;
  isolateElement(elementKey: string): void;
  resetView(): void;
  fitToModel(): void;
  setCameraPreset(preset: IfcCameraPreset): void;
  zoomByFactor(factor: number): void;
  panByPixels(dx: number, dy: number): void;
  setInteractionMode(mode: IfcViewerInteractionMode): void;
  /** y: floor section (horizontal cut); x and z: vertical sections from the side and from the front. */
  setSectionCut(axis: IfcSectionAxis, percent: number): void;
  setWireframe(enabled: boolean): void;
  dispose(): void;
}

type SelectionListener = (identity: IfcSourceIdentity | null) => void;

function disposeIfcRuntime(api: IfcAPI, modelId: number | null, renderer: THREE.WebGLRenderer | null) {
  if (modelId !== null) {
    try { api.CloseModel(modelId); } catch { /* best-effort staged cleanup */ }
  }
  try { api.Dispose(); } catch { /* Init may have failed before WASM existed */ }
  try { renderer?.dispose(); } catch { /* WebGL context creation may be partial */ }
}

async function initializeIfcRuntime(bytes: Uint8Array) {
  const api = new IfcAPI();
  let modelId: number | null = null;
  let renderer: THREE.WebGLRenderer | null = null;
  try {
    // Vite emits a content-hashed WASM filename. Force single-thread mode and
    // map web-ifc's requested wasm path to that exact self-hosted asset URL.
    await api.Init(path => path.endsWith(".wasm") ? wasmUrl : path, true);
    modelId = api.OpenModel(bytes, {
      COORDINATE_TO_ORIGIN: true,
      MEMORY_LIMIT: IFC_VIEWER_MAX_MEMORY_BYTES,
      CIRCLE_SEGMENTS: 12,
    });
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    return { api, modelId, renderer };
  } catch (error) {
    disposeIfcRuntime(api, modelId, renderer);
    throw error;
  }
}

export async function createIfcViewer(
  container: HTMLElement,
  bytes: Uint8Array,
  identities: readonly IfcSourceIdentity[],
  onSelection: SelectionListener,
): Promise<IfcViewerController> {
  const { api, modelId, renderer } = await initializeIfcRuntime(bytes);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x0b1220, 1);
  renderer.localClippingEnabled = true;
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.display = "block";
  renderer.domElement.style.touchAction = "none";
  container.replaceChildren(renderer.domElement);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x334155, 2.2));
  const directional = new THREE.DirectionalLight(0xffffff, 2.6);
  directional.position.set(12, 18, 10);
  scene.add(directional);
  const fillLight = new THREE.DirectionalLight(0x94a3b8, 1.4);
  fillLight.position.set(-14, 12, -12);
  scene.add(fillLight);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 100_000);
  const modelRoot = new THREE.Group();
  scene.add(modelRoot);
  // A plane keeps what is on its negative side of the normal: a cut at constant c keeps points below c on that axis.
  const sectionPlanes: Record<IfcSectionAxis, THREE.Plane> = {
    y: new THREE.Plane(new THREE.Vector3(0, -1, 0), 10_000),
    x: new THREE.Plane(new THREE.Vector3(-1, 0, 0), 10_000),
    z: new THREE.Plane(new THREE.Vector3(0, 0, -1), 10_000),
  };
  const byExpressId = new Map<number, THREE.Object3D[]>();
  const identityIndex = buildViewerIdentityIndex(identities);
  let geometryBudget = { allocatedBytes: 0, triangleCount: 0, meshCount: 0 };

  try {
  api.StreamAllMeshes(modelId, flatMesh => {
    const objects: THREE.Object3D[] = [];
    for (let i = 0; i < flatMesh.geometries.size(); i += 1) {
      const placed = flatMesh.geometries.get(i);
      const ifcGeometry = api.GetGeometry(modelId, placed.geometryExpressID);
      const vertexData = api.GetVertexArray(ifcGeometry.GetVertexData(), ifcGeometry.GetVertexDataSize());
      const indexData = api.GetIndexArray(ifcGeometry.GetIndexData(), ifcGeometry.GetIndexDataSize());
      try {
        geometryBudget = assertGeometryBudget({
          ...geometryBudget,
          nextVertexBytes: vertexData.byteLength,
          nextIndexBytes: indexData.byteLength,
        });
      } catch (error) {
        ifcGeometry.delete();
        throw error;
      }
      const positions = new Float32Array((vertexData.length / 6) * 3);
      const normals = new Float32Array((vertexData.length / 6) * 3);
      for (let source = 0, target = 0; source < vertexData.length; source += 6, target += 3) {
        positions.set(vertexData.subarray(source, source + 3), target);
        normals.set(vertexData.subarray(source + 3, source + 6), target);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
      geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indexData), 1));
      const color = new THREE.Color(placed.color.x, placed.color.y, placed.color.z);
      const material = new THREE.MeshStandardMaterial({
        color,
        transparent: placed.color.w < 1,
        opacity: placed.color.w,
        side: THREE.DoubleSide,
        clippingPlanes: Object.values(sectionPlanes),
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.applyMatrix4(new THREE.Matrix4().fromArray(placed.flatTransformation));
      mesh.userData.expressId = flatMesh.expressID;
      modelRoot.add(mesh);
      objects.push(mesh);
      ifcGeometry.delete();
    }
    byExpressId.set(flatMesh.expressID, objects);
  });
  } catch (error) {
    modelRoot.traverse(object => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => material.dispose());
      }
    });
    disposeIfcRuntime(api, modelId, renderer);
    container.replaceChildren();
    throw error;
  }

  const box = new THREE.Box3().setFromObject(modelRoot);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const initialTarget = sphere.center.clone();
  const target = initialTarget.clone();
  const sectionBounds: Record<IfcSectionAxis, [number, number]> = {
    y: [Number.isFinite(box.min.y) ? box.min.y : -1, Number.isFinite(box.max.y) ? box.max.y : 10],
    x: [Number.isFinite(box.min.x) ? box.min.x : -10, Number.isFinite(box.max.x) ? box.max.x : 10],
    z: [Number.isFinite(box.min.z) ? box.min.z : -10, Number.isFinite(box.max.z) ? box.max.z : 10],
  };
  const setSectionCut = (axis: IfcSectionAxis, percent: number) => {
    sectionPlanes[axis].constant = computeSectionCutConstant(sectionBounds[axis][0], sectionBounds[axis][1], percent);
  };
  const resetSections = () => (["y", "x", "z"] as const).forEach(axis => setSectionCut(axis, 100));
  const isInsideSections = (point: THREE.Vector3) =>
    point.y <= sectionPlanes.y.constant && point.x <= sectionPlanes.x.constant && point.z <= sectionPlanes.z.constant;
  resetSections();
  const radius = Math.max(sphere.radius, 1);
  let azimuth = Math.PI / 4;
  let elevation = Math.PI / 5;
  let distance = computeFitCameraDistance(
    radius,
    camera.fov,
    Math.max(container.clientWidth, 1) / Math.max(container.clientHeight, 1),
  );
  let hasUserAdjustedCamera = false;
  let interactionMode: IfcViewerInteractionMode = "orbit";
  let selectedExpressId: number | null = null;

  const updateCamera = () => {
    camera.position.set(
      target.x + distance * Math.cos(elevation) * Math.cos(azimuth),
      target.y + distance * Math.sin(elevation),
      target.z + distance * Math.cos(elevation) * Math.sin(azimuth),
    );
    camera.lookAt(target);
    camera.near = Math.max(distance / 10_000, 0.01);
    camera.far = Math.max(distance * 100, 1_000);
    camera.updateProjectionMatrix();
  };
  updateCamera();

  const setHighlighted = (expressId: number | null) => {
    if (selectedExpressId !== null) {
      for (const object of byExpressId.get(selectedExpressId) ?? []) {
        const material = (object as THREE.Mesh).material as THREE.MeshStandardMaterial;
        material.emissive.setHex(0x000000);
      }
    }
    selectedExpressId = expressId;
    if (expressId !== null) {
      for (const object of byExpressId.get(expressId) ?? []) {
        const material = (object as THREE.Mesh).material as THREE.MeshStandardMaterial;
        material.emissive.setHex(0xf59e0b);
        material.emissiveIntensity = 0.8;
      }
    }
  };

  const resize = () => {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    renderer.setPixelRatio(Math.min(Math.max(window.devicePixelRatio || 1, 1), 2));
    renderer.setSize(width, height, true);
    camera.aspect = width / height;
    if (!hasUserAdjustedCamera) {
      distance = computeFitCameraDistance(radius, camera.fov, camera.aspect);
    }
    updateCamera();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  window.addEventListener("resize", resize);
  resize();
  let animationFrame = 0;
  const draw = () => { renderer.render(scene, camera); animationFrame = requestAnimationFrame(draw); };
  draw();

  let dragging = false;
  let activeDragMode: IfcViewerInteractionMode = "orbit";
  let moved = false;
  let previousX = 0;
  let previousY = 0;
  const applyPanPixels = (dx: number, dy: number) => {
    const delta = computePanDelta({
      dx,
      dy,
      azimuth,
      elevation,
      distance,
      viewportHeight: Math.max(container.clientHeight, 1),
      fovDegrees: camera.fov,
    });
    target.x += delta.x;
    target.y += delta.y;
    target.z += delta.z;
    hasUserAdjustedCamera = true;
    updateCamera();
  };
  const onContextMenu = (event: MouseEvent) => {
    event.preventDefault();
  };
  const onPointerDown = (event: PointerEvent) => {
    dragging = true;
    moved = false;
    previousX = event.clientX;
    previousY = event.clientY;
    activeDragMode =
      event.button === 1 || event.button === 2 || event.shiftKey || interactionMode === "pan"
        ? "pan"
        : "orbit";
    renderer.domElement.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent) => {
    if (!dragging) return;
    const dx = event.clientX - previousX;
    const dy = event.clientY - previousY;
    moved ||= Math.abs(dx) + Math.abs(dy) > 3;
    previousX = event.clientX;
    previousY = event.clientY;
    if (activeDragMode === "pan" || event.shiftKey) {
      applyPanPixels(dx, dy);
    } else {
      azimuth -= dx * 0.006;
      elevation = Math.max(-1.45, Math.min(1.45, elevation + dy * 0.006));
      hasUserAdjustedCamera = true;
      updateCamera();
    }
  };
  const onPointerUp = (event: PointerEvent) => {
    dragging = false;
    if (moved || event.button !== 0) return;
    const rect = renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, camera);
    const visibleChildren = modelRoot.children.filter(child => child.visible);
    const hits = raycaster.intersectObjects(visibleChildren, false);
    const hit = hits.find(candidate => isInsideSections(candidate.point));
    const expressId = hit?.object.userData.expressId as number | undefined;
    setHighlighted(expressId ?? null);
    onSelection(expressId === undefined ? null : identityIndex.byExpressId.get(expressId) ?? null);
  };
  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    hasUserAdjustedCamera = true;
    distance = Math.max(radius * 0.05, Math.min(radius * 40, distance * Math.exp(event.deltaY * 0.001)));
    updateCamera();
  };
  renderer.domElement.addEventListener("contextmenu", onContextMenu);
  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("pointerup", onPointerUp);
  renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

  const expressIdForKey = (elementKey: string) => {
    const identity = identityIndex.byElementKey.get(elementKey);
    return identity ? Number(identity.stepId) : null;
  };
  const setOnlyVisible = (expressId: number | null) => {
    for (const [id, objects] of byExpressId) for (const object of objects) object.visible = expressId === null || id === expressId;
  };
  const focusExpressId = (expressId: number | null) => {
    if (expressId === null) return;
    const objects = byExpressId.get(expressId);
    if (!objects || objects.length === 0) return;
    const elemBox = new THREE.Box3();
    for (const obj of objects) {
      elemBox.expandByObject(obj);
    }
    if (elemBox.isEmpty()) return;
    const elemSphere = elemBox.getBoundingSphere(new THREE.Sphere());
    target.copy(elemSphere.center);
    distance = Math.max(
      computeFitCameraDistance(Math.max(elemSphere.radius, 0.75), camera.fov, camera.aspect, 1.8),
      radius * 0.15,
    );
    hasUserAdjustedCamera = true;
    updateCamera();
  };

  return {
    selectElement(elementKey) {
      const expressId = elementKey ? expressIdForKey(elementKey) : null;
      setHighlighted(expressId);
      onSelection(expressId === null ? null : identityIndex.byExpressId.get(expressId) ?? null);
    },
    focusElement(elementKey) {
      const expressId = elementKey ? expressIdForKey(elementKey) : selectedExpressId;
      focusExpressId(expressId);
    },
    hideElement(elementKey) { const id = expressIdForKey(elementKey); if (id !== null) for (const object of byExpressId.get(id) ?? []) object.visible = false; },
    showAll() { setOnlyVisible(null); },
    isolateElement(elementKey) {
      const id = expressIdForKey(elementKey);
      setOnlyVisible(id);
      focusExpressId(id);
    },
    fitToModel() {
      target.copy(initialTarget);
      distance = computeFitCameraDistance(radius, camera.fov, camera.aspect);
      hasUserAdjustedCamera = false;
      updateCamera();
    },
    setCameraPreset(preset) {
      const angles = getCameraPresetAngles(preset);
      azimuth = angles.azimuth;
      elevation = angles.elevation;
      target.copy(initialTarget);
      distance = computeFitCameraDistance(radius, camera.fov, camera.aspect);
      hasUserAdjustedCamera = true;
      updateCamera();
    },
    zoomByFactor(factor) {
      const safeFactor = Number.isFinite(factor) && factor > 0 ? factor : 1;
      hasUserAdjustedCamera = true;
      distance = Math.max(radius * 0.05, Math.min(radius * 40, distance * safeFactor));
      updateCamera();
    },
    panByPixels(dx, dy) {
      applyPanPixels(dx, dy);
    },
    setInteractionMode(mode) {
      interactionMode = mode;
    },
    setSectionCut,
    setWireframe(enabled) {
      modelRoot.traverse(object => {
        if (object instanceof THREE.Mesh) {
          (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => {
            (material as THREE.MeshStandardMaterial).wireframe = enabled;
          });
        }
      });
    },
    resetView() {
      setOnlyVisible(null);
      setHighlighted(null);
      const angles = getCameraPresetAngles("iso");
      azimuth = angles.azimuth;
      elevation = angles.elevation;
      target.copy(initialTarget);
      distance = computeFitCameraDistance(radius, camera.fov, camera.aspect);
      resetSections();
      hasUserAdjustedCamera = false;
      updateCamera();
      onSelection(null);
    },
    dispose() {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
      window.removeEventListener("resize", resize);
      renderer.domElement.removeEventListener("contextmenu", onContextMenu);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("wheel", onWheel);
      modelRoot.traverse(object => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => material.dispose());
        }
      });
      disposeIfcRuntime(api, modelId, renderer);
      container.replaceChildren();
    },
  };
}

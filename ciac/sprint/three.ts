// Use the original bundled Three.js r128, never load a second renderer/library.
const T = (globalThis as any).THREE;
export const Group=T.Group, Mesh=T.Mesh, PlaneGeometry=T.PlaneGeometry, MeshBasicMaterial=T.MeshBasicMaterial, DoubleSide=T.DoubleSide;
export type Mesh=any;
export type Scene=any;

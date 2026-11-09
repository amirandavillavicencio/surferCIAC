"""Blender 4.3. Ejecutar desde la raíz: blender -b --python art/protagonista/modelar.py."""
from math import asin, copysign, cos, pi, sin
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector

bpy.ops.wm.read_factory_settings(use_empty=True)

SAND = 'bf905e'
LIGHT = 'd7a878'
OCHRE = 'a4744c'
SEAM = '79523c'
HEM = '936145'
ORANGE = 'f49126'
ORANGE_DARK = 'b95b1e'
INK = '161b21'
LINING = '4f3329'
CARGO = '303630'
FOLD = '373e36'
DARK = '292f2b'
RED = 'd34c38'
RED_DARK = '8f2d26'
RUBBER = 'd4c7bb'
SOLE = '655d60'
PACK = '383433'
STRAP = '29282a'
CREAM = 'f5deb7'

vertices, polygons, colors, bindings, smooth = [], [], [], [], []


def point(co, weights):
    vertices.append(co)
    bindings.append({weights: 1} if isinstance(weights, str) else weights)
    return len(vertices) - 1


def face(indices, color, soft=True):
    polygons.append(indices)
    colors.append(color)
    smooth.append(soft)


def loft(contours, weights, bands, caps=True, soft=True):
    """Bridge cross-sections. Bands can specify one color per edge."""
    rings = [[point(v, w) for v in ring] for ring, w in zip(contours, weights)]
    for lower, upper, band in zip(rings, rings[1:], bands):
        for i in range(len(lower)):
            j = (i + 1) % len(lower)
            face((lower[i], lower[j], upper[j], upper[i]),
                 band if isinstance(band, str) else band[i], soft)
    if caps:
        face(tuple(reversed(rings[0])), bands[0] if isinstance(bands[0], str) else bands[0][0], False)
        face(tuple(rings[-1]), bands[-1] if isinstance(bands[-1], str) else bands[-1][0], False)
    return rings


def ellipse(rx, ry, segments=16, power=1):
    for i in range(segments):
        a = 2 * pi * i / segments
        yield (rx * copysign(abs(cos(a)) ** power, cos(a)),
               ry * copysign(abs(sin(a)) ** power, sin(a)))


def upright(sections, weights, bands, segments=16, power=1, crease=0):
    contours = []
    for row, (z, x, y, rx, ry) in enumerate(sections):
        contours.append([
            (x + dx, y + dy, z + crease * sin(row * 1.43 + i * 4 * pi / segments))
            for i, (dx, dy) in enumerate(ellipse(rx, ry, segments, power))
        ])
    return loft(contours, weights, bands)


def tube(path, radii, weight, color, segments=6):
    contours = []
    for i, co in enumerate(path):
        tangent = (Vector(path[min(i + 1, len(path) - 1)]) -
                   Vector(path[max(i - 1, 0)])).normalized()
        ref = Vector((1, 0, 0)) if abs(tangent.x) < .8 else Vector((0, 1, 0))
        u = tangent.cross(ref).normalized()
        v = tangent.cross(u)
        contours.append([Vector(co) + a * u + b * v for a, b in ellipse(*radii, segments)])
    return loft(contours, [weight] * len(path), [color] * (len(path) - 1))


def plate(corners, weight, color):
    face(tuple(point(co, weight) for co in corners), color, False)


# Structured hood. The long brow projects forward. The opening is an actual
# return into the shell, with a separate dark interior surface behind the face.
hood = [
    (-.45, 3.70), (.42, 3.73), (.64, 3.58), (.68, 3.23),
    (.57, 2.88), (.33, 2.59), (-.30, 2.56), (-.55, 2.71),
    (-.68, 2.98), (-.65, 3.49),
]
brow = [-.73, -.72, -.64, -.50, -.36, -.25, -.24, -.34, -.50, -.63]
mid = 3.15


def hood_ring(scale, depth, lift=0):
    return [(x * scale, y, mid + (z - mid) * scale + lift)
            for (x, z), y in zip(hood, depth)]


outer_bands = [LIGHT, LIGHT, SAND, SAND, OCHRE, HEM, OCHRE, SAND, SAND, LIGHT]
rear_bands = [SAND, SAND, OCHRE, SAND, OCHRE, HEM, HEM, OCHRE, SAND, SAND]
hood_rings = [
    hood_ring(.84, [.485] * 10, -.045),
    hood_ring(.96, [.38, .39, .51, .53, .52, .35, .35, .49, .53, .50], -.01),
    hood_ring(1, [-.10, -.10, -.04, .00, .06, .07, .07, .06, .00, -.04]),
    hood_ring(.99, brow),
    hood_ring(.87, [y + .026 for y in brow], -.01),
    hood_ring(.79, [y + .15 for y in brow], -.025),
    hood_ring(.63, [.23] * 10, -.04),
]
rings = loft(hood_rings, ['Head'] * len(hood_rings),
             [rear_bands, rear_bands, outer_bands, SEAM, LINING, INK], caps=False, soft=False)
face(tuple(reversed(rings[0])), SAND, False)
face(tuple(rings[-1]), INK, False)

# Only a small, shaded lower face is visible inside the opening.
upright([(2.65, 0, -.036, .20, .12), (2.76, 0, -.067, .24, .145),
         (2.92, 0, -.066, .26, .158), (3.07, 0, -.038, .224, .12)],
        ['Head'] * 4, ['211a1c', '21191e', '19191e'], 12)

# A small bound eyelet and topstitched seam are visible in the reference.
eyelet = [(.672 + .006 * cos(2 * pi * i / 12), -.265 + .045 * cos(2 * pi * i / 12),
           3.33 + .063 * sin(2 * pi * i / 12)) for i in range(13)]
tube(eyelet, (.012, .012), 'Head', CREAM)
tube([(.647, -.16, 3.56), (.686, -.14, 3.28), (.598, -.078, 2.91),
      (.372, -.116, 2.67)], (.009, .009), 'Head', OCHRE)

# Jacket torso and orange layer. The front-facing sectors of the jacket
# open out toward the hem, revealing the lining and the orange sweatshirt.
body = [
    (1.26, .00, .043, .51, .306), (1.33, .02, .026, .62, .36),
    (1.48, -.014, .016, .60, .35), (1.63, .02, .018, .57, .36),
    (1.83, .008, .03, .53, .34), (2.08, -.015, .032, .52, .34),
    (2.31, .00, .026, .51, .31), (2.43, 0, .035, .39, .252),
    (2.53, 0, .040, .252, .188), (2.62, 0, .033, .215, .17),
]
body_weights = ['Hips', {'Hips': .74, 'Spine': .26}, {'Hips': .35, 'Spine': .65},
                'Spine', {'Spine': .45, 'Chest': .55}, {'Chest': .55, 'UpperChest': .45},
                'UpperChest', 'UpperChest', {'UpperChest': .65, 'Neck': .35}, 'Neck']
opening = [.28, .28, .265, .24, .207, .162, .135, .135, .12, .105]
contours = []
for (z, x, y, rx, ry), gap in zip(body, opening):
    angle = asin(gap / rx)
    span = 2 * pi - 2 * angle
    contours.append([(x + rx * sin(angle + span * i / 20),
                      y - ry * cos(angle + span * i / 20), z) for i in range(21)])
# The two cut edges of each section run around the sides and back of the body.
torso = [[point(co, weight) for co in contour] for contour, weight in zip(contours, body_weights)]
for row, (a, b) in enumerate(zip(torso, torso[1:])):
    for i in range(20):
        color = HEM if row < 2 else LIGHT if row >= 5 else SAND
        if i in (0, 19):
            color = OCHRE
        face((a[i], a[i + 1], b[i + 1], b[i]), color)
for edge in (0, -1):
    for row, (a, b) in enumerate(zip(torso, torso[1:])):
        p, q = (Vector(vertices[index]) for index in (a[edge], b[edge]))
        face((a[edge], b[edge], point(q + Vector((0, .035, 0)), body_weights[row + 1]),
              point(p + Vector((0, .035, 0)), body_weights[row])), SEAM)
upright([(z + .012, x, y + .02, min(rx * .85, .39), ry * .88)
         for z, x, y, rx, ry in body], body_weights,
        [ORANGE_DARK, ORANGE, ORANGE, ORANGE, ORANGE, ORANGE, ORANGE, ORANGE_DARK, ORANGE_DARK])
tube([(-.058, -.20, 2.56), (-.056, -.239, 2.42), (-.070, -.264, 2.27),
      (-.033, -.271, 2.18)], (.015, .014), 'UpperChest', SEAM)
tube([(.063, -.215, 2.55), (.059, -.251, 2.38), (.085, -.271, 2.26)],
     (.015, .014), 'UpperChest', SEAM)

for s, side in ((1, 'Left'), (-1, 'Right')):
    upper, forearm, hand = (side + part for part in ('Arm', 'ForeArm', 'Hand'))
    sleeve = [
        (.29, .008, 2.303, .218, .202), (.42, .005, 2.332, .256, .249),
        (.55, .002, 2.34, .266, .263), (.72, -.023, 2.321, .223, .213),
        (.81, -.013, 2.313, .213, .201), (.92, -.035, 2.297, .238, .234),
        (1.05, -.025, 2.289, .268, .258), (1.15, -.046, 2.278, .228, .21),
        (1.225, -.050, 2.27, .177, .165), (1.303, -.047, 2.274, .148, .147),
        (1.345, -.041, 2.277, .144, .14),
    ]
    sleeve_weights = [{'UpperChest': .6, upper: .4}, {'UpperChest': .22, upper: .78},
                      upper, {upper: .85, forearm: .15}, {upper: .52, forearm: .48},
                      {upper: .15, forearm: .85}, forearm, forearm, forearm,
                      {forearm: .84, hand: .16}, {forearm: .69, hand: .31}]
    loft([[(s*x, y + a, z + b) for a, b in ellipse(ry, rz, 14, .85)]
          for x, y, z, ry, rz in sleeve], sleeve_weights,
         [SAND, SAND, LIGHT, OCHRE, SAND, SAND, HEM, OCHRE, SEAM, HEM])
    loft([[(s*x, y + a, z + b) for a, b in ellipse(ry, rz, 10, .8)]
          for x, y, z, ry, rz in [(1.29, -.039, 2.277, .092, .09),
                                 (1.38, -.054, 2.266, .122, .108),
                                 (1.482, -.078, 2.246, .107, .085),
                                 (1.537, -.075, 2.23, .072, .06)]],
         [hand] * 4, [INK, PACK, INK])

    # Angled welt pockets carry the same cloth weights as the jacket body.
    pocket = {'Spine': .77, 'Hips': .23}
    plate([(s*.282, -.301, 1.474), (s*.438, -.249, 1.440),
           (s*.487, -.223, 1.537), (s*.377, -.277, 1.718),
           (s*.324, -.303, 1.687)], pocket, OCHRE)
    tube([(s*.324, -.308, 1.69), (s*.378, -.285, 1.724),
          (s*.471, -.237, 1.583), (s*.495, -.223, 1.538)],
         (.012, .012), pocket, SEAM)

    # Baggy cargo legs taper abruptly onto the padded shoe collars.
    thigh, shin, foot, toes = (side + part for part in ('UpLeg', 'Leg', 'Foot', 'Toes'))
    leg = [
        (.266, .306, .115, .205, .179), (.336, .308, .084, .236, .204),
        (.411, .300, .083, .269, .238), (.490, .304, .065, .236, .205),
        (.558, .286, .045, .266, .236), (.660, .284, .015, .248, .215),
        (.758, .275, -.001, .240, .233), (.870, .27, -.028, .278, .246),
        (.965, .255, -.025, .276, .257), (1.080, .238, -.010, .265, .24),
        (1.205, .225, -.021, .262, .259), (1.36, .21, -.008, .263, .256),
    ]
    upright([(z, s*x, y, rx, ry) for z, x, y, rx, ry in leg],
            [shin, shin, shin, shin, shin, {shin: .89, thigh: .11},
             {shin: .57, thigh: .43}, {shin: .19, thigh: .81}, thigh,
             thigh, {thigh: .72, 'Hips': .28}, {thigh: .49, 'Hips': .51}],
            [DARK, FOLD, DARK, CARGO, FOLD, CARGO, CARGO, FOLD, CARGO, CARGO, DARK],
            16, .72, crease=.026)

    # Cargo gusset, pocket flap and woven pull tab.
    upright([(.746, s*.443, -.012, .105, .151), (.817, s*.474, -.012, .123, .177),
             (.969, s*.468, -.032, .112, .166), (1.017, s*.446, -.031, .106, .167)],
            [{thigh: .73, shin: .27}, {thigh: .81, shin: .19}, thigh, thigh],
            [DARK, CARGO, FOLD], 8, .54)
    plate([(s*.399, -.194, .985), (s*.477, -.203, .984),
           (s*.478, -.206, .930), (s*.398, -.202, .929)], thigh, RED)
    plate([(s*.556, -.108, .851), (s*.591, -.070, .848),
           (s*.589, -.077, .799), (s*.553, -.11, .801)], thigh, ORANGE_DARK)

    # Sneaker from one series of sections with welt, rubber toe and padded upper.
    footprint = [
        (-.17, -.433), (.15, -.433), (.231, -.326), (.224, -.15),
        (.205, .06), (.182, .245), (.13, .304), (-.14, .302),
        (-.203, .242), (-.207, .053), (-.226, -.125), (-.228, -.322),
    ]
    shoe_sections = [
        (.008, .95, 1.00, .000), (.04, 1.02, 1.02, .000),
        (.094, 1.015, 1.015, .000), (.121, .982, .982, .000),
        (.185, .970, .955, .015), (.243, .86, .77, .045),
        (.345, .73, .50, .075), (.415, .69, .38, .102),
    ]
    shoe_contours = [[(s * (.31 + dx * width - min(dy, 0) * .09),
                       dy * length + shift, z) for dx, dy in footprint]
                     for z, width, length, shift in shoe_sections]
    sole_rings = [[point(co, {foot: .72, toes: .28} if co[1] < -.20 else foot)
                   for co in ring] for ring in shoe_contours]
    for row, (a, b) in enumerate(zip(sole_rings, sole_rings[1:])):
        for i in range(len(a)):
            j = (i + 1) % len(a)
            color = [SOLE, RUBBER, SOLE, RED, RED, RED_DARK, RED_DARK][row]
            if row in (3, 4) and i in (11, 0, 1):
                color = RUBBER if row == 3 else RED
            if row == 4 and i in (4, 5, 6, 7):
                color = RED_DARK
            face((a[i], a[j], b[j], b[i]), color)
    face(tuple(reversed(sole_rings[0])), SOLE, False)
    face(tuple(sole_rings[-1]), RED_DARK, False)
    for z, y, half in ((.222, -.274, .107), (.254, -.222, .107), (.292, -.155, .107)):
        tube([(s*(.315-half), y+.017, z), (s*.315, y, z+.012),
              (s*(.315+half), y+.014, z)], (.013, .013), foot, CREAM)
    for j in range(2):
        plate([(s*.225, .307, .116 + j*.037), (s*.394, .308, .118 + j*.037),
               (s*.394, .306, .134 + j*.037), (s*.225, .305, .132 + j*.037)], foot, RED)

upright([(1.10, 0, 0, .377, .218), (1.227, 0, -.01, .487, .27),
         (1.37, 0, .012, .507, .285), (1.46, 0, .01, .47, .257)],
        ['Hips'] * 4, [CARGO, DARK, CARGO], 16, .77)
tube([(.019, -.302, 1.37), (.027, -.294, 1.23), (.021, -.263, 1.11),
      (.019, -.264, 1.02)], (.024, .018), 'Hips', ORANGE)

# Compact dark backpack and its visible shoulder straps.
upright([(1.66, 0, .417, .24, .128), (1.74, 0, .453, .353, .165),
         (1.88, 0, .48, .393, .176), (2.16, 0, .49, .395, .184),
         (2.35, 0, .466, .356, .17), (2.45, 0, .433, .266, .136)],
        ['Chest', 'Chest', 'Chest', 'Chest', 'UpperChest', 'UpperChest'],
        [STRAP, PACK, PACK, PACK, '57514e'], 16, .56)
upright([(1.78, 0, .616, .258, .072), (1.85, 0, .627, .301, .088),
         (2.053, 0, .631, .309, .091), (2.12, 0, .612, .264, .088)],
        ['Chest'] * 4, [STRAP, '4d4541', PACK], 12, .52)
for s in (1, -1):
    tube([(s*.266, .345, 2.381), (s*.318, .139, 2.465), (s*.347, -.084, 2.425),
          (s*.355, -.253, 2.30), (s*.372, -.284, 2.105),
          (s*.407, -.25, 1.912), (s*.454, -.092, 1.79), (s*.37, .29, 1.793)],
         (.051, .039), {'UpperChest': .67, 'Chest': .33}, STRAP)

# Woven back mark, just above the pack. Glyphs share the garment material.
plate([(-.274, .487, 2.974), (.274, .487, 2.974),
       (.274, .487, 3.158), (-.274, .487, 3.158)], 'Head', HEM)
glyphs = (
    ((.17, .90), (.80, .90), (.80, .75), (.27, .75), (.27, .25),
     (.80, .25), (.80, .10), (.17, .10), (.08, .21), (.08, .79)),
    ((.25, .9), (.68, .9), (.68, .77), (.55, .77), (.55, .23), (.68, .23),
     (.68, .1), (.25, .1), (.25, .23), (.38, .23), (.38, .77), (.25, .77)),
    ((.00, .10), (.29, .90), (.65, .90), (.95, .10), (.74, .10), (.66, .31),
     (.30, .31), (.22, .10)),
    ((.17, .90), (.80, .90), (.80, .75), (.27, .75), (.27, .25),
     (.80, .25), (.80, .10), (.17, .10), (.08, .21), (.08, .79)),
)
for i, glyph in enumerate(glyphs):
    plate([(.229 - i*.122 - x*.107, .490, 2.985 + z*.163)
           for x, z in glyph], 'Head', CREAM)
plate([(.229 - 2*.122 - x*.107, .491, 2.985 + z*.163)
       for x, z in ((.36, .46), (.59, .46), (.51, .72), (.43, .72))], 'Head', HEM)

# A compact deform rig in the target rest frame. The joint names match the
# transfer map used by CampusRunner, including its toe and spine aliases.
arm = bpy.data.armatures.new('CIAC Rig')
rig = bpy.data.objects.new('CIAC Rig', arm)
bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')


def bone(name, head, tail, parent=None):
    joint = arm.edit_bones.new(name)
    joint.head = head
    joint.tail = tail
    if parent:
        joint.parent = arm.edit_bones[parent]


bone('Hips', (0, -.031, 1.242), (0, -.031, 1.564))
bone('Spine', (0, -.031, 1.564), (0, .004, 1.849), 'Hips')
bone('Chest', (0, .004, 1.849), (0, .034, 2.153), 'Spine')
bone('UpperChest', (0, .034, 2.153), (0, .034, 2.424), 'Chest')
bone('Neck', (0, .034, 2.424), (0, -.009, 2.698), 'UpperChest')
bone('Head', (0, -.009, 2.698), (0, -.014, 3.70), 'Neck')
for s, side in ((1, 'Left'), (-1, 'Right')):
    shoulder = (.336*s, -.017, 2.359)
    elbow = (.805*s, -.004, 2.317)
    wrist = (1.329*s, -.040, 2.276)
    knee = (.274*s, -.011, .780)
    ankle = (.303*s, .149, .193)
    toe = (.354*s, -.087, .013)
    bone(side+'Shoulder', (.089*s, -.031, 2.434), shoulder, 'UpperChest')
    bone(side+'Arm', shoulder, elbow, side+'Shoulder')
    bone(side+'ForeArm', elbow, wrist, side+'Arm')
    bone(side+'Hand', wrist, (1.52*s, -.05, 2.24), side+'ForeArm')
    bone(side+'UpLeg', (.202*s, -.031, 1.301), knee, 'Hips')
    bone(side+'Leg', knee, ankle, side+'UpLeg')
    bone(side+'Foot', ankle, toe, side+'Leg')
    bone(side+'Toes', toe, (.379*s, -.3, .005), side+'Foot')
bpy.ops.object.mode_set(mode='OBJECT')

mesh = bpy.data.meshes.new('Vestuario CIAC')
mesh.from_pydata(vertices, [], polygons)
mesh.update()
obj = bpy.data.objects.new(mesh.name, mesh)
bpy.context.collection.objects.link(obj)
obj.parent = rig
modifier = obj.modifiers.new('Deformación', 'ARMATURE')
modifier.object = rig
for joint in arm.bones:
    obj.vertex_groups.new(name=joint.name)
for i, weights in enumerate(bindings):
    for name, weight in weights.items():
        obj.vertex_groups[name].add([i], weight, 'REPLACE')

material = bpy.data.materials.new('Lona, goma y tejidos')
material.use_nodes = True
shader = material.node_tree.nodes.get('Principled BSDF')
shader.inputs['Roughness'].default_value = .94
attr = material.node_tree.nodes.new('ShaderNodeVertexColor')
attr.layer_name = 'Color'
material.node_tree.links.new(attr.outputs['Color'], shader.inputs['Base Color'])
mesh.materials.append(material)
data = mesh.color_attributes.new(name='Color', type='BYTE_COLOR', domain='CORNER').data
for polygon, color, soft in zip(mesh.polygons, colors, smooth):
    rgb = tuple(int(color[i:i+2], 16) / 255 for i in (0, 2, 4))
    for i in polygon.loop_indices:
        data[i].color_srgb = (*rgb, 1)
    polygon.use_smooth = soft

bm = bmesh.new()
bm.from_mesh(mesh)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
bm.to_mesh(mesh)
bm.free()

# Set outward normals explicitly on open details whose winding is ambiguous.
# Back of the hood is +Y in Blender; the jacket opening faces -Y.
for polygon in mesh.polygons:
    if min(mesh.vertices[i].co.y for i in polygon.vertices) >= .485 and (
            all(2.972 <= mesh.vertices[i].co.z <= 3.16 for i in polygon.vertices)):
        if polygon.normal.y < 0:
            polygon.flip()
    if len(polygon.vertices) > 6 and max(mesh.vertices[i].co.y for i in polygon.vertices) < .24:
        if all(mesh.vertices[i].co.z > 2.5 for i in polygon.vertices) and polygon.normal.y > 0:
            polygon.flip()
mesh.update()

path = Path(__file__).resolve().parent
bpy.ops.export_scene.gltf(filepath=str(path / 'protagonista-ciac.glb'), export_format='GLB',
                          export_animations=False, export_extras=False, export_yup=True)

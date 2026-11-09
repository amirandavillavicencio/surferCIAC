"""Blender 4.3: blender -b --python art/certamen/modelar.py."""
from math import cos, pi, sin
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector

bpy.ops.wm.read_factory_settings(use_empty=True)
vertices, polygons, colors, weights = [], [], [], []


def color(rgb):
    return tuple(c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4
                 for c in (int(rgb[i:i + 2], 16) / 255 for i in (0, 2, 4))) + (1,)


cream = color('ffe6c5')
edge = color('d3ae8a')
fold = color('fff4e4')
crease = color('d8bda0')
skin = color('f4ceaa')
navy = color('182448')
gray = color('857975')
black = color('1d1d21')
red = color('ed332b')
white = color('fff4e7')
sole = color('393133')


def part(points, faces, tint, bind):
    start = len(vertices)
    vertices.extend(points)
    weights.extend(bind(point) if callable(bind) else {bind: 1} for point in points)
    polygons.extend(tuple(start + i for i in face) for face in faces)
    colors.extend([tint] * len(faces))


def connect_rings(count, sides):
    faces = [tuple(reversed(range(sides)))]
    for ring in range(count - 1):
        for i in range(sides):
            a, b = ring * sides + i, ring * sides + (i + 1) % sides
            faces.append((a, b, b + sides, a + sides))
    faces.append(tuple(range((count - 1) * sides, count * sides)))
    return faces


def tube(a, b, profile, tint, bind, sides=10):
    a, b = Vector(a), Vector(b)
    axis = (b - a).normalized()
    across = Vector((1, 0, 0))
    across = (across - axis * across.dot(axis)).normalized()
    depth = axis.cross(across)
    points = [tuple(a.lerp(b, t) + across * (rx * cos(i * 2 * pi / sides))
                    + depth * (ry * sin(i * 2 * pi / sides)))
              for t, rx, ry in profile for i in range(sides)]
    part(points, connect_rings(len(profile), sides), tint, bind)


def capsule(a, b, radius, tint, bind, sides=10, depth=1):
    profile = [(0, .46), (.12, .85), (.28, 1), (.72, .97), (.89, .8), (1, .38)]
    tube(a, b, [(t, radius * r, radius * r * depth) for t, r in profile], tint, bind, sides)


# x is camera-right, Blender +y is forward (Three.js -Z), z is height.
# These parameters are shared by the shell, printed marks and folded flap.
def paper(u, v, offset=0):
    x = .54 * u * (1 - .05 * sin(pi * v)) + .022 * sin(pi * v)
    y = -.025 + .057 * u * u + .075 * sin(pi * v) + .026 * u * v + offset
    z = .615 + 1.33 * v + (.078 * (1 - v) - .043 * v) * (1 - u * u)
    return x, y, z


def paper_bind(point):
    t = max(0, min(1, (point[2] - 1.28) / .53))
    t = t * t * (3 - 2 * t)
    return {'Sheet': t, 'Torso': 1 - t}


def folded_limit(v):
    return 1 - .38 * max(0, (v - .80) / .20)


columns, rows = 20, 20
grid = [(-1 + (1 + folded_limit(j / rows)) * i / columns, j / rows)
        for j in range(rows + 1) for i in range(columns + 1)]
sheet_points = len(grid)
quads = [(a, a + 1, a + columns + 2, a + columns + 1)
         for j in range(rows) for i in range(columns)
         for a in [j * (columns + 1) + i]]
part([paper(u, v, -.026) for u, v in grid], quads, cream, paper_bind)
part([paper(u, v, .026) for u, v in grid], [q[::-1] for q in quads], cream, paper_bind)
perimeter = (list(range(columns + 1)) +
             [j * (columns + 1) + columns for j in range(1, rows + 1)] +
             list(range(sheet_points - 2, sheet_points - columns - 2, -1)) +
             [j * (columns + 1) for j in range(rows - 1, 0, -1)])
polygons.extend((b, a, a + sheet_points, b + sheet_points)
                for a, b in zip(perimeter, perimeter[1:] + perimeter[:1]))
colors.extend([edge] * len(perimeter))

# The curled flap casts a short crease on the sheet along its free edge.
crease_uv = [(.64, .975), (.74, .845), (.89, .795), (1, .80), (.807, .90)]
part([paper(u, v, -.032) for u, v in crease_uv], [(0, 1, 4), (1, 2, 4), (2, 3, 4)], crease, paper_bind)
flap = [paper(.62, 1, -.026), paper(.807, .90, -.026), paper(1, .80, -.026),
        paper(.74, .85, -.19), paper(.825, .875, -.116)]
part(flap, [(0, 4, 1), (1, 4, 2), (2, 4, 3), (3, 4, 0)], fold, paper_bind)


def ink(u, v):
    return paper(u, v, -.033)


def rectangle(x, y, width, height, tint=gray):
    segments = max(1, round(width * 9))
    points = [ink(x + width * i / segments, y + dy)
              for dy in (0, height) for i in range(segments + 1)]
    part(points, [(i, i + 1, i + segments + 2, i + segments + 1)
                  for i in range(segments)], tint, paper_bind)


rectangle(-.83, .674, 1.65, .035)
for y in (.508, .342, .176):
    x, w, h, stroke = -.75, .255, .109, .027
    rectangle(x, y, w, stroke * .44)
    rectangle(x, y + h - stroke * .44, w, stroke * .44)
    rectangle(x, y + stroke * .44, stroke, h - stroke * .88)
    rectangle(x + w - stroke, y + stroke * .44, stroke, h - stroke * .88)
    rectangle(-.385, y + .067, 1.10, .023)
    rectangle(-.385, y + .013, .62, .023)

# Convert bold type to actual mesh, then conform the glyphs to the curved paper.
font = bpy.data.curves.new('CERTAMEN', 'FONT')
font.body = 'CERTAMEN'
font.font = bpy.data.fonts.load('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf')
font.resolution_u = 3
title = bpy.data.objects.new('Title', font)
bpy.context.collection.objects.link(title)
lettering = bpy.data.meshes.new_from_object(title.evaluated_get(bpy.context.evaluated_depsgraph_get()))
min_x, max_x = min(v.co.x for v in lettering.vertices), max(v.co.x for v in lettering.vertices)
min_y, max_y = min(v.co.y for v in lettering.vertices), max(v.co.y for v in lettering.vertices)
part([ink(-.80 + 1.52 * (v.co.x - min_x) / (max_x - min_x),
          .724 + .142 * (v.co.y - min_y) / (max_y - min_y)) for v in lettering.vertices],
     [tuple(p.vertices) for p in lettering.polygons], navy, paper_bind)
bpy.data.objects.remove(title, do_unlink=True)

limb_faces = len(polygons)
rig = bpy.data.armatures.new('Certamen rig')
armature = bpy.data.objects.new('Certamen rig', rig)
bpy.context.collection.objects.link(armature)
bpy.context.view_layer.objects.active = armature
armature.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')


def bone(name, pivot, parent=None):
    joint = rig.edit_bones.new(name)
    joint.head = pivot
    joint.tail = Vector(pivot) + Vector((0, 0, .12))
    if parent:
        joint.parent = rig.edit_bones[parent]


bone('Root', (0, 0, 0))
bone('Torso', (0, 0, .74), 'Root')
bone('Sheet', (0, .027, 1.28), 'Torso')
for side, sign in [('L', -1), ('R', 1)]:
    arm, elbow, thigh, shin, foot = [f'{name}_{side}' for name in ('Arm', 'Elbow', 'Thigh', 'Shin', 'Foot')]
    shoulder = Vector((.455 * sign, .02, 1.185))
    elbow_pos = Vector((.687 * sign, -.034, .955))
    wrist = Vector((.735 * sign, .173, .818))
    bone(arm, shoulder, 'Torso')
    bone(elbow, elbow_pos, arm)
    capsule(shoulder.lerp(elbow_pos, -.20), shoulder.lerp(elbow_pos, 1.21), .117, skin, arm)
    capsule(elbow_pos.lerp(wrist, -.22), elbow_pos.lerp(wrist, 1.11), .105, skin, elbow)
    tube(elbow_pos.lerp(wrist, .74), wrist,
         [(0, .096, .095), (.18, .105, .104), (.83, .105, .104), (1, .095, .094)], black, elbow)
    fist = wrist + Vector((.008 * sign, .078, -.045))
    capsule(wrist.lerp(fist, -.25), wrist.lerp(fist, 1.73), .103, skin, elbow, depth=.93)
    capsule(fist + Vector((-.066 * sign, -.025, .045)),
            fist + Vector((-.053 * sign, .053, .005)), .048, skin, elbow, sides=8)

    hip = Vector((.224 * sign, .185, .74))
    knee = hip + Vector((0, 0, -.35))
    ankle = knee + Vector((0, 0, -.32))
    bone(thigh, hip, 'Root')
    bone(shin, knee, thigh)
    bone(foot, ankle, shin)
    capsule(hip + Vector((0, 0, .09)), knee + Vector((0, 0, -.076)), .129, black, thigh)
    capsule(knee + Vector((0, 0, .069)), ankle + Vector((0, 0, -.013)), .107, black, shin)

    # Three layered silhouettes share the same sole shape and deform as a rigid shoe.
    outline = [(.095, -.104), (.126, -.049), (.135, .126), (.117, .239),
               (.068, .276), (-.045, .282), (-.104, .25), (-.130, .165),
               (-.119, -.05), (-.080, -.103)]

    def shoe_layers(layers, tint):
        points = [(ankle.x + x * w, ankle.y + y * length + shift, ankle.z + z)
                  for z, w, length, shift in layers for x, y in outline]
        part(points, connect_rings(len(layers), len(outline)), tint, foot)

    shoe_layers([(-.104, .88, .94, .002), (-.096, 1, 1, 0), (-.079, 1, 1, 0)], sole)
    shoe_layers([(-.079, 1, 1, 0), (-.042, .99, 1, 0)], white)
    shoe_layers([(-.042, .97, .99, 0), (.014, .95, .97, -.001),
                 (.080, .82, .73, -.025), (.109, .74, .45, -.036)], red)
    for x in (-.076, .076):
        part([(ankle.x + x, ankle.y + .118, ankle.z + .078),
              (ankle.x + x * .92, ankle.y + .182, ankle.z + .052),
              (ankle.x + x * .49, ankle.y + .174, ankle.z + .059),
              (ankle.x + x * .54, ankle.y + .109, ankle.z + .082)],
             [(0, 1, 2, 3)], white, foot)

bpy.ops.object.mode_set(mode='OBJECT')

mesh = bpy.data.meshes.new('Certamen')
mesh.from_pydata(vertices, [], polygons)
mesh.update()
if mesh.validate():
    raise ValueError('Invalid Certamen mesh')
model = bpy.data.objects.new('Certamen', mesh)
bpy.context.collection.objects.link(model)
model.parent = armature
pigment = mesh.color_attributes.new(name='Pigment', type='BYTE_COLOR', domain='CORNER')
for face, tint in zip(mesh.polygons, colors):
    face.use_smooth = True
    for index in face.loop_indices:
        pigment.data[index].color = tint
for joint in rig.bones:
    model.vertex_groups.new(name=joint.name)
for i, groups in enumerate(weights):
    for name, strength in groups.items():
        if strength:
            model.vertex_groups[name].add([i], strength, 'REPLACE')

# Make the disconnected closed volumes consistently outward facing. Keep the
# authored orientation of the sheet, printing and thin double-sided flap.
edit = bmesh.new()
edit.from_mesh(mesh)
bmesh.ops.recalc_face_normals(edit, faces=[face for face in edit.faces if face.index >= limb_faces])
edit.to_mesh(mesh)
edit.free()

material = bpy.data.materials.new('Paper and clothing')
material.use_nodes = True
material.use_backface_culling = False
shader = material.node_tree.nodes.get('Principled BSDF')
shader.inputs['Roughness'].default_value = .88
attribute = material.node_tree.nodes.new('ShaderNodeVertexColor')
attribute.layer_name = pigment.name
material.node_tree.links.new(attribute.outputs['Color'], shader.inputs['Base Color'])
mesh.materials.append(material)
modifier = model.modifiers.new('Rig', 'ARMATURE')
modifier.object = armature

bpy.ops.export_scene.gltf(filepath=str(Path(__file__).with_name('certamen.glb')), export_format='GLB',
                          export_animations=False, export_all_vertex_colors=True)

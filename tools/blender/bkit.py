"""Shared helpers for the Blender-built beasts (tools/blender/*.py -> assets/models/beasts/*.glb, src/gfx/beasts3d.js).
Run the scripts with a Python that has Blender as a module (pip install bpy pillow numpy), or `blender -b -P script.py`.
Game convention for the exported GLB: y up, the creature faces +z (Blender: z up, faces -y), feet/hover point at the origin."""
import bpy, bmesh, os, math
from mathutils import Vector, Matrix, Euler, Quaternion

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'assets', 'models', 'beasts')


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def import_glb(path):
    """Import a GLB; returns (armature or None, [mesh objects]) without the importer's bone-shape icosphere."""
    bpy.ops.import_scene.gltf(filepath=path)
    for o in list(bpy.data.objects):
        if o.type == 'MESH' and o.name.startswith('Icosphere'): bpy.data.objects.remove(o, do_unlink=True)
    arm = next((o for o in bpy.data.objects if o.type == 'ARMATURE'), None)
    return arm, [o for o in bpy.data.objects if o.type == 'MESH']


def active(o):
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o


def decimate(o, tris):
    """Collapse-decimate a mesh object to about `tris` triangles (keeps UVs and weights)."""
    n = sum(len(p.vertices) - 2 for p in o.data.polygons)
    if n <= tris: return
    md = o.modifiers.new('dec', 'DECIMATE'); md.ratio = tris / n
    active(o)
    # the decimate modifier must sit before the armature
    while o.modifiers[0] != md: bpy.ops.object.modifier_move_up(modifier=md.name)
    bpy.ops.object.modifier_apply(modifier=md.name)


def resize_image(img, size):
    if img and max(img.size) > size: img.scale(size, size)


def keep_actions(names):
    for a in list(bpy.data.actions):
        if a.name not in names: bpy.data.actions.remove(a)


def export_glb(name, objs=None, anim=True, step=1):
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, name + '.glb')
    if objs:
        bpy.ops.object.select_all(action='DESELECT')
        for o in objs: o.select_set(True)
    kw = dict(filepath=path, export_format='GLB', use_selection=bool(objs), export_animations=anim, export_skins=True,
              export_image_format='WEBP', export_image_quality=88, export_yup=True, export_apply=False,
              export_extras=True, export_cameras=False, export_lights=False, export_morph=False, export_tangents=False)
    if anim: kw.update(export_animation_mode='ACTIONS', export_frame_step=step, export_force_sampling=True, export_optimize_animation_size=True,
                       export_optimize_animation_keep_anim_armature=False, export_anim_slide_to_zero=True)
    bpy.ops.export_scene.gltf(**kw)
    print('wrote', path, round(os.path.getsize(path) / 1e6, 2), 'MB')
    return path

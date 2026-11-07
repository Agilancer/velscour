// Terrain props the hero walks over even when their biome pack marks them as blocking.
// The packs flag anything with a footprint as solid, which turned every heap of rubble, toppled column and dead
// bush into a wall to path around. Standing pieces (fountains, statues, upright columns, altars, coffins, wells,
// braziers, crates, trees) still block; low debris lying on the floor does not.
// core/assets.js applies this when it reads a pack's scatter, so every generator (dungeons, the Breach, the Dark
// Forest, overworlds) gets the same answer.

const WALK_OVER = new Set([
  // rubble and collapsed masonry
  'collapsed_wall_rubble', 'gothic_rubble', 'buttress_fragment', 'collapsed_watch_post_foundation',
  'stone_cairn', 'tilted_stone_cairn', 'skull_waymarker_pile', 'rat_infested_skull_pile',
  // fallen / toppled / broken stonework lying on the ground
  'fallen_capital', 'fallen_column', 'toppled_column', 'fallen_chapel_column', 'collapsed_chapel_column',
  'broken_column_stump', 'split_column_stump', 'column_stump',
  'broken_headstone', 'fallen_headstone', 'fallen_skull_warning_slab', 'broken_sarcophagus_lid',
  'broken_chapel_threshold', 'ironbound_door_slab', 'iron_chain_wrapped_slate', 'broken_mile_marker',
  'cracked_statue_head', 'fallen_statue_torso', 'collapsed_effigy', 'toppled_stone_bench',
  'circular_drain_marker', 'fallen_iron_manhole',
  // broken pots and urns
  'broken_amphora', 'broken_urn', 'broken_sludge_urn', 'cracked_grave_amphora',
  // fallen metal and wood
  'fallen_iron_fence', 'fallen_iron_railing', 'fallen_iron_spike_railing', 'fallen_grated_pipe',
  'fallen_cart_wheel', 'fallen_log', 'smashed_heraldic_shield', 'shovel_bucket',
  // low growth
  'dead_shrub', 'dead_bramble', 'thorn_bush', 'deadthorn_bush', 'thornbloom_cluster', 'dead_sapling',
  'dead_tree_root_cluster', 'petrified_root_coil', 'split_stump', 'black_heather_stump',
  // floor debris
  'spider_eggs', 'wrapped_corpse', 'violet_shard_cluster',
]);

/** Pack prop names carry a numeric suffix in some packs (gothic_rubble_2): match on the base name. */
export const walkOverProp = (name) => !!name && WALK_OVER.has(String(name).replace(/_\d+$/, ''));

import { z } from "zod";

export const PalatialStatusSchema = z.string();
export type PalatialStatus = z.infer<typeof PalatialStatusSchema>;

export const TriangleCountSchema = z.enum(["minimal", "low", "medium", "high", "x_high", "auto"]);
export const MeshQualitySchema = z.enum(["medium", "high"]);
export const CollisionQualitySchema = z.enum(["low", "medium", "high", "sdf"]);
export const AssetKindSchema = z.enum(["text", "image"]);

export const GenerateBaseSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  mesh_quality: MeshQualitySchema.default("high"),
  collision_quality: CollisionQualitySchema.default("sdf"),
  enable_parts_segmentation: z.boolean().default(true),
  create_articulation: z.boolean().default(false),
  triangle_count: TriangleCountSchema.default("auto"),
  replace_glass: z.boolean().default(false)
}).superRefine((value, context) => {
  if (value.create_articulation && !["minimal", "low"].includes(value.triangle_count)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["triangle_count"],
      message: "Articulated projects require triangle_count to be minimal or low."
    });
  }
});

export const TextProjectCreateSchema = GenerateBaseSchema;
export type TextProjectCreate = z.infer<typeof TextProjectCreateSchema>;

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  palatial_id: z.string(),
  kind: AssetKindSchema,
  name: z.string(),
  description: z.string(),
  params: z.record(z.unknown()),
  status: z.string(),
  display_text: z.string().nullable(),
  progress: z.number().int(),
  total_steps: z.number().int(),
  completed_steps: z.number().int(),
  thumbnail_url: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  status_updated_at: z.string()
});
export type Project = z.infer<typeof ProjectSchema>;

export const Vec3Schema = z.tuple([z.number(), z.number(), z.number()]);
export const SceneItemSchema = z.object({
  id: z.string(),
  projectId: z.string().uuid(),
  position: Vec3Schema,
  rotation: Vec3Schema,
  scale: Vec3Schema
});
export type SceneItem = z.infer<typeof SceneItemSchema>;

export const SceneSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  items: z.array(SceneItemSchema),
  created_at: z.string(),
  updated_at: z.string()
});
export type Scene = z.infer<typeof SceneSchema>;

export const SceneCreateSchema = z.object({
  name: z.string().min(1),
  items: z.array(SceneItemSchema).default([])
});
export type SceneCreate = z.infer<typeof SceneCreateSchema>;

export const SceneUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  items: z.array(SceneItemSchema).optional()
});
export type SceneUpdate = z.infer<typeof SceneUpdateSchema>;

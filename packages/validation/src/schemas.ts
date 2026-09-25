import { z } from 'zod';
import { LoadStatus, PackageStatus, UserRole, VehicleType } from '@cargoflow/shared-types';

// ---- Auth ----
export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  organizationName: z.string().min(2).max(100),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ---- Vehicle / Trailer ----
export const CreateVehicleSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.nativeEnum(VehicleType),
  registrationNumber: z.string().max(50).optional(),
  interiorLength: z.number().int().positive().max(30_000), // mm, max 30m
  interiorWidth: z.number().int().positive().max(5_000),   // mm, max 5m
  interiorHeight: z.number().int().positive().max(5_000),  // mm, max 5m
  maxPayloadKg: z.number().positive().max(100_000),        // kg
  doorWidth: z.number().int().positive().max(5_000),
  doorHeight: z.number().int().positive().max(5_000),
  description: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
});

export const UpdateVehicleSchema = CreateVehicleSchema.partial();

// ---- Package Definition ----
export const CreatePackageDefinitionSchema = z.object({
  sku: z.string().max(100).optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  length: z.number().int().positive().max(20_000), // mm
  width: z.number().int().positive().max(20_000),
  height: z.number().int().positive().max(20_000),
  weightKg: z.number().positive().max(50_000),
  isFragile: z.boolean().default(false),
  isHazardous: z.boolean().default(false),
  isStackable: z.boolean().default(true),
  requiresUprightOrientation: z.boolean().default(false),
  requiresFloorSupport: z.boolean().default(false),
  allowedRotations: z.array(z.number().int().min(0).max(5)).default([0, 1, 2, 3, 4, 5]),
  maxStackWeightKg: z.number().positive().optional(),
  barcode: z.string().max(200).optional(),
});

export const UpdatePackageDefinitionSchema = CreatePackageDefinitionSchema.partial();

// ---- Load ----
export const CreateLoadSchema = z.object({
  vehicleId: z.string().uuid(),
  origin: z.string().max(200).optional(),
  destination: z.string().max(200).optional(),
  plannedLoadingDate: z.string().datetime().optional(),
  assignedDriverId: z.string().uuid().optional(),
  notes: z.string().max(2000).optional(),
});

export const UpdateLoadSchema = z.object({
  vehicleId: z.string().uuid().optional(),
  origin: z.string().max(200).optional(),
  destination: z.string().max(200).optional(),
  plannedLoadingDate: z.string().datetime().optional(),
  assignedDriverId: z.string().uuid().optional(),
  notes: z.string().max(2000).optional(),
  status: z.nativeEnum(LoadStatus).optional(),
  version: z.number().int().positive(), // required for optimistic concurrency
});

// ---- Load Package ----
export const AddLoadPackageSchema = z.object({
  packageDefinitionId: z.string().uuid(),
  quantity: z.number().int().positive().max(1000).default(1),
  stopSequence: z.number().int().min(1).optional(),
  priority: z.number().int().min(1).max(10).default(5),
  notes: z.string().max(1000).optional(),
});

// ---- Placement ----
export const CreatePlacementSchema = z.object({
  loadPackageId: z.string().uuid(),
  x: z.number().min(0),
  y: z.number().min(0),
  z: z.number().min(0),
  rotationIndex: z.number().int().min(0).max(5),
  loadVersion: z.number().int().positive(), // optimistic concurrency
});

export const UpdatePlacementSchema = z.object({
  x: z.number().min(0),
  y: z.number().min(0),
  z: z.number().min(0),
  rotationIndex: z.number().int().min(0).max(5),
  loadVersion: z.number().int().positive(),
});

// ---- Packing ----
export const AutoPackSchema = z.object({
  strategy: z.enum(['GREEDY', 'BFD', 'GENETIC']).default('GREEDY'),
  loadVersion: z.number().int().positive(),
});

// Types
export type RegisterDto = z.infer<typeof RegisterSchema>;
export type LoginDto = z.infer<typeof LoginSchema>;
export type CreateVehicleDto = z.infer<typeof CreateVehicleSchema>;
export type UpdateVehicleDto = z.infer<typeof UpdateVehicleSchema>;
export type CreatePackageDefinitionDto = z.infer<typeof CreatePackageDefinitionSchema>;
export type UpdatePackageDefinitionDto = z.infer<typeof UpdatePackageDefinitionSchema>;
export type CreateLoadDto = z.infer<typeof CreateLoadSchema>;
export type UpdateLoadDto = z.infer<typeof UpdateLoadSchema>;
export type AddLoadPackageDto = z.infer<typeof AddLoadPackageSchema>;
export type CreatePlacementDto = z.infer<typeof CreatePlacementSchema>;
export type UpdatePlacementDto = z.infer<typeof UpdatePlacementSchema>;
export type AutoPackDto = z.infer<typeof AutoPackSchema>;

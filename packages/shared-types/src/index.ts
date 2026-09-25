// ============================================================
// ENUMS
// ============================================================

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ORG_ADMIN = 'ORG_ADMIN',
  PLANNER = 'PLANNER',
  DISPATCHER = 'DISPATCHER',
  LOADER = 'LOADER',
  DRIVER = 'DRIVER',
  VIEWER = 'VIEWER',
}

export enum LoadStatus {
  DRAFT = 'DRAFT',
  PLANNING = 'PLANNING',
  READY = 'READY',
  LOADING = 'LOADING',
  LOADED = 'LOADED',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum PackageStatus {
  PENDING = 'PENDING',
  PLACED = 'PLACED',
  UNPLACEABLE = 'UNPLACEABLE',
  LOADED = 'LOADED',
}

export enum VehicleType {
  SEMI_TRAILER = 'SEMI_TRAILER',
  BOX_TRUCK = 'BOX_TRUCK',
  CONTAINER_20FT = 'CONTAINER_20FT',
  CONTAINER_40FT = 'CONTAINER_40FT',
  REFRIGERATED = 'REFRIGERATED',
  FLATBED = 'FLATBED',
  CUSTOM = 'CUSTOM',
}

export enum AuditAction {
  LOAD_CREATED = 'LOAD_CREATED',
  LOAD_UPDATED = 'LOAD_UPDATED',
  LOAD_STATUS_CHANGED = 'LOAD_STATUS_CHANGED',
  PACKAGE_ADDED = 'PACKAGE_ADDED',
  PACKAGE_MOVED = 'PACKAGE_MOVED',
  PACKAGE_ROTATED = 'PACKAGE_ROTATED',
  PACKAGE_REMOVED = 'PACKAGE_REMOVED',
  PACKAGE_PLACED = 'PACKAGE_PLACED',
  AUTO_PACK_STARTED = 'AUTO_PACK_STARTED',
  AUTO_PACK_COMPLETED = 'AUTO_PACK_COMPLETED',
  TRAILER_CHANGED = 'TRAILER_CHANGED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  VALIDATION_PASSED = 'VALIDATION_PASSED',
  USER_JOINED_LOAD = 'USER_JOINED_LOAD',
  USER_LEFT_LOAD = 'USER_LEFT_LOAD',
  CONFLICT_DETECTED = 'CONFLICT_DETECTED',
  LOAD_FINALIZED = 'LOAD_FINALIZED',
}

export enum ErrorCode {
  PACKAGE_COLLISION = 'PACKAGE_COLLISION',
  PACKAGE_OUTSIDE_TRAILER = 'PACKAGE_OUTSIDE_TRAILER',
  TRAILER_WEIGHT_EXCEEDED = 'TRAILER_WEIGHT_EXCEEDED',
  PACKAGE_TOO_LARGE = 'PACKAGE_TOO_LARGE',
  INVALID_ROTATION = 'INVALID_ROTATION',
  PACKAGE_NOT_SUPPORTED = 'PACKAGE_NOT_SUPPORTED',
  NON_STACKABLE = 'NON_STACKABLE',
  DOOR_CLEARANCE_FAILED = 'DOOR_CLEARANCE_FAILED',
  LOAD_CONFLICT = 'LOAD_CONFLICT',
  STALE_LOAD_VERSION = 'STALE_LOAD_VERSION',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

// ============================================================
// GEOMETRY TYPES
// ============================================================

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Dimensions3D {
  length: number; // mm, X axis
  width: number;  // mm, Y axis
  height: number; // mm, Z axis
}

export interface BoundingBox {
  min: Vector3;
  max: Vector3;
}

/** 6 possible axis-aligned orientations of a box */
export type RotationIndex = 0 | 1 | 2 | 3 | 4 | 5;

export interface Placement {
  x: number; // mm from front-left-bottom corner of trailer interior
  y: number;
  z: number;
  rotationIndex: RotationIndex;
}

// ============================================================
// TRAILER TYPES
// ============================================================

export interface TrailerDimensions {
  interiorLength: number; // mm
  interiorWidth: number;  // mm
  interiorHeight: number; // mm
  doorWidth: number;      // mm
  doorHeight: number;     // mm
  maxPayloadKg: number;
}

// ============================================================
// DOMAIN DTOs
// ============================================================

export interface UserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  organizationId: string;
  createdAt: string;
}

export interface OrganizationDto {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface VehicleDto {
  id: string;
  organizationId: string;
  name: string;
  type: VehicleType;
  registrationNumber?: string;
  interiorLength: number;
  interiorWidth: number;
  interiorHeight: number;
  maxPayloadKg: number;
  doorWidth: number;
  doorHeight: number;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PackageDefinitionDto {
  id: string;
  organizationId: string;
  packageNumber: string;
  sku?: string;
  name: string;
  description?: string;
  length: number; // mm
  width: number;  // mm
  height: number; // mm
  weightKg: number;
  isFragile: boolean;
  isHazardous: boolean;
  isStackable: boolean;
  requiresUprightOrientation: boolean;
  requiresFloorSupport: boolean;
  allowedRotations: RotationIndex[];
  maxStackWeightKg?: number;
  barcode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoadDto {
  id: string;
  loadNumber: string;
  organizationId: string;
  vehicleId: string;
  vehicle?: VehicleDto;
  status: LoadStatus;
  version: number;
  createdById: string;
  assignedDriverId?: string;
  origin?: string;
  destination?: string;
  plannedLoadingDate?: string;
  notes?: string;
  totalWeightKg: number;
  totalVolumeMm3: number;
  weightUtilizationPct: number;
  volumeUtilizationPct: number;
  packageCount: number;
  validationPassed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoadPackageDto {
  id: string;
  loadId: string;
  packageDefinitionId: string;
  packageDefinition?: PackageDefinitionDto;
  quantity: number;
  stopSequence?: number;
  priority: number;
  notes?: string;
  status: PackageStatus;
  placements: PlacementDto[];
}

export interface PlacementDto {
  id: string;
  loadId: string;
  loadPackageId: string;
  x: number;
  y: number;
  z: number;
  rotationIndex: RotationIndex;
  createdById: string;
  updatedById: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// VALIDATION TYPES
// ============================================================

export interface ValidationIssue {
  code: ErrorCode;
  severity: 'error' | 'warning';
  message: string;
  packageId?: string;
  conflictingPackageId?: string;
  details?: Record<string, unknown>;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  dimensionsValid: boolean;
  weightValid: boolean;
  collisionFree: boolean;
  allSupported: boolean;
  stackabilityValid: boolean;
  doorClearanceValid: boolean;
  weightDistribution?: WeightDistribution;
  deliveryAccessibilityWarnings: number;
}

export interface WeightDistribution {
  totalWeightKg: number;
  centerOfGravity: Vector3; // mm from trailer origin
  weightUtilizationPct: number;
  frontRearRatio: number; // 0-1, 0.5 = perfectly balanced front-rear
  leftRightRatio: number; // 0-1, 0.5 = perfectly balanced L-R
}

// ============================================================
// PACKING TYPES
// ============================================================

export interface PackingRequest {
  loadId: string;
  vehicleId: string;
  trailer: TrailerDimensions;
  packages: PackingPackage[];
  strategy?: 'GREEDY' | 'BFD' | 'GENETIC';
}

export interface PackingPackage {
  loadPackageId: string;
  packageDefinitionId: string;
  length: number;
  width: number;
  height: number;
  weightKg: number;
  isFragile: boolean;
  isStackable: boolean;
  requiresUprightOrientation: boolean;
  requiresFloorSupport: boolean;
  allowedRotations: RotationIndex[];
  maxStackWeightKg?: number;
  stopSequence?: number;
  priority: number;
}

export interface PackingResult {
  success: boolean;
  placements: PackingPlacement[];
  unplaced: UnplacedPackage[];
  volumeUtilizationPct: number;
  weightUtilizationPct: number;
  weightDistribution: WeightDistribution;
  warnings: ValidationIssue[];
  durationMs: number;
}

export interface PackingPlacement {
  loadPackageId: string;
  x: number;
  y: number;
  z: number;
  rotationIndex: RotationIndex;
  effectiveDimensions: Dimensions3D;
}

export interface UnplacedPackage {
  loadPackageId: string;
  reason: string;
  code: ErrorCode;
}

// ============================================================
// WEBSOCKET EVENTS
// ============================================================

export const WS_EVENTS = {
  // Client -> Server
  JOIN_LOAD: 'joinLoad',
  LEAVE_LOAD: 'leaveLoad',
  // Server -> Client
  LOAD_UPDATED: 'load.updated',
  PACKAGE_ADDED: 'package.added',
  PACKAGE_MOVED: 'package.moved',
  PACKAGE_ROTATED: 'package.rotated',
  PACKAGE_REMOVED: 'package.removed',
  PLACEMENT_ADDED: 'placement.added',
  PLACEMENT_UPDATED: 'placement.updated',
  PLACEMENT_REMOVED: 'placement.removed',
  LOAD_CONFLICT: 'load.conflict',
  PACKING_STARTED: 'packing.started',
  PACKING_PROGRESS: 'packing.progress',
  PACKING_COMPLETED: 'packing.completed',
  USER_JOINED: 'user.joined',
  USER_LEFT: 'user.left',
  VALIDATION_UPDATED: 'validation.updated',
  ERROR: 'error',
} as const;

export type WsEventName = typeof WS_EVENTS[keyof typeof WS_EVENTS];

export interface WsPackingProgress {
  loadId: string;
  progress: number; // 0-100
  message: string;
}

export interface WsConflictPayload {
  loadId: string;
  currentVersion: number;
  message: string;
}

// ============================================================
// API RESPONSE WRAPPERS
// ============================================================

export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================
// AUTH TYPES
// ============================================================

export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
}

export interface JwtPayload {
  sub: string;        // userId
  email: string;
  role: UserRole;
  orgId: string;      // organizationId
  iat?: number;
  exp?: number;
}

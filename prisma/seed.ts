import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding CargoFlow database...');

  const org = await prisma.organization.upsert({
    where: { slug: 'demo-cargoflow' },
    update: {},
    create: { name: 'CargoFlow Demo', slug: 'demo-cargoflow' },
  });

  const adminHash = await argon2.hash('Admin123!');
  const plannerHash = await argon2.hash('Planner123!');
  const driverHash = await argon2.hash('Driver123!');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@cargoflow.demo' },
    update: {},
    create: { email: 'admin@cargoflow.demo', passwordHash: adminHash, firstName: 'Alex', lastName: 'Admin' },
  });
  const planner = await prisma.user.upsert({
    where: { email: 'planner@cargoflow.demo' },
    update: {},
    create: { email: 'planner@cargoflow.demo', passwordHash: plannerHash, firstName: 'Pat', lastName: 'Planner' },
  });
  const driver = await prisma.user.upsert({
    where: { email: 'driver@cargoflow.demo' },
    update: {},
    create: { email: 'driver@cargoflow.demo', passwordHash: driverHash, firstName: 'Dave', lastName: 'Driver' },
  });

  await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: admin.id } },
    update: {},
    create: { organizationId: org.id, userId: admin.id, role: 'ORG_ADMIN' },
  });
  await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: planner.id } },
    update: {},
    create: { organizationId: org.id, userId: planner.id, role: 'PLANNER' },
  });
  await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: driver.id } },
    update: {},
    create: { organizationId: org.id, userId: driver.id, role: 'DRIVER' },
  });

  // Vehicles
  const semiTrailer = await prisma.vehicle.create({
    data: {
      organizationId: org.id,
      name: 'Standard Semi-Trailer (13.6m)',
      type: 'SEMI_TRAILER',
      registrationNumber: 'EU-TRL-001',
      interiorLength: 13600, interiorWidth: 2450, interiorHeight: 2700,
      maxPayloadKg: 24000,
      doorWidth: 2400, doorHeight: 2600,
      description: 'Standard European 13.6m curtainsider trailer',
    },
  });

  await prisma.vehicle.create({
    data: {
      organizationId: org.id,
      name: '7.5t Box Truck',
      type: 'BOX_TRUCK',
      registrationNumber: 'EU-TRK-002',
      interiorLength: 6200, interiorWidth: 2200, interiorHeight: 2100,
      maxPayloadKg: 4000,
      doorWidth: 2100, doorHeight: 2000,
      description: '7.5 tonne box truck for urban deliveries',
    },
  });

  await prisma.vehicle.create({
    data: {
      organizationId: org.id,
      name: '40ft ISO Container',
      type: 'CONTAINER_40FT',
      registrationNumber: 'CONT-40-003',
      interiorLength: 12032, interiorWidth: 2350, interiorHeight: 2390,
      maxPayloadKg: 28000,
      doorWidth: 2340, doorHeight: 2280,
      description: 'Standard 40ft ISO shipping container',
    },
  });

  // Package definitions
  const pkgData = [
    { name: 'Euro Pallet Heavy', sku: 'PLT-EUR-H', length: 1200, width: 800, height: 1000, weightKg: 500, isStackable: true, allowedRotations: [0, 2] },
    { name: 'Euro Pallet Light', sku: 'PLT-EUR-L', length: 1200, width: 800, height: 1200, weightKg: 250, isStackable: true, allowedRotations: [0, 2] },
    { name: 'Half Pallet', sku: 'PLT-HALF', length: 600, width: 800, height: 800, weightKg: 150, isStackable: true, allowedRotations: [0, 2] },
    { name: 'Small Carton', sku: 'CTN-SM', length: 400, width: 300, height: 300, weightKg: 12, isStackable: true, allowedRotations: [0, 1, 2, 3, 4, 5] },
    { name: 'Large Carton', sku: 'CTN-LG', length: 600, width: 400, height: 400, weightKg: 35, isStackable: true, allowedRotations: [0, 1, 2, 3, 4, 5] },
    { name: 'Fragile Glass Pallet', sku: 'PLT-GLS', length: 1200, width: 800, height: 1500, weightKg: 600, isStackable: false, isFragile: true, requiresUprightOrientation: true, allowedRotations: [0] },
    { name: 'Machine Part', sku: 'MCH-001', length: 2000, width: 800, height: 600, weightKg: 800, isStackable: false, allowedRotations: [0, 2] },
    { name: 'Drum 200L (Hazmat)', sku: 'DRM-200', length: 580, width: 580, height: 900, weightKg: 200, isStackable: false, isHazardous: true, requiresUprightOrientation: true, allowedRotations: [0] },
  ];

  const createdPkgs = [];
  for (let i = 0; i < pkgData.length; i++) {
    const d = pkgData[i] as typeof pkgData[0] & { isFragile?: boolean; isHazardous?: boolean; requiresUprightOrientation?: boolean };
    const pkg = await prisma.packageDefinition.create({
      data: {
        organizationId: org.id,
        packageNumber: `PKG-${String(i + 1).padStart(4, '0')}`,
        name: d.name,
        sku: d.sku,
        length: d.length,
        width: d.width,
        height: d.height,
        weightKg: d.weightKg,
        isStackable: d.isStackable,
        isFragile: d.isFragile ?? false,
        isHazardous: d.isHazardous ?? false,
        requiresUprightOrientation: d.requiresUprightOrientation ?? false,
        requiresFloorSupport: false,
        allowedRotations: d.allowedRotations,
      },
    });
    createdPkgs.push(pkg);
  }

  // Demo load
  const demoLoad = await prisma.load.create({
    data: {
      loadNumber: 'LOAD-00001',
      organizationId: org.id,
      vehicleId: semiTrailer.id,
      createdById: admin.id,
      assignedDriverId: driver.id,
      status: 'PLANNING',
      origin: 'Hamburg, Germany',
      destination: 'Amsterdam, Netherlands',
      notes: 'Demo load for CargoFlow platform development',
    },
  });

  await prisma.loadPackage.createMany({
    data: [
      { loadId: demoLoad.id, packageDefinitionId: createdPkgs[0].id, quantity: 5, stopSequence: 2, priority: 5 },
      { loadId: demoLoad.id, packageDefinitionId: createdPkgs[1].id, quantity: 4, stopSequence: 1, priority: 7 },
      { loadId: demoLoad.id, packageDefinitionId: createdPkgs[3].id, quantity: 20, stopSequence: 2, priority: 3 },
      { loadId: demoLoad.id, packageDefinitionId: createdPkgs[5].id, quantity: 2, stopSequence: 1, priority: 9 },
      { loadId: demoLoad.id, packageDefinitionId: createdPkgs[6].id, quantity: 1, stopSequence: 2, priority: 6 },
    ],
  });

  // Update load totals
  const loadPackages = await prisma.loadPackage.findMany({
    where: { loadId: demoLoad.id },
    include: { packageDefinition: true },
  });
  const totalWeightKg = loadPackages.reduce((s, lp) => s + lp.packageDefinition.weightKg * lp.quantity, 0);
  const totalVolumeMm3 = loadPackages.reduce((s, lp) => s + lp.packageDefinition.length * lp.packageDefinition.width * lp.packageDefinition.height * lp.quantity, 0);
  const packageCount = loadPackages.reduce((s, lp) => s + lp.quantity, 0);
  const trailerVolume = semiTrailer.interiorLength * semiTrailer.interiorWidth * semiTrailer.interiorHeight;

  await prisma.load.update({
    where: { id: demoLoad.id },
    data: {
      totalWeightKg,
      totalVolumeMm3,
      packageCount,
      weightUtilizationPct: (totalWeightKg / semiTrailer.maxPayloadKg) * 100,
      volumeUtilizationPct: (totalVolumeMm3 / trailerVolume) * 100,
    },
  });

  console.log('\n✅ Seed complete!');
  console.log('─────────────────────────────────');
  console.log('Demo accounts:');
  console.log('  admin@cargoflow.demo   / Admin123!');
  console.log('  planner@cargoflow.demo / Planner123!');
  console.log('  driver@cargoflow.demo  / Driver123!');
  console.log('─────────────────────────────────');
  console.log(`Organization: ${org.name} (${org.slug})`);
  console.log(`Demo load: LOAD-00001 with ${packageCount} packages`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());


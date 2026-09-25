import { describe, it, expect, beforeAll } from 'vitest';

const API_URL = process.env.API_URL || 'http://localhost:3001/api';

describe('CargoFlow End-to-End Platform Flow Tests', { timeout: 30000 }, () => {
  let authToken: string;
  let organizationId: string;
  let vehicleId: string;
  let packageDefId: string;
  let loadId: string;
  let loadPackageId: string;

  const testUser = {
    email: `e2e_tester_${Date.now()}@cargoflow-test.io`,
    password: 'Password123!',
    firstName: 'E2E',
    lastName: 'Runner',
    organizationName: 'Global Freight Test Org',
  };

  it('1. Successfully checks API health status', async () => {
    const res = await fetch(`${API_URL}/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.service).toBe('cargoflow-api');
  });

  it('2. Registers a new organization admin user', async () => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.accessToken).toBeDefined();
    authToken = data.accessToken;
  });

  it('3. Fetches authenticated user and organization profile', async () => {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(res.status).toBe(200);
    const user = await res.json();
    expect(user.email).toBe(testUser.email);
    expect(user.role).toBe('ORG_ADMIN');
    expect(user.orgId).toBeDefined();
    organizationId = user.orgId;
  });

  it('4. Creates a customizable trailer/vehicle', async () => {
    const res = await fetch(`${API_URL}/vehicles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: 'Mega Trailer 13.6m',
        type: 'SEMI_TRAILER',
        interiorLength: 13600,
        interiorWidth: 2450,
        interiorHeight: 2700,
        maxPayloadKg: 24000,
        doorWidth: 2400,
        doorHeight: 2600,
        description: 'Standard European curtain-side semi trailer',
      }),
    });

    expect(res.status).toBe(201);
    const vehicle = await res.json();
    expect(vehicle.id).toBeDefined();
    expect(vehicle.interiorLength).toBe(13600);
    vehicleId = vehicle.id;
  });

  it('5. Creates a cargo package definition with handling constraints', async () => {
    const res = await fetch(`${API_URL}/package-definitions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: 'Euro Pallet (Heavy Machinery)',
        sku: 'EP-HEAVY-01',
        length: 1200,
        width: 800,
        height: 1400,
        weightKg: 650,
        isFragile: false,
        isStackable: true,
        allowedRotations: [0, 2], // allow yaw rotation only
      }),
    });

    expect(res.status).toBe(201);
    const pkg = await res.json();
    expect(pkg.id).toBeDefined();
    expect(pkg.weightKg).toBe(650);
    packageDefId = pkg.id;
  });

  it('6. Creates a new load shipment assigned to the vehicle', async () => {
    const res = await fetch(`${API_URL}/loads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        vehicleId,
        origin: 'Munich Logistics Hub',
        destination: 'Rotterdam Sea Port',
        notes: 'Priority industrial export consignment',
      }),
    });

    expect(res.status).toBe(201);
    const load = await res.json();
    expect(load.id).toBeDefined();
    expect(load.status).toBe('DRAFT');
    expect(load.version).toBe(1);
    loadId = load.id;
  });

  it('7. Adds cargo items to the load shipment', async () => {
    const res = await fetch(`${API_URL}/loads/${loadId}/packages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        packageDefinitionId: packageDefId,
        quantity: 4,
        priority: 8,
      }),
    });

    expect(res.status).toBe(201);
    const loadPackage = await res.json();
    expect(loadPackage.id).toBeDefined();
    loadPackageId = loadPackage.id;
  });

  it('8. Validates and executes 3D package placement inside trailer', async () => {
    const res = await fetch(`${API_URL}/loads/${loadId}/placements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        loadPackageId,
        x: 0,
        y: 0,
        z: 0,
        rotationIndex: 0,
        loadVersion: 1,
      }),
    });

    expect(res.status).toBe(201);
    const placement = await res.json();
    expect(placement.id).toBeDefined();
    expect(placement.x).toBe(0);
    expect(placement.y).toBe(0);
    expect(placement.z).toBe(0);
  });

  it('9. Rejects out-of-bounds placement extending beyond trailer length', async () => {
    const res = await fetch(`${API_URL}/loads/${loadId}/placements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        loadPackageId,
        x: 20000, // extends past 13600mm
        y: 0,
        z: 0,
        rotationIndex: 0,
        loadVersion: 2,
      }),
    });

    expect(res.status).toBe(400);
    const err = await res.json();
    expect(err.message).toContain('trailer boundaries');
  });

  it('10. Calculates comprehensive load validation & weight distribution', async () => {
    const res = await fetch(`${API_URL}/loads/${loadId}/validation`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(res.status).toBe(200);
    const validation = await res.json();
    expect(validation.isValid).toBe(true);
    expect(validation.collisionFree).toBe(true);
    expect(validation.weightDistribution).toBeDefined();
    expect(validation.weightDistribution.totalWeightKg).toBeGreaterThan(0);
  });

  it('11. Executes auto-pack optimization algorithm', async () => {
    const res = await fetch(`${API_URL}/loads/${loadId}/auto-pack`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ strategy: 'GREEDY' }),
    });

    expect(res.status).toBe(201);
    const result = await res.json();
    expect(result.id).toBe(loadId);
    expect(result.placements).toBeDefined();
    expect(result.volumeUtilizationPct).toBeGreaterThan(0);
  });

  it('12. Generates reversed LIFO loading sequence for warehouse operators', async () => {
    const res = await fetch(`${API_URL}/loads/${loadId}/sequence`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(res.status).toBe(200);
    const sequence = await res.json();
    expect(Array.isArray(sequence)).toBe(true);
    expect(sequence.length).toBeGreaterThan(0);
    expect(sequence[0].sequenceOrder).toBe(1);
  });

  it('13. Invites a new team member and manages organization roles', async () => {
    const inviteEmail = `dispatcher_${Date.now()}@cargoflow-test.io`;
    const res = await fetch(`${API_URL}/organization/members/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        email: inviteEmail,
        firstName: 'Alex',
        lastName: 'Dispatcher',
        role: 'DISPATCHER',
      }),
    });

    expect(res.status).toBe(201);
    const member = await res.json();
    expect(member.role).toBe('DISPATCHER');
    expect(member.user.email).toBe(inviteEmail);
  });
});

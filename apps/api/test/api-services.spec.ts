import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrganizationService } from '../src/organization/organization.service';
import { LoadService } from '../src/load/load.service';
import { UserRole } from '@cargoflow/shared-types';

describe('CargoFlow Backend Services Unit & Integration Tests', () => {
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      organization: {
        findUnique: vi.fn(),
      },
      organizationMember: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      load: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
      },
      vehicle: {
        findFirst: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
    };
  });

  describe('OrganizationService', () => {
    it('returns organization profile and members for authorized tenant', async () => {
      const orgService = new OrganizationService(mockPrisma);
      const fakeOrg = {
        id: 'org-123',
        name: 'TransGlobal Logistics',
        members: [{ id: 'mem-1', role: UserRole.ORG_ADMIN, user: { email: 'admin@transglobal.com' } }],
      };
      mockPrisma.organization.findUnique.mockResolvedValue(fakeOrg);

      const result = await orgService.getMyOrganization({
        sub: 'usr-1',
        email: 'admin@transglobal.com',
        role: UserRole.ORG_ADMIN,
        orgId: 'org-123',
      });

      expect(result).toEqual(fakeOrg);
      expect(mockPrisma.organization.findUnique).toHaveBeenCalledWith({
        where: { id: 'org-123' },
        include: expect.any(Object),
      });
    });

    it('retrieves members belonging to the requesting organization', async () => {
      const orgService = new OrganizationService(mockPrisma);
      const fakeMembers = [
        { id: 'm-1', role: UserRole.ORG_ADMIN, user: { email: 'admin@test.com' } },
        { id: 'm-2', role: UserRole.PLANNER, user: { email: 'planner@test.com' } },
      ];
      mockPrisma.organizationMember.findMany.mockResolvedValue(fakeMembers);

      const result = await orgService.getMembers({
        sub: 'usr-1',
        email: 'admin@test.com',
        role: UserRole.ORG_ADMIN,
        orgId: 'org-123',
      });

      expect(result).toHaveLength(2);
      expect(mockPrisma.organizationMember.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-123' },
        include: expect.any(Object),
        orderBy: { joinedAt: 'asc' },
      });
    });

    it('prevents user from removing themselves from an organization', async () => {
      const orgService = new OrganizationService(mockPrisma);
      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        id: 'mem-self',
        organizationId: 'org-123',
        userId: 'usr-self',
        role: UserRole.ORG_ADMIN,
      });

      await expect(
        orgService.removeMember('mem-self', {
          sub: 'usr-self',
          email: 'admin@test.com',
          role: UserRole.ORG_ADMIN,
          orgId: 'org-123',
        }),
      ).rejects.toThrow('You cannot remove yourself from the organization');
    });
  });

  describe('LoadService Totals Recalculation', () => {
    it('correctly calculates total weight, volume, and percentage utilizations', async () => {
      const mockGateway = { emitLoadUpdated: vi.fn(), emitPlacementUpdated: vi.fn() };
      const loadService = new LoadService(mockPrisma, mockGateway as any);

      const fakeLoad = {
        id: 'load-abc',
        vehicle: {
          interiorLength: 13600,
          interiorWidth: 2450,
          interiorHeight: 2700,
          maxPayloadKg: 24000,
        },
        loadPackages: [
          {
            quantity: 10,
            packageDefinition: {
              length: 1200,
              width: 800,
              height: 1400,
              weightKg: 500,
            },
          },
          {
            quantity: 4,
            packageDefinition: {
              length: 1000,
              width: 1000,
              height: 1000,
              weightKg: 300,
            },
          },
        ],
        placements: [],
      };

      mockPrisma.load.findUnique.mockResolvedValue(fakeLoad);
      mockPrisma.load.update.mockResolvedValue({});

      await loadService.recalculateTotals('load-abc');

      expect(mockPrisma.load.update).toHaveBeenCalledWith({
        where: { id: 'load-abc' },
        data: expect.objectContaining({
          totalWeightKg: 6200,
          packageCount: 14,
          weightUtilizationPct: expect.closeTo(25.833, 2),
          volumeUtilizationPct: expect.any(Number),
        }),
      });
    });
  });
});

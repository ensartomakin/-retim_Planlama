/**
 * Dummy veri seed'i — Faz 1.
 * Mikro ERP bağlandığında devre dışı bırakılabilir; yalnızca developer/demo ortamı için.
 */
import { PrismaClient, RoleCode, ModelStatus, OrderStatus, MaterialType, SampleStatus } from '@prisma/client';

const prisma = new PrismaClient();

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL ?? 'you@company.com';
const SUPER_ADMIN_NAME = process.env.SUPER_ADMIN_NAME ?? 'Sistem Sahibi';

async function main() {
  console.log('→ Rollar');
  const roleCodes: RoleCode[] = ['super_admin', 'tasarim', 'modalist', 'planlama', 'satinalma', 'uretim'];
  const roles = await Promise.all(
    roleCodes.map((code) =>
      prisma.role.upsert({
        where: { code },
        update: {},
        create: { code, name: humanRole(code) },
      }),
    ),
  );
  const roleByCode = Object.fromEntries(roles.map((r) => [r.code, r]));

  console.log('→ Super Admin');
  const admin = await prisma.user.upsert({
    where: { email: SUPER_ADMIN_EMAIL },
    update: {},
    create: {
      email: SUPER_ADMIN_EMAIL,
      fullName: SUPER_ADMIN_NAME,
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: roleByCode.super_admin!.id } },
    update: {},
    create: { userId: admin.id, roleId: roleByCode.super_admin!.id },
  });

  console.log('→ Demo kullanıcılar');
  const demoUsers = [
    { email: 'tasarim@demo.local', name: 'Emre Aydın', roles: ['tasarim'] as RoleCode[] },
    { email: 'ayse@demo.local', name: 'Ayşe Kaya', roles: ['modalist'] as RoleCode[] },
    { email: 'seda@demo.local', name: 'Seda Yıldız', roles: ['planlama'] as RoleCode[] },
    { email: 'mehmet@demo.local', name: 'Mehmet Er', roles: ['satinalma'] as RoleCode[] },
    { email: 'atolye@demo.local', name: 'Fatma Güneş', roles: ['uretim'] as RoleCode[] },
    { email: 'cift@demo.local', name: 'Çift Rol (Tasarım+Modalist)', roles: ['tasarim', 'modalist'] as RoleCode[] },
  ];

  const users: Record<string, { id: string }> = { admin };
  for (const u of demoUsers) {
    const created = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { email: u.email, fullName: u.name },
    });
    users[u.email] = created;
    for (const r of u.roles) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: created.id, roleId: roleByCode[r]!.id } },
        update: {},
        create: { userId: created.id, roleId: roleByCode[r]!.id },
      });
    }
  }

  console.log('→ Referans veriler');
  const [acme, nova, loom] = await Promise.all([
    prisma.customer.upsert({ where: { code: 'ACME' }, update: {}, create: { code: 'ACME', name: 'Acme Tekstil' } }),
    prisma.customer.upsert({ where: { code: 'NOVA' }, update: {}, create: { code: 'NOVA', name: 'Nova Fashion' } }),
    prisma.customer.upsert({ where: { code: 'LOOM' }, update: {}, create: { code: 'LOOM', name: 'Loom Apparel' } }),
  ]);

  const [ss26, aw26] = await Promise.all([
    prisma.season.upsert({
      where: { code: 'SS26' },
      update: {},
      create: { code: 'SS26', startsAt: new Date('2026-02-01'), endsAt: new Date('2026-07-31') },
    }),
    prisma.season.upsert({
      where: { code: 'AW26' },
      update: {},
      create: { code: 'AW26', startsAt: new Date('2026-08-01'), endsAt: new Date('2027-01-31') },
    }),
  ]);

  const colors = await Promise.all([
    { code: 'PTN-RED-01', name: 'Kırmızı', hex: '#C0392B' },
    { code: 'PTN-BLU-01', name: 'Lacivert', hex: '#1F3A5F' },
    { code: 'PTN-BLK-01', name: 'Siyah', hex: '#111111' },
    { code: 'PTN-WHT-01', name: 'Beyaz', hex: '#F5F5F5' },
  ].map((c) => prisma.color.upsert({ where: { code: c.code }, update: {}, create: c })));

  const sizes = await Promise.all(
    ['XS', 'S', 'M', 'L', 'XL'].map((code, i) =>
      prisma.size.upsert({ where: { code }, update: {}, create: { code, orderIndex: i + 1 } }),
    ),
  );

  const workshops = await Promise.all([
    prisma.workshop.upsert({
      where: { code: 'ATL-A' },
      update: {},
      create: { code: 'ATL-A', name: 'Atölye A — Dikim', dailyCapacityPcs: 1500, maxBatchPcs: 500 },
    }),
    prisma.workshop.upsert({
      where: { code: 'ATL-B' },
      update: {},
      create: { code: 'ATL-B', name: 'Atölye B — Kesim', dailyCapacityPcs: 1000, maxBatchPcs: 500 },
    }),
    prisma.workshop.upsert({
      where: { code: 'ATL-C' },
      update: {},
      create: { code: 'ATL-C', name: 'Atölye C — Karma', dailyCapacityPcs: 800, maxBatchPcs: 400 },
    }),
  ]);

  const suppliers = await Promise.all([
    prisma.supplier.upsert({ where: { code: 'TED-001' }, update: {}, create: { code: 'TED-001', name: 'İplik A.Ş.' } }),
    prisma.supplier.upsert({ where: { code: 'TED-002' }, update: {}, create: { code: 'TED-002', name: 'Kumaş Dünyası' } }),
    prisma.supplier.upsert({ where: { code: 'TED-003' }, update: {}, create: { code: 'TED-003', name: 'Aksesuar Ltd.' } }),
  ]);

  console.log('→ Malzemeler + stok');
  const materials = await Promise.all(
    [
      { code: 'IPLK-KIRMIZI-20/2', name: 'Kırmızı İplik 20/2', type: MaterialType.iplik, uom: 'kg', sup: suppliers[0] },
      { code: 'KMS-PAMUK-1x1', name: 'Pamuk Süprem 1x1', type: MaterialType.kumas, uom: 'm', sup: suppliers[1] },
      { code: 'AKS-DUGME-12mm', name: 'Düğme 12mm', type: MaterialType.aksesuar, uom: 'adet', sup: suppliers[2] },
      { code: 'ETK-BOYUN-LOGO', name: 'Boyun Etiketi Logo', type: MaterialType.etiket, uom: 'adet', sup: suppliers[2] },
    ].map(async (m) => {
      const mat = await prisma.material.upsert({
        where: { code: m.code },
        update: {},
        create: {
          code: m.code,
          name: m.name,
          type: m.type,
          uom: m.uom,
          supplierDefaultId: m.sup.id,
        },
      });
      await prisma.stock.upsert({
        where: { materialId: mat.id },
        update: {},
        create: {
          materialId: mat.id,
          qtyOnHand: m.code === 'IPLK-KIRMIZI-20/2' ? 50 : 2000,
          qtyReserved: 0,
        },
      });
      return mat;
    }),
  );

  console.log('→ Modeller');
  const model1 = await prisma.model.upsert({
    where: { code: 'SS26-GML-001' },
    update: {},
    create: {
      code: 'SS26-GML-001',
      name: 'Kadın Gömlek Klasik',
      customerId: acme.id,
      seasonId: ss26.id,
      category: 'Gömlek',
      designerId: users['tasarim@demo.local']!.id,
      dueDate: new Date('2026-05-15'),
      status: ModelStatus.ONAYLANDI,
    },
  });
  await prisma.sample.create({
    data: {
      modelId: model1.id,
      fabricNote: 'Pamuk süprem 1x1, 180 gr',
      accessoryNote: 'Düğme 12mm x 7 adet',
      qualityNote: 'OEKO-TEX',
      criticalNotes: 'Kırmızı iplik kritik stok',
      status: SampleStatus.OK,
    },
  });

  const pattern1 = await prisma.pattern.create({
    data: {
      modelId: model1.id,
      assignedTo: users['ayse@demo.local']!.id,
      startedAt: new Date('2026-03-20'),
      totalRevisions: 2,
    },
  });
  for (const v of [1, 2]) {
    await prisma.patternVersion.create({
      data: {
        patternId: pattern1.id,
        versionNo: v,
        note: `Revize ${v}`,
        createdBy: users['ayse@demo.local']!.id,
      },
    });
  }

  const bom1 = await prisma.bom.create({
    data: {
      modelId: model1.id,
      version: 1,
      isActive: true,
      createdBy: users['tasarim@demo.local']!.id,
      items: {
        create: [
          { materialId: materials[0]!.id, qtyPerUnit: 0.15, uom: 'kg', wastePct: 5 },
          { materialId: materials[1]!.id, qtyPerUnit: 1.8, uom: 'm', wastePct: 8 },
          { materialId: materials[2]!.id, qtyPerUnit: 7, uom: 'adet', wastePct: 2 },
          { materialId: materials[3]!.id, qtyPerUnit: 1, uom: 'adet', wastePct: 0 },
        ],
      },
    },
  });

  console.log('→ Sipariş (malzeme bekleyen örnek)');
  const order1 = await prisma.order.create({
    data: {
      code: 'SO-2026-000181',
      modelId: model1.id,
      workshopId: workshops[0]!.id,
      totalQty: 1200,
      dueDate: new Date('2026-05-15'),
      status: OrderStatus.MALZEME_BEKLIYOR,
      createdBy: users['seda@demo.local']!.id,
      variants: {
        create: crossJoin(colors.slice(0, 3), sizes.slice(1, 5)).map(([c, s]) => ({
          colorId: c.id,
          sizeId: s.id,
          qty: 100,
        })),
      },
    },
  });

  await prisma.purchaseRequest.create({
    data: {
      code: 'PR-2026-000041',
      orderId: order1.id,
      supplierId: suppliers[0]!.id,
      status: 'TASLAK',
      dueDate: new Date('2026-04-25'),
      createdBy: users['mehmet@demo.local']!.id,
      items: {
        create: [
          { materialId: materials[0]!.id, qty: 130, note: '1200 adet için kırmızı iplik' },
        ],
      },
    },
  });

  console.log('→ Audit örneği');
  await prisma.auditLog.create({
    data: {
      userId: users['seda@demo.local']!.id,
      entity: 'order',
      entityId: order1.id,
      action: 'transition',
      afterJson: { from: 'BOM_DOGRULAMA', to: 'MALZEME_BEKLIYOR', reason: 'auto' },
    },
  });

  console.log('✓ Seed tamamlandı.');
}

function crossJoin<A, B>(a: A[], b: B[]): [A, B][] {
  return a.flatMap((x) => b.map<[A, B]>((y) => [x, y]));
}

function humanRole(code: RoleCode): string {
  const map: Record<RoleCode, string> = {
    super_admin: 'Super Admin',
    tasarim: 'Tasarım',
    modalist: 'Modalist',
    planlama: 'Planlama',
    satinalma: 'Satın Alma',
    uretim: 'Üretim / Atölye',
  };
  return map[code];
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

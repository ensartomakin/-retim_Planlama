import { prisma } from '@tekstil/db';

export const dynamic = 'force-dynamic';

export default async function BomPage() {
  const boms = await prisma.bom.findMany({
    where: { isActive: true },
    include: {
      model: { select: { code: true, name: true } },
      items: { include: { material: { select: { name: true, type: true, uom: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold">Reçeteler (BOM)</h1>
        <span className="text-sm text-ink-3">{boms.length} aktif reçete</span>
      </div>

      <div className="flex flex-col gap-4">
        {boms.map((bom) => (
          <div key={bom.id} className="card">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-sm">{bom.model.code}</span>
                <span className="text-ink-3 text-sm ml-2">{bom.model.name}</span>
              </div>
              <div className="text-xs text-ink-3">
                v{bom.version} · {new Date(bom.createdAt).toLocaleDateString('tr-TR')}
              </div>
            </div>
            <div className="overflow-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    {['Malzeme', 'Tip', 'Birim/Parça', 'Birim', 'Fire %'].map((h) => (
                      <th key={h} className="text-left p-2.5 text-xs font-bold text-ink-2 border-b border-gray-200 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bom.items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="p-2.5 text-sm font-semibold border-b border-gray-200">{item.material.name}</td>
                      <td className="p-2.5 text-xs border-b border-gray-200">
                        <span className="chip bg-gray-100 text-gray-700">{item.material.type}</span>
                      </td>
                      <td className="p-2.5 text-sm border-b border-gray-200 font-semibold">
                        {Number(item.qtyPerUnit).toFixed(3)}
                      </td>
                      <td className="p-2.5 text-sm border-b border-gray-200">{item.uom}</td>
                      <td className="p-2.5 text-sm border-b border-gray-200 text-amber-700">
                        {item.wastePct ? `%${item.wastePct}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        {boms.length === 0 && (
          <div className="card p-8 text-center text-ink-3 text-sm">Henüz reçete yok.</div>
        )}
      </div>
    </div>
  );
}

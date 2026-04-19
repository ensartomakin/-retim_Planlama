import { prisma } from '@tekstil/db';

export const dynamic = 'force-dynamic';

export default async function StockPage() {
  const stocks = await prisma.stock.findMany({
    include: { material: { include: { defaultSupplier: { select: { name: true } } } } },
    orderBy: { material: { name: 'asc' } },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold">Stok</h1>
        <span className="text-sm text-ink-3">{stocks.length} kalem</span>
      </div>

      <div className="card overflow-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              {['Malzeme', 'Tip', 'Depo', 'Mevcut', 'Rezerve', 'Kullanılabilir', 'Birim', 'Varsayılan Tedarikçi'].map((h) => (
                <th key={h} className="text-left p-2.5 text-xs font-bold text-ink-2 border-b border-gray-200 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stocks.map((s) => {
              const available = Number(s.qtyOnHand) - Number(s.qtyReserved);
              const isCritical = available <= 0;
              return (
                <tr key={s.id} className={`hover:bg-gray-50 ${isCritical ? 'bg-red-50' : ''}`}>
                  <td className="p-2.5 text-sm font-semibold border-b border-gray-200">{s.material.name}</td>
                  <td className="p-2.5 text-xs border-b border-gray-200">
                    <span className="chip bg-gray-100 text-gray-700">{s.material.type}</span>
                  </td>
                  <td className="p-2.5 text-sm border-b border-gray-200">{s.warehouse}</td>
                  <td className="p-2.5 text-sm border-b border-gray-200">{Number(s.qtyOnHand).toFixed(2)}</td>
                  <td className="p-2.5 text-sm border-b border-gray-200 text-amber-700">{Number(s.qtyReserved).toFixed(2)}</td>
                  <td className={`p-2.5 text-sm font-bold border-b border-gray-200 ${isCritical ? 'text-red-600' : 'text-emerald-700'}`}>
                    {available.toFixed(2)}
                  </td>
                  <td className="p-2.5 text-sm border-b border-gray-200">{s.material.uom}</td>
                  <td className="p-2.5 text-sm border-b border-gray-200 text-ink-3">
                    {s.material.defaultSupplier?.name ?? '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

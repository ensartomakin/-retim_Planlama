import ExcelJS from 'exceljs';

/** Sipariş listesi için Excel workbook döner. */
export async function buildOrdersExcel(
  orders: Array<{
    code: string;
    status: string;
    totalQty: number;
    dueDate: Date | null;
    createdAt: Date;
    model: { code: string; name: string; customer: { name: string } };
    workshop: { name: string } | null;
  }>,
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Tekstil MES';
  wb.created = new Date();

  const ws = wb.addWorksheet('Siparişler', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true },
  });

  // Başlıklar
  ws.columns = [
    { header: 'Sipariş No', key: 'code', width: 20 },
    { header: 'Model Kodu', key: 'modelCode', width: 20 },
    { header: 'Model Adı', key: 'modelName', width: 30 },
    { header: 'Müşteri', key: 'customer', width: 20 },
    { header: 'Atölye', key: 'workshop', width: 20 },
    { header: 'Adet', key: 'qty', width: 12 },
    { header: 'Termin', key: 'dueDate', width: 14 },
    { header: 'Durum', key: 'status', width: 22 },
    { header: 'Oluşturma', key: 'createdAt', width: 18 },
  ];

  // Başlık stili
  ws.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    };
  });
  ws.getRow(1).height = 22;

  // Veri satırları
  for (const o of orders) {
    const row = ws.addRow({
      code: o.code,
      modelCode: o.model.code,
      modelName: o.model.name,
      customer: o.model.customer.name,
      workshop: o.workshop?.name ?? '—',
      qty: o.totalQty,
      dueDate: o.dueDate ? o.dueDate.toLocaleDateString('tr-TR') : '—',
      status: STATUS_TR[o.status] ?? o.status,
      createdAt: o.createdAt.toLocaleDateString('tr-TR'),
    });
    row.eachCell((cell) => {
      cell.alignment = { vertical: 'middle' };
      cell.border = { bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } } };
    });
    // Durum renklendirmesi
    const statusCell = row.getCell('status');
    const color = STATUS_COLOR[o.status];
    if (color) {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
    }
  }

  // Özet satır
  const totalRow = ws.addRow({
    code: 'TOPLAM',
    qty: orders.reduce((s, o) => s + o.totalQty, 0),
  });
  totalRow.font = { bold: true };
  totalRow.getCell('code').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/** Model listesi Excel */
export async function buildModelsExcel(
  models: Array<{
    code: string;
    name: string;
    status: string;
    category: string;
    dueDate: Date | null;
    createdAt: Date;
    customer: { name: string };
    season: { code: string };
    designer: { fullName: string } | null;
  }>,
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Tekstil MES';
  const ws = wb.addWorksheet('Modeller');

  ws.columns = [
    { header: 'Kod', key: 'code', width: 20 },
    { header: 'İsim', key: 'name', width: 30 },
    { header: 'Kategori', key: 'category', width: 16 },
    { header: 'Müşteri', key: 'customer', width: 20 },
    { header: 'Sezon', key: 'season', width: 12 },
    { header: 'Tasarımcı', key: 'designer', width: 20 },
    { header: 'Termin', key: 'dueDate', width: 14 },
    { header: 'Durum', key: 'status', width: 22 },
  ];

  ws.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  ws.getRow(1).height = 22;

  for (const m of models) {
    ws.addRow({
      code: m.code,
      name: m.name,
      category: m.category,
      customer: m.customer.name,
      season: m.season.code,
      designer: m.designer?.fullName ?? '—',
      dueDate: m.dueDate ? m.dueDate.toLocaleDateString('tr-TR') : '—',
      status: STATUS_TR[m.status] ?? m.status,
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

const STATUS_TR: Record<string, string> = {
  TASLAK: 'Taslak',
  BOM_DOGRULAMA: 'BOM Doğrulama',
  MALZEME_BEKLIYOR: 'Malzeme Bekleyen',
  HAZIR: 'Hazır',
  ATOLYEYE_GONDERILDI: 'Atölyede',
  KAPALI: 'Kapalı',
  IPTAL: 'İptal',
  NUMUNE_HAZIRLANIYOR: 'Numune Hazırlanıyor',
  REVIZE: 'Revize',
  ONAYLANDI: 'Onaylandı',
};

const STATUS_COLOR: Record<string, string> = {
  MALZEME_BEKLIYOR: 'FFFFF3CD',
  HAZIR: 'FFD1FAE5',
  ATOLYEYE_GONDERILDI: 'FFEDE9FE',
  KAPALI: 'FFE5E7EB',
  IPTAL: 'FFFEE2E2',
};

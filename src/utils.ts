export function formatRupiah(value: number): string {
  return "Rp " + Math.round(value).toLocaleString("id-ID");
}

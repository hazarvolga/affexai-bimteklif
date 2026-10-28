export type ImportState = 'idle' | 'processing' | 'empty' | 'failed' | 'error';
export function emptyImportMessage(state: ImportState): string {
  switch (state) {
    case 'idle': return 'Dosya yükleyin, örnek proje açın veya kuyruktan bir iş seçin.';
    case 'processing': return 'Dosya işleniyor; sonuçlar hazır olduğunda satırları inceleyebilirsiniz.';
    case 'empty': return 'İşlem tamamlandı ancak satır bulunamadı. Dosyayı ve eşlemeyi kontrol edin veya yeni bir dosya yükleyin.';
    case 'failed': return 'İşlem başarısız. Kuyruktaki hata bilgisini inceleyin ve yeniden deneyin.';
    case 'error': return 'Sonuç satırları yüklenemedi. Bağlantıyı kontrol edip işi tekrar açın.';
  }
}

/**
 * Unicode NFC normalizasyonu yapar.
 */
export function normalizeUnicode(val: string): string {
  return val.normalize('NFC');
}

/**
 * Türkçe karakter duyarlı case folding yapar.
 * Örn: "I" -> "ı", "İ" -> "i", "Ş" -> "ş"
 */
export function foldCaseTurkish(val: string): string {
  // JavaScript'in toLocaleLowerCase('tr-TR') metodu Türkçe case folding için standarttır.
  return val.toLocaleLowerCase('tr-TR');
}

/**
 * Başındaki/sonundaki boşlukları temizler ve ardışık boşlukları tek boşluğa indirger.
 */
export function normalizeWhitespace(val: string): string {
  return val.trim().replace(/\s+/g, ' ');
}

/**
 * Sayısal string değerleri stabil bir string biçimine normalize eder.
 * Binlik ayracı (nokta veya virgül) ve ondalık ayracını standartlaştırır.
 * Örn: "1.000" veya "1,0" veya "1.0" -> "1"
 * Örn: "123,45" veya "123.450" -> "123.45" (Eğer ondalıklı kısım varsa)
 */
export function normalizeNumeric(val: string): string {
  if (!val || val.trim() === '') return val;

  const trimmed = normalizeWhitespace(normalizeUnicode(val));

  // Hem nokta hem virgül içeriyorsa (örn: "1.250,50" veya "1,250.50")
  if (trimmed.includes('.') && trimmed.includes(',')) {
    const dotIndex = trimmed.indexOf('.');
    const commaIndex = trimmed.indexOf(',');
    if (commaIndex > dotIndex) {
      // Türkçe formatı: "1.250,50" -> "1250.50"
      const cleaned = trimmed.replace(/\./g, '').replace(/,/g, '.');
      const num = parseFloat(cleaned);
      return isNaN(num) ? trimmed : String(num);
    } else {
      // US formatı: "1,250.50" -> "1250.50"
      const cleaned = trimmed.replace(/,/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? trimmed : String(num);
    }
  }

  // Sadece tek bir tür ayraç varsa:
  if (trimmed.includes(',')) {
    const parts = trimmed.split(',');
    if (parts.length === 2) {
      if (parts[1].length === 3) {
        // "1,000" veya "1,250" belirsizdir! Tahmin etme, aynen dön.
        return trimmed;
      } else {
        // "12,5" -> "12.5" (ondalık)
        const cleaned = trimmed.replace(/,/g, '.');
        const num = parseFloat(cleaned);
        return isNaN(num) ? trimmed : String(num);
      }
    }
  }

  if (trimmed.includes('.')) {
    const parts = trimmed.split('.');
    if (parts.length === 2) {
      if (parts[1].length === 3) {
        // "1.000" veya "1.250" belirsizdir! Tahmin etme, aynen dön.
        return trimmed;
      } else {
        // "1.2" -> "1.2" (ondalık)
        const num = parseFloat(trimmed);
        return isNaN(num) ? trimmed : String(num);
      }
    }
  }

  // Ayraçsız düz sayılar
  const num = parseFloat(trimmed);
  return isNaN(num) ? trimmed : String(num);
}

/**
 * Birimleri ortak standart birim kısaltmalarına eşler.
 * Örn: "adet", "pcs", "tane", "pieces" -> "pcs"
 * Örn: "metre", "m", "meters" -> "m"
 * Örn: "kg", "kilogram", "kilograms" -> "kg"
 */
export function normalizeUnit(val: string): string {
  const folded = normalizeWhitespace(foldCaseTurkish(normalizeUnicode(val)));

  const unitMap: Record<string, string> = {
    'adet': 'pcs',
    'pcs': 'pcs',
    'tane': 'pcs',
    'pieces': 'pcs',
    'piece': 'pcs',
    'm': 'm',
    'metre': 'm',
    'meters': 'm',
    'meter': 'm',
    'kg': 'kg',
    'kilogram': 'kg',
    'kilograms': 'kg',
    'ton': 'ton',
    'tonnes': 'ton',
    'tonne': 'ton',
    'm2': 'm2',
    'metrekare': 'm2',
    'square meters': 'm2',
    'square meter': 'm2',
    'm3': 'm3',
    'metreküp': 'm3',
    'cubic meters': 'm3',
    'cubic meter': 'm3',
    'gün': 'day',
    'day': 'day',
    'days': 'day',
    'saat': 'hour',
    'hour': 'hour',
    'hours': 'hour'
  };

  return unitMap[folded] || folded;
}

/**
 * Genel string normalizasyonu (fingerprint üretimi vb. için)
 */
export function normalizeText(val: string): string {
  return normalizeWhitespace(foldCaseTurkish(normalizeUnicode(val)));
}

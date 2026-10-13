#!/usr/bin/env python3
"""
eng_calc.py — Yüksek Mühendis/Mimar hesap kütüphanesi (TS 500:2000, TBDY 2018, TS 708,
ÇŞB ölçü esasları, Planlı Alanlar İmar Yönetmeliği, Binaların Yangından Korunması Yönetmeliği).

Her fonksiyon {"sonuc": {...}, "adimlar": [...], "uyarilar": [...], "kaynak": [...]} döndürür.
"adimlar" formül izidir: rapora aynen konabilir, böylece her sayı denetlenebilir.

Birimler: kuvvet kN, moment kNm, uzunluk mm (aksi belirtilmedikçe), gerilme MPa, kütle t.

Kullanım (CLI):
    python eng_calc.py <komut> '<json-parametreler>'
    python eng_calc.py list            # komutları listeler
Örnek:
    python eng_calc.py kiris_egilme '{"Md":180,"b":300,"h":600,"fck":30,"fyk":420}'
"""
from __future__ import annotations

import json
import math
import sys
from typing import Any, Dict, List, Optional

ES = 200_000.0          # MPa, TS 500 Madde 3.4
EPS_CU = 0.003          # TS 500 Madde 7.1
STEEL_DENSITY = 7850.0  # kg/m3


def _r(x: float, n: int = 3) -> float:
    return float(round(x, n))


def _out(sonuc: Dict[str, Any], adimlar: List[str], uyarilar: List[str], kaynak: List[str]) -> Dict[str, Any]:
    return {"sonuc": sonuc, "adimlar": adimlar, "uyarilar": uyarilar, "kaynak": kaynak}


# ----------------------------------------------------------------------------- malzeme
def k1_coefficient(fck: float) -> float:
    """TS 500 Çizelge 7.1: C25 ve altı 0.85; her 5 MPa için 0.03 azalır; C50 0.70."""
    if fck <= 25:
        return 0.85
    return max(0.70, 0.85 - 0.006 * (fck - 25))


def malzeme(fck: float, fyk: float = 420.0, gamma_mc: float = 1.5, gamma_ms: float = 1.15) -> Dict[str, Any]:
    fcd = fck / gamma_mc
    fctk = 0.35 * math.sqrt(fck)
    fctd = fctk / gamma_mc
    fyd = fyk / gamma_ms
    ec = 3250 * math.sqrt(fck) + 14000
    k1 = k1_coefficient(fck)
    adim = [
        f"fcd = fck/γmc = {fck}/{gamma_mc} = {fcd:.2f} MPa",
        f"fctk = 0.35·√fck = 0.35·√{fck} = {fctk:.3f} MPa  (TS 500 Denk. 3.1)",
        f"fctd = fctk/γmc = {fctk:.3f}/{gamma_mc} = {fctd:.3f} MPa",
        f"fyd = fyk/γms = {fyk}/{gamma_ms} = {fyd:.1f} MPa",
        f"Ec = 3250·√fck + 14000 = {ec:.0f} MPa  (TS 500 Denk. 3.2)",
        f"k1 = {k1:.3f}  (TS 500 Çizelge 7.1)",
    ]
    uy = []
    if fck < 25:
        uy.append("TBDY 2018 Madde 7.2.5.1: deprem etkisindeki betonarme binalarda C25'ten düşük beton kullanılamaz.")
    if gamma_mc != 1.5:
        uy.append("γmc yerinde döküm için 1.5'tir; 1.4 yalnız öndökümlü, 1.7 nitelik denetimi yetersizse (TS 500 6.2.5).")
    return _out({"fcd": _r(fcd), "fctk": _r(fctk), "fctd": _r(fctd), "fyd": _r(fyd, 2), "Ec": _r(ec, 0), "k1": _r(k1)},
                adim, uy, ["TS 500:2000 Madde 3.3, 6.2.5, Çizelge 7.1"])


# ----------------------------------------------------------------------------- donatı
TS708_DIAMETERS = [6, 8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 32, 40]


def donati_agirlik(cap_listesi: Optional[List[Dict[str, float]]] = None, fire_yuzde: float = 0.0) -> Dict[str, Any]:
    """cap_listesi: [{"d":16,"uzunluk_m":120.5}, ...]  → kg/m = (π d²/4)·7850e-6."""
    cap_listesi = cap_listesi or [{"d": d, "uzunluk_m": 1.0} for d in TS708_DIAMETERS]
    satirlar, adim, uy = [], [], []
    toplam = 0.0
    for row in cap_listesi:
        d = float(row["d"])
        L = float(row.get("uzunluk_m", 1.0))
        area = math.pi * d * d / 4
        kgm = area * STEEL_DENSITY / 1e6
        kg = kgm * L
        toplam += kg
        satirlar.append({"d_mm": d, "alan_mm2": _r(area, 1), "kg_m": _r(kgm, 3), "uzunluk_m": L, "kg": _r(kg, 2)})
        adim.append(f"Ø{d:g}: A = π·{d:g}²/4 = {area:.1f} mm²; m = A·7850/10⁶ = {kgm:.3f} kg/m; {L:g} m → {kg:.2f} kg")
        if d not in TS708_DIAMETERS:
            uy.append(f"Ø{d:g} TS 708 tercihli çap listesinde değil; tedarik/proje ile teyit et.")
    toplam_fireli = toplam * (1 + fire_yuzde / 100)
    adim.append(f"Toplam = {toplam:.2f} kg; fire %{fire_yuzde:g} ile = {toplam_fireli:.2f} kg = {toplam_fireli/1000:.4f} t")
    uy.append("Nominal kütle π·d²/4·7.85 kg/dm³'ten gelir (≈0.006165·d² kg/m). TS 708 kütle toleransı d≤8 mm için ±%6, "
              "d>8 mm için ±%4.5'tir; hakedişte nominal kütle kullanılır, kantar tartımı değil.")
    return _out({"satirlar": satirlar, "toplam_kg": _r(toplam, 2), "fireli_toplam_kg": _r(toplam_fireli, 2),
                 "fireli_toplam_t": _r(toplam_fireli / 1000, 4)}, adim, uy, ["TS 708:2016", "EN 10080"])


def kenetlenme_bindirme(phi: float, fck: float, fyk: float = 420.0, konum: str = "II", r: float = 1.0,
                        kancali: bool = False, tum_kesit_cekme: bool = False, nervurlu: bool = True,
                        ortu_veya_aralik_yetersiz: bool = False) -> Dict[str, Any]:
    """TS 500 Madde 9.1.2 (lb) ve 9.2.5 (l0 = α1·lb, α1 = 1+0.5r)."""
    m = malzeme(fck, fyk)["sonuc"]
    fyd, fctd = m["fyd"], m["fctd"]
    lb_formul = 0.12 * fyd / fctd * phi
    lb0 = max(lb_formul, 20 * phi)
    adim = [f"lb = 0.12·(fyd/fctd)·φ = 0.12·({fyd}/{fctd})·{phi:g} = {lb_formul:.0f} mm; ≥ 20φ = {20*phi:.0f} → {lb0:.0f} mm (Denk. 9.1)"]
    if not nervurlu:
        lb0 *= 2
        adim.append(f"Düz yüzeyli çubuk ×2 → {lb0:.0f} mm")
    if 32 < phi <= 40:
        f = 100 / (132 - phi)
        lb0 *= f
        adim.append(f"32<φ≤40: ×100/(132−φ) = ×{f:.3f} → {lb0:.0f} mm")
    if ortu_veya_aralik_yetersiz:
        lb0 *= 1.2
        adim.append(f"Örtü < φ veya net aralık < 1.5φ: ×1.2 → {lb0:.0f} mm")
    pos = 1.4 if konum.upper() == "I" else 1.0
    lb = lb0 * pos
    adim.append(f"Konum {konum.upper()}: ×{pos} → lb = {lb:.0f} mm")
    lbk = 0.75 * lb
    adim.append(f"Standart kancalı lbk = 0.75·lb = {lbk:.0f} mm")
    alpha1 = 1.8 if tum_kesit_cekme else 1 + 0.5 * r
    lo = alpha1 * lb0 * pos
    adim.append(f"α1 = {'1.8 (tüm kesit çekme)' if tum_kesit_cekme else f'1 + 0.5·r = 1 + 0.5·{r:g} = {alpha1:.2f}'}; "
                f"l0 = α1·lb = {alpha1:.2f}·{lb0:.0f}·{pos} = {lo:.0f} mm (Denk. 9.2)")
    if kancali:
        lo *= 0.75
        adim.append(f"Kancalı uçlu bindirme ×0.75 → l0 = {lo:.0f} mm")
    uy = ["Bindirme boyunca ≥6 sargı, çap ≥ φ/3 ve ≥Ø8, aralık ≤ h/4 ve ≤200 mm (TS 500 9.2.5a).",
          "Kolon alt ucu eklerinde çekme varsa: ≤%50 ek → l0 ≥ 1.25lb; >%50 → l0 ≥ 1.50lb (TS 500 9.2.7). "
          "TBDY 2018 7.3.2 kolon eklerinin orta bölgede yapılmasını şart koşar — deprem detayını ayrıca kontrol et.",
          "Basınç bindirmesi: l0 ≥ lb ve ≥ 300 mm; φ>30 mm bindirmeli eklenemez (9.2.6)."]
    if phi > 30:
        uy.append("φ > 30 mm: basınç donatısı bindirmeli eklenemez, manşon gerekir.")
    return _out({"lb_mm": _r(lb, 0), "lbk_mm": _r(lbk, 0), "alpha1": _r(alpha1, 2), "l0_mm": _r(lo, 0),
                 "l0_phi_cinsinden": _r(lo / phi, 1)}, adim, uy, ["TS 500:2000 Madde 9.1.2, 9.2.5, 9.2.7"])


# ----------------------------------------------------------------------------- kiriş
def kiris_egilme(Md: float, b: float, h: float, fck: float, fyk: float = 420.0, d: Optional[float] = None,
                 paspayi_merkez: float = 40.0) -> Dict[str, Any]:
    """Tek donatılı dikdörtgen kesit, TS 500 eşdeğer dikdörtgen basınç bloğu. Md kNm."""
    m = malzeme(fck, fyk)["sonuc"]
    fcd, fyd, fctd, k1 = m["fcd"], m["fyd"], m["fctd"], m["k1"]
    d = d if d is not None else h - paspayi_merkez
    Mn = Md * 1e6
    adim = [f"d = {d:.0f} mm, fcd = {fcd} MPa, fyd = {fyd} MPa, k1 = {k1}"]
    uy: List[str] = []
    disc = d * d - 2 * Mn / (0.85 * fcd * b)
    if disc < 0:
        return _out({"yeterli": False}, adim + ["d² − 2Md/(0.85fcd·b) < 0 → kesit tek donatıyla taşıyamaz"],
                    ["Kesit büyütülmeli veya çift donatılı tasarım yapılmalı."], ["TS 500 Madde 7.1"])
    a = d - math.sqrt(disc)
    x = a / k1
    As = 0.85 * fcd * b * a / fyd
    adim += [f"a = d − √(d² − 2Md/(0.85·fcd·b)) = {a:.1f} mm; c = a/k1 = {x:.1f} mm",
             f"As = 0.85·fcd·b·a/fyd = {As:.0f} mm²"]
    rho = As / (b * d)
    rho_min = 0.8 * fctd / fyd
    eyd = fyd / ES
    rho_b = 0.85 * k1 * fcd / fyd * EPS_CU / (EPS_CU + eyd)
    rho_max = min(0.85 * rho_b, 0.02)
    adim += [f"ρ = As/(b·d) = {rho:.5f}",
             f"ρmin = 0.8·fctd/fyd = {rho_min:.5f} (Denk. 7.3)",
             f"ρb = 0.85·k1·fcd/fyd · εcu/(εcu+εyd) = {rho_b:.5f}; ρmax = min(0.85ρb, 0.02) = {rho_max:.5f}"]
    As_req = max(As, rho_min * b * d)
    if rho < rho_min:
        uy.append(f"ρ < ρmin → minimum donatı As,min = {rho_min*b*d:.0f} mm² kullanılır.")
    yeterli = rho <= rho_max
    if not yeterli:
        uy.append("ρ > ρmax → basınç donatısı ekle (ρ−ρ' ≤ 0.85ρb) veya kesiti büyüt.")
    if h < 300:
        uy.append("Kiriş yüksekliği 300 mm'den az olamaz (TS 500 7.3; TBDY 7.4.1.1).")
    if b < 250:
        uy.append("TBDY 2018 7.4.1.1: süneklik düzeyi yüksek kirişte bw ≥ 250 mm (TS 500: 200 mm).")
    if h > 3.5 * b:
        uy.append("TBDY 2018: kiriş yüksekliği gövde genişliğinin 3.5 katını geçemez.")
    sec = _bar_suggestion(As_req)
    adim.append(f"Gerekli As = {As_req:.0f} mm² → öneri: {sec}")
    return _out({"d_mm": d, "a_mm": _r(a, 1), "c_mm": _r(x, 1), "As_mm2": _r(As_req, 0), "rho": _r(As_req / (b * d), 5),
                 "rho_min": _r(rho_min, 5), "rho_max": _r(rho_max, 5), "yeterli": yeterli, "donati_onerisi": sec},
                adim, uy, ["TS 500:2000 Madde 7.1, 7.3"])


def _bar_suggestion(As: float) -> str:
    opts = []
    for d in (12, 14, 16, 18, 20, 22, 25, 28):
        a1 = math.pi * d * d / 4
        n = max(2, math.ceil(As / a1))
        opts.append((n * a1 - As, n, d, n * a1))
    best = sorted([o for o in opts if o[1] <= 8], key=lambda o: o[0])[:2]
    return ", ".join(f"{n}Ø{d} ({a:.0f} mm²)" for _, n, d, a in best)


def kesme(Vd: float, bw: float, d: float, fck: float, fywk: float = 420.0, Nd: float = 0.0, Ac: Optional[float] = None,
          etriye_cap: float = 8.0, kol_sayisi: int = 2) -> Dict[str, Any]:
    """TS 500 Madde 8.1. Vd kN, Nd kN (basınç +)."""
    m = malzeme(fck, fywk)["sonuc"]
    fcd, fctd, fywd = m["fcd"], m["fctd"], m["fyd"]
    gamma = 0.07 if Nd > 0 else (-0.3 if Nd < 0 else 0.0)
    Ac = Ac or bw * (d + 50)
    Vcr = 0.65 * fctd * bw * d * (1 + gamma * abs(Nd) * 1e3 / Ac) / 1e3
    Vc = 0.8 * Vcr
    Vmax = 0.22 * fcd * bw * d / 1e3
    adim = [f"Vcr = 0.65·fctd·bw·d·(1+γNd/Ac) = {Vcr:.1f} kN (Denk. 8.1)",
            f"Vc = 0.8·Vcr = {Vc:.1f} kN (Denk. 8.4)",
            f"Vmax = 0.22·fcd·bw·d = {Vmax:.1f} kN (Denk. 8.7)"]
    uy = []
    if Vd > Vmax:
        uy.append("Vd > Vmax → gövde ezilmesi; kesit büyütülmeli.")
    Asw_s_min = 0.3 * fctd / fywd * bw
    Asw_s_req = max((Vd - Vc) * 1e3 / (fywd * d), 0.0) if Vd > Vcr else 0.0
    Asw_s = max(Asw_s_min, Asw_s_req)
    adim.append(f"(Asw/s)min = 0.3·fctd/fywd·bw = {Asw_s_min:.3f} mm²/mm (Denk. 8.6)")
    if Vd > Vcr:
        adim.append(f"(Asw/s)gerekli = (Vd − Vc)/(fywd·d) = {Asw_s_req:.3f} mm²/mm")
    else:
        adim.append("Vd ≤ Vcr → hesap etriyesi gerekmez, minimum etriye konur")
    Asw = kol_sayisi * math.pi * etriye_cap ** 2 / 4
    s_calc = Asw / Asw_s if Asw_s > 0 else float("inf")
    s_lim = d / 4 if Vd > 3 * Vcr else d / 2
    s = min(s_calc, s_lim)
    s_round = math.floor(s / 10) * 10
    adim.append(f"Ø{etriye_cap:g} {kol_sayisi} kollu Asw = {Asw:.1f} mm² → s = {s_calc:.0f} mm; "
                f"s ≤ {'d/4' if Vd > 3*Vcr else 'd/2'} = {s_lim:.0f} mm → s = {s_round:.0f} mm")
    uy.append("TBDY 2018 sarılma bölgesinde: s ≤ h/4, ≤ 8φl, ≤ 150 mm; ilk etriye kolon yüzünden ≤ 50 mm; "
              "Ve kapasite tasarımıyla (Mp ile) hesaplanmalı, Ve−Vdy ≥ 0.5Vd ise Vc = 0.")
    return _out({"Vcr_kN": _r(Vcr, 1), "Vc_kN": _r(Vc, 1), "Vmax_kN": _r(Vmax, 1), "Asw_s_mm2_mm": _r(Asw_s, 4),
                 "etriye": f"Ø{etriye_cap:g}/{s_round:.0f} ({kol_sayisi} kol)", "kesit_yeterli": Vd <= Vmax},
                adim, uy, ["TS 500:2000 Madde 8.1", "TBDY 2018 Madde 7.4.4, 7.4.5"])


# ----------------------------------------------------------------------------- kolon
def kolon_kontrol(b: float, h: float, Nd_max: float, fck: float, fyk: float = 420.0, As_toplam: Optional[float] = None,
                  Ndm_deprem: Optional[float] = None, deprem_sunek_yuksek: bool = True) -> Dict[str, Any]:
    """Nd_max kN (1.4G+1.6Q vb.), Ndm_deprem kN (G+Q+E en büyük)."""
    m = malzeme(fck, fyk)["sonuc"]
    Ac = b * h
    adim, uy = [f"Ac = {b:g}·{h:g} = {Ac:.0f} mm²"], []
    lim_ts = 0.9 * m["fcd"] * Ac / 1e3
    adim.append(f"TS 500 (7.7): Nd ≤ 0.9·fcd·Ac = {lim_ts:.0f} kN → Nd = {Nd_max:g} kN "
                f"{'✓' if Nd_max <= lim_ts else '✗'}")
    ok = Nd_max <= lim_ts
    if Ndm_deprem is not None:
        Ac_req = Ndm_deprem * 1e3 / (0.40 * fck)
        adim.append(f"TBDY (7.3.1.2): Ac ≥ Ndm/(0.40·fck) = {Ac_req:.0f} mm² → {'✓' if Ac >= Ac_req else '✗'}")
        ok = ok and Ac >= Ac_req
    minb = 300 if deprem_sunek_yuksek else 250
    if min(b, h) < minb:
        uy.append(f"En küçük kolon boyutu {minb} mm'den az olamaz ({'TBDY 7.3.1.1' if deprem_sunek_yuksek else 'TS 500 7.4.1'}).")
        ok = False
    if As_toplam is not None:
        rho = As_toplam / Ac
        adim.append(f"ρt = {As_toplam:g}/{Ac:.0f} = {rho:.4f} (sınır 0.01–0.04; ek bölgesinde ≤0.06)")
        if rho < 0.01 or rho > 0.04:
            uy.append("ρt 0.01–0.04 dışında (TS 500 7.8–7.9, TBDY 7.3.2.1).")
            ok = False
    adim.append(f"Min. donatı As,min = 0.01·Ac = {0.01*Ac:.0f} mm²; boyuna çap ≥ Ø14")
    return _out({"Ac_mm2": Ac, "TS500_Nd_siniri_kN": _r(lim_ts, 0), "uygun": ok}, adim, uy,
                ["TS 500:2000 Madde 7.4.1", "TBDY 2018 Madde 7.3.1, 7.3.2"])


# ----------------------------------------------------------------------------- döşeme
def doseme_min_kalinlik(tip: str, ln: float, ll: Optional[float] = None, mesnet: str = "surekli",
                        alpha_s: float = 0.0) -> Dict[str, Any]:
    """tip: 'tek' (tek doğrultuda) | 'cift' (iki doğrultuda kirişli) | 'kirissiz'; ln, ll mm (serbest açıklıklar)."""
    adim, uy = [], []
    if tip == "tek":
        oran = {"basit": 25, "surekli": 30, "konsol": 12}[mesnet]
        h = max(80.0, ln / oran)
        adim.append(f"h ≥ ln/{oran} = {ln/oran:.0f} mm ve ≥ 80 mm → {h:.0f} mm (TS 500 11.2.2)")
        uy.append("Taşıt geçen döşemede h ≥ 120 mm; net örtü ≥ 15 mm; ρ ≥ 0.002 (S420/S500).")
    elif tip == "cift":
        assert ll, "ll (uzun serbest açıklık) gerekli"
        mm = ll / ln
        h = max(80.0, ln / (15 + 20 / mm) * (1 - alpha_s / 4))
        adim.append(f"m = ll/ls = {mm:.2f}; h ≥ ls/(15+20/m)·(1−αs/4) = {ln:.0f}/({15+20/mm:.2f})·(1−{alpha_s:g}/4) = {h:.0f} mm (Denk. 11.1)")
        uy.append("Her doğrultuda ρ ≥ 0.0015, toplam ≥ 0.0035 (S420/S500); aralık kısa yönde ≤200, uzun yönde ≤250 mm.")
    else:
        h = max(180.0, ln / 30)
        adim.append(f"Tablasız kirişsiz: h ≥ ln/30 = {ln/30:.0f} mm ve ≥ 180 mm → {h:.0f} mm")
        uy.append("TBDY 2018: kirişsiz döşemeli sistemler için ek koşullar (Madde 4.3.4.4, iki aşamalı hesap) uygulanır.")
    h_pratik = math.ceil(h / 10) * 10
    return _out({"h_min_mm": _r(h, 0), "h_onerilen_mm": h_pratik}, adim, uy, ["TS 500:2000 Bölüm 11", "TS 500 Çizelge 13.1"])


# ----------------------------------------------------------------------------- TBDY 2018 spektrum
_FS_SS = [0.25, 0.50, 0.75, 1.00, 1.25, 1.50]
_FS = {"ZA": [0.8] * 6, "ZB": [0.9] * 6, "ZC": [1.3, 1.3, 1.2, 1.2, 1.2, 1.2],
       "ZD": [1.6, 1.4, 1.2, 1.1, 1.0, 1.0], "ZE": [2.4, 1.7, 1.3, 1.1, 0.9, 0.8]}
_F1_S1 = [0.10, 0.20, 0.30, 0.40, 0.50, 0.60]
_F1 = {"ZA": [0.8] * 6, "ZB": [0.8] * 6, "ZC": [1.5, 1.5, 1.5, 1.5, 1.5, 1.4],
       "ZD": [2.4, 2.2, 2.0, 1.9, 1.8, 1.7], "ZE": [4.2, 3.3, 2.8, 2.4, 2.2, 2.0]}


def _interp(x: float, xs: List[float], ys: List[float]) -> float:
    if x <= xs[0]:
        return ys[0]
    if x >= xs[-1]:
        return ys[-1]
    for i in range(len(xs) - 1):
        if xs[i] <= x <= xs[i + 1]:
            t = (x - xs[i]) / (xs[i + 1] - xs[i])
            return ys[i] + t * (ys[i + 1] - ys[i])
    return ys[-1]


def _dts(sds: float, bks: int) -> str:
    base = 4 if sds < 0.33 else 3 if sds < 0.50 else 2 if sds < 0.75 else 1
    return f"{base}{'a' if bks == 1 else ''}"


def tbdy_spektrum(Ss: float, S1: float, zemin: str, T: Optional[float] = None, R: Optional[float] = None,
                  D: Optional[float] = None, bks: int = 3, TL: float = 6.0) -> Dict[str, Any]:
    zemin = zemin.upper()
    if zemin == "ZF":
        raise ValueError("ZF zemin sınıfında sahaya özel zemin davranış analizi zorunludur (TBDY 2.3.3).")
    Fs = _interp(Ss, _FS_SS, _FS[zemin])
    F1 = _interp(S1, _F1_S1, _F1[zemin])
    SDS, SD1 = Ss * Fs, S1 * F1
    TA, TB = 0.2 * SD1 / SDS, SD1 / SDS
    I = {1: 1.5, 2: 1.2, 3: 1.0}[bks]
    adim = [f"Fs({zemin}, Ss={Ss}) = {Fs:.3f}; F1({zemin}, S1={S1}) = {F1:.3f} (Tablo 2.1/2.2, doğrusal enterpolasyon)",
            f"SDS = Ss·Fs = {SDS:.3f}; SD1 = S1·F1 = {SD1:.3f} (Denk. 2.1)",
            f"TA = 0.2·SD1/SDS = {TA:.3f} s; TB = SD1/SDS = {TB:.3f} s; TL = {TL} s",
            f"BKS = {bks} → I = {I}; DTS = {_dts(SDS, bks)} (Tablo 3.2, SDS(DD-2) ile)"]
    res: Dict[str, Any] = {"Fs": _r(Fs), "F1": _r(F1), "SDS": _r(SDS), "SD1": _r(SD1), "TA": _r(TA), "TB": _r(TB),
                           "TL": TL, "I": I, "DTS": _dts(SDS, bks)}
    if T is not None:
        sae = sae_T(T, SDS, SD1, TA, TB, TL)
        res["SaE"] = _r(sae, 4)
        adim.append(f"SaE(T={T:.3f} s) = {sae:.4f} g (Denk. 2.2)")
        if R is not None and D is not None:
            Ra = R / I if T > TB else D + (R / I - D) * T / TB
            res["Ra"] = _r(Ra, 3)
            res["SaR"] = _r(sae / Ra, 4)
            adim.append(f"Ra(T) = {'R/I' if T > TB else 'D + (R/I − D)·T/TB'} = {Ra:.3f}; SaR = SaE/Ra = {sae/Ra:.4f} g (Denk. 4.1)")
    uy = ["Ss, S1 değerleri AFAD TDTH (tdth.afad.gov.tr) üzerinden parsel koordinatı ve DD-2 (475 yıl) için alınmalı.",
          "Fs/F1 tabloları TBDY 2018 Tablo 2.1–2.2'den aktarılmıştır; kritik projede yönetmelik metniyle teyit et."]
    return _out(res, adim, uy, ["TBDY 2018 Bölüm 2, 3, 4"])


def sae_T(T: float, SDS: float, SD1: float, TA: float, TB: float, TL: float = 6.0) -> float:
    if T <= TA:
        return (0.4 + 0.6 * T / TA) * SDS
    if T <= TB:
        return SDS
    if T <= TL:
        return SD1 / T
    return SD1 * TL / (T * T)


def esdeger_deprem_yuku(kat_kutleleri_t: List[float], kat_kotlari_m: List[float], Ss: float, S1: float, zemin: str,
                        R: float, D: float, bks: int = 3, T: Optional[float] = None, Ct: float = 0.1) -> Dict[str, Any]:
    """Kat kütleleri (t) ve kat kotları (m, bina tabanından, alttan üste). Ct: BA çerçeve 0.1, çelik 0.08, diğer 0.07."""
    HN = max(kat_kotlari_m)
    N = len(kat_kutleleri_t)
    TpA = Ct * HN ** 0.75
    T_used = T if T is not None else TpA
    adim = [f"HN = {HN} m, N = {N}; TpA = Ct·HN^(3/4) = {Ct}·{HN}^0.75 = {TpA:.3f} s"]
    uy = []
    if T is not None and T > 1.4 * TpA:
        uy.append(f"Hesaplanan T = {T} s > 1.4·TpA = {1.4*TpA:.3f} s → T = 1.4·TpA alınmalı (TBDY 4.7.3).")
        T_used = 1.4 * TpA
    sp = tbdy_spektrum(Ss, S1, zemin, T_used, R, D, bks)
    s = sp["sonuc"]
    adim += sp["adimlar"]
    mt = sum(kat_kutleleri_t)
    g = 9.81
    Vt = mt * s["SaR"] * g
    Vmin = 0.04 * mt * s["I"] * s["SDS"] * g
    Vt_used = max(Vt, Vmin)
    adim += [f"mt = Σmi = {mt:.1f} t",
             f"Vt = mt·SaR(Tp)·g = {mt:.1f}·{s['SaR']}·9.81 = {Vt:.1f} kN (Denk. 4.19)",
             f"Vt,min = 0.04·mt·I·SDS·g = {Vmin:.1f} kN → Vt = {Vt_used:.1f} kN"]
    dFN = 0.0075 * N * Vt_used
    adim.append(f"ΔFN = 0.0075·N·Vt = {dFN:.1f} kN (tepe ek kuvveti)")
    denom = sum(m * H for m, H in zip(kat_kutleleri_t, kat_kotlari_m))
    katlar = []
    for i, (m, H) in enumerate(zip(kat_kutleleri_t, kat_kotlari_m), 1):
        Fi = (Vt_used - dFN) * m * H / denom + (dFN if i == N else 0.0)
        katlar.append({"kat": i, "m_t": m, "H_m": H, "Fi_kN": _r(Fi, 1)})
    adim.append("Fi = (Vt − ΔFN)·mi·Hi/Σ(mj·Hj); en üst kata ΔFN eklenir (Denk. 4.20–4.21)")
    uy += ["Eşdeğer deprem yükü yöntemi yalnız TBDY Tablo 4.4 koşullarında (BYS, A1b burulma ve B2b düzensizliği) kullanılabilir; "
           "aksi halde mod birleştirme yöntemi zorunlu.",
           "Kat kütlesi mi = (G + n·Q)/g; konutlarda n = 0.3, depolarda 0.8, okul/yurt/AVM 0.6 (TBDY Tablo 4.3) — girdiyi buna göre hazırla.",
           "±%5 ek dışmerkezlik ve iki yatay doğrultu birleşimi (1.0 ± 0.3) ayrıca uygulanır."]
    return _out({"TpA_s": _r(TpA), "T_kullanilan_s": _r(T_used), "mt_t": _r(mt, 1), "Vt_kN": _r(Vt_used, 1),
                 "Vt_min_kN": _r(Vmin, 1), "dFN_kN": _r(dFN, 1), "katlar": katlar, "spektrum": s},
                adim, uy, ["TBDY 2018 Madde 4.7"])


def goreli_kat_otelemesi(delta_mm: List[float], kat_yukseklik_mm: List[float], lam: float,
                         R_bolu_I: Optional[float] = None, dolgu_bitisik: bool = True, kappa: float = 1.0) -> Dict[str, Any]:
    """delta_mm: kat başına en büyük göreli öteleme. R_bolu_I verilirse girdi Δ (azaltılmış yüklerden) kabul edilip
    δ = (R/I)·Δ yapılır; verilmezse girdi zaten δ kabul edilir. λ = SaE(DD-3)/SaE(DD-2) (aynı Tp).
    Sınır: λ·δi,max/hi ≤ 0.008κ (dolgu bitişik) | 0.016κ (esnek bağlantılı)."""
    lim = (0.008 if dolgu_bitisik else 0.016) * kappa
    rows, ok, adim = [], True, []
    if R_bolu_I:
        adim.append(f"δ = (R/I)·Δ = {R_bolu_I}·Δ")
    for i, (d, h) in enumerate(zip(delta_mm, kat_yukseklik_mm), 1):
        dd = d * R_bolu_I if R_bolu_I else d
        val = lam * dd / h
        ok = ok and val <= lim
        rows.append({"kat": i, "delta_mm": _r(dd, 2), "oran": _r(val, 5), "uygun": val <= lim})
        adim.append(f"Kat {i}: λ·δ/h = {lam}·{dd:.2f}/{h:g} = {val:.5f} {'≤' if val <= lim else '>'} {lim:.4f}")
    return _out({"sinir": lim, "katlar": rows, "uygun": ok}, adim,
                ["Δ ile δ'yı karıştırma: TBDY'de sınır δ = (R/I)·Δ ile kontrol edilir (Denk. 4.33–4.34)."],
                ["TBDY 2018 Madde 4.9.1"])


# ----------------------------------------------------------------------------- metraj (QTO)
def betonarme_metraj(kolonlar: List[Dict[str, float]], kirisler: List[Dict[str, float]],
                     dosemeler: List[Dict[str, float]], beton_fire: float = 2.0) -> Dict[str, Any]:
    """Kesişim hiyerarşisi: kolon (tabliyeden tabliyeye, döşeme kalınlığı hariç) → kiriş (kolon yüzleri arası ln,
    yükseklik h−t) → döşeme (kiriş iç yüzleri arası net alan × t). Ölçüler m.
    kolonlar: [{"b":0.3,"h":0.6,"H":3.0,"t":0.15,"adet":8}]  H: kat yüksekliği (döşeme üstünden döşeme üstüne)
    kirisler: [{"b":0.25,"h":0.5,"ln":4.4,"t":0.15,"adet":10}]
    dosemeler: [{"alan_net":85.0,"t":0.15,"kenar_m":0}]  kenar_m: dış kenar uzunluğu (alın kalıbı için)"""
    adim, V, K = [], {"kolon": 0.0, "kiris": 0.0, "doseme": 0.0}, {"kolon": 0.0, "kiris": 0.0, "doseme": 0.0}
    for c in kolonlar:
        n = c.get("adet", 1)
        hc = c["H"] - c.get("t", 0.0)
        v = c["b"] * c["h"] * hc * n
        k = 2 * (c["b"] + c["h"]) * hc * n
        V["kolon"] += v
        K["kolon"] += k
        adim.append(f"Kolon {c['b']}×{c['h']} ×{n}: V = b·h·(H−t) = {c['b']}·{c['h']}·{hc:.2f}·{n} = {v:.3f} m³; "
                    f"kalıp = 2(b+h)(H−t) = {k:.2f} m² (kiriş birleşim yüzleri brüt; aşağıda düşülür)")
    for bm in kirisler:
        n = bm.get("adet", 1)
        hw = bm["h"] - bm.get("t", 0.0)
        v = bm["b"] * hw * bm["ln"] * n
        k = (bm["b"] + 2 * hw) * bm["ln"] * n
        V["kiris"] += v
        K["kiris"] += k
        # kolon kalıbından kirişin oturduğu yüzü düş: b × hw her uçta (2 uç / kiriş)
        K["kolon"] -= 2 * bm["b"] * hw * n
        adim.append(f"Kiriş {bm['b']}×{bm['h']} ln={bm['ln']} ×{n}: V = b·(h−t)·ln = {v:.3f} m³; "
                    f"kalıp = (b + 2(h−t))·ln = {k:.2f} m²; kolon kalıbından 2·b·(h−t) = {2*bm['b']*hw*n:.2f} m² düşüldü")
    for s in dosemeler:
        v = s["alan_net"] * s["t"]
        k = s["alan_net"] + s.get("kenar_m", 0.0) * s["t"]
        V["doseme"] += v
        K["doseme"] += k
        adim.append(f"Döşeme net {s['alan_net']} m² × {s['t']} = {v:.3f} m³; kalıp = alt yüzey + alın = {k:.2f} m²")
    toplam = sum(V.values())
    adim.append(f"Toplam beton = {toplam:.3f} m³; fire %{beton_fire:g} → sipariş {toplam*(1+beton_fire/100):.2f} m³ "
                f"(hakediş net hacimle yapılır, fire teklif maliyetine girer)")
    uy = ["Hiyerarşi tutarlı uygulanmalı: kolon-kiriş-döşeme kesişim hacmi yalnız bir kez sayılır.",
          "Kalıp 'kırık ölçü' esasıyla betonla temas eden yüzeylerden ölçülür; birleşim yüzleri ve boşluklar düşülür.",
          "Kiriş kalıbında döşeme ile birleşen üst yüz kalıp almaz; kenar kirişlerde dış yan yüz tam yükseklik (h) olabilir — gerekirse ayrıca ekle."]
    return _out({"beton_m3": {k: _r(v, 3) for k, v in V.items()}, "beton_toplam_m3": _r(toplam, 3),
                 "kalip_m2": {k: _r(v, 2) for k, v in K.items()}, "kalip_toplam_m2": _r(sum(K.values()), 2)},
                adim, uy, ["ÇŞB İnşaat birim fiyat tarifleri ölçü esasları (betonarme, kalıp)"])


def siva_boya_alani(duvar_uzunluk_m: float, yukseklik_m: float, bosluklar: List[Dict[str, float]],
                    kural: str = "CSB") -> Dict[str, Any]:
    """bosluklar: [{"g":1.2,"y":1.5,"derinlik":0.2,"tip":"pencere","adet":2,"alt_sivali":false}]  tip: pencere|kapi.
    CSB: tüm boşluklar düşülür, sıvanan boşluk yanları (iç dişler, lento altı) eklenir. Pencere alt yüzüne
    denizlik (mermer vb.) konuyorsa o yüz sıvanmaz (varsayılan alt_sivali=false → 2 yan + üst).
    DIN18350: ≤2.5 m² boşluk düşülmez ve yanları eklenmez; büyükler düşülür, yanları eklenir."""
    brut = duvar_uzunluk_m * yukseklik_m
    dus, ek, adim = 0.0, 0.0, [f"Brüt yüzey = {duvar_uzunluk_m}·{yukseklik_m} = {brut:.2f} m²"]
    ek_alt_varyant = 0.0
    for o in bosluklar:
        n = o.get("adet", 1)
        a = o["g"] * o["y"]
        if o.get("tip", "pencere") == "kapi" or not o.get("alt_sivali", False):
            cevre = 2 * o["y"] + o["g"]
            if o.get("tip", "pencere") != "kapi":
                ek_alt_varyant += o["g"] * o.get("derinlik", 0.0) * n
        else:
            cevre = 2 * (o["y"] + o["g"])
        yan = cevre * o.get("derinlik", 0.0)
        if kural.upper() == "CSB" or a > 2.5:
            dus += a * n
            ek += yan * n
            adim.append(f"Boşluk {o['g']}×{o['y']} ×{n}: −{a*n:.2f} m², iç diş +{yan*n:.2f} m²")
        else:
            adim.append(f"Boşluk {o['g']}×{o['y']} ({a:.2f} m² ≤ 2.5) ×{n}: DIN 18350'ye göre düşülmez, iç diş eklenmez")
    net = brut - dus + ek
    adim.append(f"Net = {brut:.2f} − {dus:.2f} + {ek:.2f} = {net:.2f} m²")
    uy = []
    if ek_alt_varyant > 0 and kural.upper() == "CSB":
        uy.append(f"Pencere alt yüzleri denizlikli kabul edildi (sıvanmaz). Alt yüzler de sıvanacaksa +{ek_alt_varyant:.2f} m² "
                  f"→ {net + ek_alt_varyant:.2f} m². Detay paftasına göre seç ve raporda belirt.")
    if kural.upper() != "CSB":
        uy.append("DIN 18350 (VOB/C) kuralı Türkiye kamu (ÇŞB/YFK) işlerinde uygulanamaz; yalnız sözleşme açıkça VOB/DIN ise.")
    return _out({"brut_m2": _r(brut, 2), "dusulen_m2": _r(dus, 2), "eklenen_m2": _r(ek, 2), "net_m2": _r(net, 2),
                 "kural": kural.upper()}, adim, uy, ["ÇŞB birim fiyat tarifi sıva/boya ölçü esasları", "DIN 18350"])


def metraj_sapma(gercek: float, beklenen: float, tolerans_yuzde: float = 3.0) -> Dict[str, Any]:
    """TeklifPro SmartCheck RULE_3X3_QTO_TOLERANCE_3PCT ile aynı mantık (round 3 hane, > tolerans → ihlal)."""
    dev = abs(gercek - beklenen) / beklenen * 100
    dev_r = round(dev * 1000) / 1000
    return _out({"sapma_yuzde": dev_r, "ihlal": dev_r > tolerans_yuzde},
                [f"sapma = |{gercek} − {beklenen}|/{beklenen}·100 = %{dev_r:.3f} (sınır %{tolerans_yuzde})"],
                ["%3 eşiği bir şirket/ürün politikasıdır; TS 500 veya ISO 19650'de tanımlı normatif bir metraj toleransı değildir."],
                ["src/smartcheck/rules/three-by-three.ts"])


# ----------------------------------------------------------------------------- mimari / imar / yangın
def imar_hesabi(parsel_alani: float, TAKS: Optional[float] = None, KAKS: Optional[float] = None,
                kat_adedi: Optional[int] = None, emsal_disi_talep_m2: float = 0.0) -> Dict[str, Any]:
    adim, uy = [], []
    if TAKS is not None:
        adim.append(f"Taban alanı = TAKS·parsel = {TAKS}·{parsel_alani} = {TAKS*parsel_alani:.2f} m²")
    if KAKS is None and TAKS is not None and kat_adedi:
        KAKS = TAKS * kat_adedi
        adim.append(f"KAKS belirlenmemiş → TAKS·kat adedi = {KAKS:.2f}")
    res: Dict[str, Any] = {"taban_alani_m2": _r((TAKS or 0) * parsel_alani, 2)}
    if KAKS is not None:
        emsal = KAKS * parsel_alani
        emsal_disi_max = 0.30 * emsal
        res.update({"emsal_alani_m2": _r(emsal, 2), "emsal_disi_azami_m2": _r(emsal_disi_max, 2),
                    "toplam_insaat_alani_ust_sinir_m2": _r(emsal + min(emsal_disi_talep_m2, emsal_disi_max), 2)})
        adim += [f"Emsal alanı = KAKS·parsel = {KAKS}·{parsel_alani} = {emsal:.2f} m²",
                 f"Emsal dışı alanların toplamı ≤ %30·emsal = {emsal_disi_max:.2f} m² (PAİY Madde 5/8, 22)"]
        if emsal_disi_talep_m2 > emsal_disi_max:
            uy.append(f"Emsal dışı talep {emsal_disi_talep_m2} m² > {emsal_disi_max:.2f} m²; fazlası emsale dahil edilir.")
    if TAKS and TAKS > 0.40:
        uy.append("Ayrık/blok nizamda planda aksi yoksa TAKS %40'ı geçemez (PAİY, 2026 değişikliği). Plan notunu kontrol et.")
    uy.append("Plan notları yönetmelikten önce gelir; parselin uygulama imar planı ve plan notları mutlaka okunmalı.")
    return _out(res, adim, uy, ["Planlı Alanlar İmar Yönetmeliği (1 Temmuz 2026 değişiklikleri dahil)"])


_KULLANICI_YUKU = {"ofis": 10, "magaza": 5, "derslik": 1.5, "konferans": 1.5, "lokanta": 1.5, "otel_oda": 20,
                   "hastane_oda": 20, "depo": 30, "otopark": 30, "spor": 3, "bekleme": 3, "fabrika": 10, "galeri": 5}
_KACIS = {  # (tek yön yok/var, iki yön yok/var, kapı-dış, diğer kapı/koridor, merdiven, rampa)
    "yuksek_tehlikeli": (10, 20, 20, 35, 50, 40, 30, 50), "endustri": (15, 25, 30, 60, 100, 80, 60, 100),
    "yurt": (15, 30, 45, 75, 50, 40, 30, 50), "magaza": (15, 25, 45, 60, 100, 80, 60, 100),
    "buro": (15, 30, 45, 75, 100, 80, 60, 100), "otopark_depo": (15, 25, 45, 60, 100, 80, 60, 100),
    "okul": (15, 30, 45, 75, 100, 80, 60, 100), "toplanma": (15, 25, 45, 60, 100, 80, 60, 100),
    "hastane": (15, 25, 30, 45, 30, 30, 30, 30), "otel": (15, 20, 30, 45, 50, 40, 30, 50),
    "apartman": (15, 30, 30, 75, 50, 40, 30, 50)}


def kacis_hesabi(kat_alani_m2: float, kullanim_alani: str, kullanim_sinifi: str, sprinkler: bool = False,
                 yuksek_bina: bool = False, kisi_sayisi: Optional[int] = None) -> Dict[str, Any]:
    fak = _KULLANICI_YUKU[kullanim_alani]
    N = max(math.ceil(kat_alani_m2 / fak), kisi_sayisi or 0)
    k = _KACIS[kullanim_sinifi]
    tek = k[1] if sprinkler else k[0]
    iki = k[3] if sprinkler else k[2]
    per_unit_stair = k[6]
    birim = math.ceil(N / per_unit_stair)
    W = birim * 0.5
    adim = [f"Kullanıcı yükü = {kat_alani_m2}/{fak} = {N} kişi (Ek-5/A)",
            f"Merdiven: birim genişlik başına {per_unit_stair} kişi → {birim} birim × 0.50 m = {W:.2f} m toplam (Madde 32/33)",
            f"En uzun kaçış: tek yön {tek} m, iki yön {iki} m ({'sprinklerli' if sprinkler else 'sprinklersiz'}, Ek-5/B)"]
    min_tek = 1.0 if 50 <= N <= 500 else 1.5 if 501 <= N <= 2000 else 2.0 if N > 2000 else 0.8
    if yuksek_bina:
        min_tek = max(min_tek, 1.2)
    adim.append(f"Tek kaçış yolu en az {min_tek:.2f} m (koridor olarak da kullanılıyorsa ≥1.10 m; mutlak en az 0.80 m)")
    return _out({"kullanici_yuku": N, "toplam_merdiven_genisligi_m": _r(max(W, min_tek), 2),
                 "tek_yon_max_m": tek, "iki_yon_max_m": iki, "tek_yol_min_genislik_m": min_tek}, adim,
                ["Değerler Binaların Yangından Korunması Hakkında Yönetmelik Ek-5/A–5/B'den alınmıştır; yürürlükteki son "
                 "değişikliklerle teyit et. Konutlarda merdiven sayısı yapı yüksekliğine (21.50/30.50/51.50 m) bağlıdır (Madde 35)."],
                ["Binaların Yangından Korunması Hakkında Yönetmelik Madde 32, 33, Ek-5"])


def merdiven(kat_yuksekligi_cm: float, hedef_rıht_cm: float = 17.0, kullanim: str = "konut") -> Dict[str, Any]:
    n = math.ceil(kat_yuksekligi_cm / hedef_rıht_cm)
    a = kat_yuksekligi_cm / n
    b = 63 - 2 * a
    adim = [f"Basamak sayısı n = ⌈{kat_yuksekligi_cm}/{hedef_rıht_cm}⌉ = {n}; rıht a = {a:.2f} cm",
            f"Blondel: 2a + b = 60–64 cm → b ≈ 63 − 2a = {b:.1f} cm"]
    uy = []
    if kullanim == "konut" and a > 18:
        uy.append("Konut ortak merdiveninde rıht 18 cm'yi geçmemeli (PAİY Madde 31 — güncel metinle teyit et).")
    if b < 27:
        uy.append("Basamak genişliği 27 cm'nin altında; Blondel ve yönetmelik minimumlarını kontrol et.")
    return _out({"basamak_sayisi": n, "riht_cm": _r(a, 2), "basamak_genisligi_cm": _r(b, 1)}, adim, uy,
                ["Blondel bağıntısı", "Planlı Alanlar İmar Yönetmeliği Madde 31"])


# ----------------------------------------------------------------------------- maliyet
YAPI_YAKLASIK_2026 = {"I-A": 2600, "I-B": 3900, "I-C": 4200, "I-D": 4800, "II-A": 8100, "II-B": 12500, "II-C": 15100,
                      "III-A": 19800, "III-B": 21050, "III-C": 23400, "IV-A": 26450, "IV-B": 33900, "IV-C": 40500,
                      "V-A": 42350, "V-B": 43850, "V-C": 48750, "V-D": 53500, "V-E": 103500}


def yaklasik_maliyet(alan_m2: float, sinif: str) -> Dict[str, Any]:
    bf = YAPI_YAKLASIK_2026[sinif]
    return _out({"birim_TL_m2": bf, "toplam_TL": alan_m2 * bf},
                [f"{alan_m2} m² × {bf} TL/m² ({sinif}, 2026) = {alan_m2*bf:,.0f} TL (KDV hariç)"],
                ["Bu tablo hizmet bedeli/harç hesabı içindir; gerçek teklif maliyeti değildir. Arsa, altyapı, peyzaj ve KDV hariç."],
                ["2026 Yılı Yapı Yaklaşık Birim Maliyetleri Tebliği (RG 03.02.2026)"])


def birim_fiyat_analizi(kalemler: List[Dict[str, float]], kar_genel_gider: float = 25.0) -> Dict[str, Any]:
    """kalemler: [{"ad":"Çimento","miktar":0.35,"birim_fiyat":3200}, ...] — 1 birim imalat için rayiç × miktar."""
    adim, top = [], 0.0
    for k in kalemler:
        t = k["miktar"] * k["birim_fiyat"]
        top += t
        adim.append(f"{k['ad']}: {k['miktar']} × {k['birim_fiyat']} = {t:,.2f}")
    kar = top * kar_genel_gider / 100
    adim += [f"Malzeme+işçilik+makine = {top:,.2f}", f"%{kar_genel_gider:g} yüklenici kârı ve genel giderler = {kar:,.2f}",
             f"Birim fiyat = {top+kar:,.2f} (KDV hariç)"]
    return _out({"ara_toplam": _r(top, 2), "kar_gg": _r(kar, 2), "birim_fiyat": _r(top + kar, 2)}, adim,
                ["Kamu (ÇŞB) analizlerinde %25 kâr ve genel gider standarttır; özel sektörde şirket politikası belirler."],
                ["ÇŞB Birim Fiyat Analizleri"])


COMMANDS = {f.__name__: f for f in [malzeme, donati_agirlik, kenetlenme_bindirme, kiris_egilme, kesme, kolon_kontrol,
                                     doseme_min_kalinlik, tbdy_spektrum, esdeger_deprem_yuku, goreli_kat_otelemesi,
                                     betonarme_metraj, siva_boya_alani, metraj_sapma, imar_hesabi, kacis_hesabi,
                                     merdiven, yaklasik_maliyet, birim_fiyat_analizi]}


def main(argv: List[str]) -> int:
    if len(argv) < 2 or argv[1] in ("-h", "--help", "list"):
        for name, fn in COMMANDS.items():
            print(f"{name}: {(fn.__doc__ or '').strip().splitlines()[0] if fn.__doc__ else ''}")
        return 0
    fn = COMMANDS[argv[1]]
    params = json.loads(argv[2]) if len(argv) > 2 else {}
    print(json.dumps(fn(**params), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))

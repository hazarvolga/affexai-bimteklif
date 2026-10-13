"""El hesabıyla doğrulanmış referans değerler. Çalıştır: python -m pytest -q scripts/test_eng_calc.py"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
import eng_calc as E  # noqa: E402


def approx(a, b, tol=1e-2):
    return abs(a - b) <= tol * max(1.0, abs(b))


def test_malzeme_c30():
    s = E.malzeme(30, 420)["sonuc"]
    assert s["fcd"] == 20.0
    assert approx(s["fctd"], 1.278, 1e-3)
    assert approx(s["fyd"], 365.22, 1e-3)
    assert s["k1"] == 0.82
    assert approx(s["Ec"], 31800, 1e-2)


def test_k1_table():
    assert [round(E.k1_coefficient(f), 2) for f in (20, 25, 30, 35, 40, 45, 50)] == [0.85, 0.85, 0.82, 0.79, 0.76, 0.73, 0.70]


def test_donati_kutle():
    rows = {r["d_mm"]: r["kg_m"] for r in E.donati_agirlik()["sonuc"]["satirlar"]}
    assert rows[8] == 0.395 and rows[10] == 0.617 and rows[12] == 0.888 and rows[16] == 1.578
    assert rows[20] == 2.466 and rows[25] == 3.853 and rows[32] == 6.313
    assert rows[18] == 1.998  # π·18²/4·7.85e-3 = 1.9977 → 1.998


def test_kenetlenme_c30_phi16():
    s = E.kenetlenme_bindirme(16, 30, 420, konum="II", r=1.0)["sonuc"]
    assert approx(s["lb_mm"], 549, 5e-3)
    assert s["alpha1"] == 1.5
    assert approx(s["l0_mm"], 823, 5e-3)
    s1 = E.kenetlenme_bindirme(16, 30, 420, konum="I", r=0.5)["sonuc"]
    assert approx(s1["lb_mm"], 549 * 1.4, 5e-3)
    assert approx(s1["l0_mm"], 1.25 * 549 * 1.4, 5e-3)


def test_kiris_egilme():
    s = E.kiris_egilme(180, 300, 600, 30, 420, d=560)["sonuc"]
    assert approx(s["a_mm"], 67.0, 5e-3)
    assert approx(s["As_mm2"], 936, 5e-3)
    assert s["yeterli"]
    assert s["rho_max"] == 0.02


def test_kesme_min_etriye():
    r = E.kesme(60, 300, 560, 30, 420)
    s = r["sonuc"]
    assert approx(s["Vcr_kN"], 0.65 * 1.278 * 300 * 560 / 1e3, 1e-2)
    assert s["kesit_yeterli"]


def test_spektrum_zc():
    s = E.tbdy_spektrum(1.0, 0.3, "ZC", T=0.5, R=8, D=3, bks=3)["sonuc"]
    assert s["Fs"] == 1.2 and s["F1"] == 1.5
    assert approx(s["SDS"], 1.2, 1e-6) and approx(s["SD1"], 0.45, 1e-6)
    assert approx(s["TB"], 0.375, 1e-6)
    assert approx(s["SaE"], 0.45 / 0.5, 1e-4)
    assert approx(s["SaR"], 0.9 / 8, 1e-3)
    assert s["DTS"] == "1"


def test_spektrum_interpolasyon_ra_kisa_periyot():
    s = E.tbdy_spektrum(0.6, 0.15, "ZD", T=0.1, R=8, D=3, bks=1)["sonuc"]
    assert approx(s["Fs"], 1.32, 1e-6)
    assert approx(s["F1"], 2.3, 1e-6)
    TB = s["TB"]
    Ra = 3 + (8 / 1.5 - 3) * 0.1 / TB
    assert approx(s["Ra"], Ra, 1e-3)
    assert s["DTS"] == "1a"  # SDS = 0.6·1.32 = 0.792 ≥ 0.75, BKS=1


def test_esdeger_deprem_min_kesme():
    r = E.esdeger_deprem_yuku([500, 500, 450], [3.0, 6.0, 9.0], 0.3, 0.08, "ZB", R=8, D=3, bks=3)["sonuc"]
    assert r["Vt_kN"] >= r["Vt_min_kN"]
    assert approx(sum(k["Fi_kN"] for k in r["katlar"]), r["Vt_kN"], 1e-3)


def test_metraj_hiyerarsi():
    r = E.betonarme_metraj([{"b": 0.3, "h": 0.6, "H": 3.0, "t": 0.15, "adet": 4}],
                           [{"b": 0.25, "h": 0.5, "ln": 4.4, "t": 0.15, "adet": 4}],
                           [{"alan_net": 20.0, "t": 0.15}])["sonuc"]
    assert approx(r["beton_m3"]["kolon"], 0.3 * 0.6 * 2.85 * 4, 1e-6)
    assert approx(r["beton_m3"]["kiris"], 0.25 * 0.35 * 4.4 * 4, 1e-6)
    assert approx(r["beton_toplam_m3"], 2.052 + 1.54 + 3.0, 1e-3)


def test_siva_csb_vs_din():
    o = [{"g": 1.2, "y": 1.5, "derinlik": 0.2, "tip": "pencere", "adet": 1}]
    csb = E.siva_boya_alani(5, 2.8, o, "CSB")["sonuc"]
    din = E.siva_boya_alani(5, 2.8, o, "DIN18350")["sonuc"]
    assert approx(csb["net_m2"], 14 - 1.8 + (2 * 1.5 + 1.2) * 0.2, 1e-6)  # denizlikli: 2 yan + üst
    assert approx(din["net_m2"], 14.0, 1e-6)
    o4 = [dict(o[0], alt_sivali=True)]
    assert approx(E.siva_boya_alani(5, 2.8, o4, "CSB")["sonuc"]["net_m2"], 14 - 1.8 + 2 * (1.5 + 1.2) * 0.2, 1e-6)


def test_siva_eval_ornegi():
    o = [{"g": 1.4, "y": 1.6, "derinlik": 0.25, "adet": 2}, {"g": 0.9, "y": 2.1, "derinlik": 0.2, "tip": "kapi"}]
    assert approx(E.siva_boya_alani(6.2, 2.9, o)["sonuc"]["net_m2"], 14.93, 1e-3)


def test_metraj_sapma_sinir():
    assert not E.metraj_sapma(103.0, 100.0)["sonuc"]["ihlal"]
    assert E.metraj_sapma(103.01, 100.0)["sonuc"]["ihlal"]


def test_doseme_cift():
    s = E.doseme_min_kalinlik("cift", 4000, 6000, alpha_s=0.5)["sonuc"]
    m = 1.5
    assert approx(s["h_min_mm"], 4000 / (15 + 20 / m) * (1 - 0.125), 1e-2)


def test_imar():
    s = E.imar_hesabi(1000, TAKS=0.35, KAKS=1.4)["sonuc"]
    assert s["emsal_alani_m2"] == 1400 and s["emsal_disi_azami_m2"] == 420


def test_kacis_ofis():
    s = E.kacis_hesabi(800, "ofis", "buro", sprinkler=True)["sonuc"]
    assert s["kullanici_yuku"] == 80 and s["tek_yon_max_m"] == 30 and s["iki_yon_max_m"] == 75

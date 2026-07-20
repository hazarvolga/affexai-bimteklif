/**
 * Source-derived BIMPlan Academy data.
 *
 * Generated from kaynaklar/bim_master_platformu_final_g_ncellemesi.html.
 * Do not summarize or hand-edit the extracted source blocks. Add native
 * presentation logic around these data models and keep provenance visible.
 */

export const data6D = [
            {
                title: "Enerji Performans Simülasyonu",
                subtitle: "Modül 01: Analitik Temeller",
                icon: "💡",
                desc: "BIM modelinin geometrik verilerini ve termal özelliklerini kullanarak binanın yıllık enerji talebini hesaplar. BEM (Building Energy Modeling) süreçlerini kapsar.",
                params: ["İklim verisi (EPW) analizi", "Gün ışığı simülasyonları", "Isıtma-Soğutma yükü"],
                standards: ["ISO 52000-1", "ASHRAE 90.1", "TS EN ISO 13790"],
                chartTitle: "Tüketim Dağılımı",
                chartData: [45, 25, 20, 10],
                chartLabels: ["Isıtma", "Soğutma", "Aydınlatma", "Ekipman"],
                chartType: "doughnut",
                colors: ['#10B981', '#3B82F6', '#F59E0B', '#64748B']
            },
            {
                title: "Yaşam Döngüsü Analizi (LCA)",
                subtitle: "Modül 02: Beşikten Mezara Çevresel Etki",
                icon: "🌍",
                desc: "Malzemelerin çıkarılmasından, nakliyesine, kullanımına ve geri dönüşümüne kadar olan tüm süreçlerin çevresel etkisinin ölçülmesidir.",
                params: ["EPD Veri Tabanı Kullanımı", "Yeniden Kullanım Potansiyeli", "Sökülebilirlik (DfD)"],
                standards: ["ISO 14040/14044", "EN 15978", "TRACI Metodolojisi"],
                chartTitle: "Gömülü Karbon Dağılımı",
                chartData: [60, 15, 10, 15],
                chartLabels: ["İmalat", "Nakliye", "İnşaat", "Ömür Sonu"],
                chartType: "pie",
                colors: ['#475569', '#3B82F6', '#10B981', '#F59E0B']
            },
            {
                title: "Karbon Ayak İzi Analizi",
                subtitle: "Modül 03: Dekarbonizasyon",
                icon: "☁️",
                desc: "Küresel emisyonların %40'ından sorumlu olan yapı sektöründe, gömülü (Embodied) ve Operasyonel karbonun minimize edilmesi stratejisidir.",
                params: ["Global Isınma Potansiyeli (GWP)", "Karbon Dengeleme", "Düşük Karbonlu Malzeme"],
                standards: ["ISO 16745-1", "GHG Protocol", "PAS 2080"],
                chartTitle: "Tasarım Yaklaşımları Emisyonu",
                chartData: [400, 280, 150],
                chartLabels: ["Geleneksel", "Optimize", "Net-Zero"],
                chartType: "bar",
                colors: ['#EF4444', '#F59E0B', '#10B981']
            },
            {
                title: "Yeşil Bina Sertifikasyonları",
                subtitle: "Modül 04: Regülasyon Uyumu",
                icon: "📜",
                desc: "BIM modelinin sertifika sistemleri için gerekli olan verileri otomatik olarak sağlaması sürecidir.",
                params: ["Kredi Takip Matrisi", "Su Verimliliği", "İç Hava Kalitesi"],
                standards: ["LEED v4.1", "BREEAM", "EDGE"],
                chartTitle: "Kredi Kazanım Potansiyeli",
                chartData: [30, 25, 20, 25],
                chartLabels: ["Enerji", "Malzeme", "Su", "Konum"],
                chartType: "doughnut",
                colors: ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6']
            }
        ];

export const rebarData = { 8: 0.395, 12: 0.888, 18: 1.997, 25: 3.853, 32: 6.313 };

export const data4D = {
            foundation: { title: "Kazı ve Temel", pv: 150, ev: 130, ac: 140, month: "1. Ay Görünümü (Temel)" },
            structure: { title: "Betonarme Karkas", pv: 500, ev: 480, ac: 520, month: "4. Ay Görünümü (Karkas)" },
            finishes: { title: "Cephe & İnce İşler", pv: 1000, ev: 700, ac: 720, month: "6. Ay Görünümü (Gecikme)" }
        };

export const rbacData = {
            architect: [
                { folder: "WIP (Mimari Çalışma)", r: "✅", w: "✅", a: "✅ (Lead)" },
                { folder: "WIP (Statik/MEP)", r: "❌ (Kapalı)", w: "❌", a: "❌" },
                { folder: "SHARED (Koordinasyon)", r: "✅", w: "❌ (Salt Okunur)", a: "❌" },
                { folder: "PUBLISHED (As-Built)", r: "✅", w: "❌", a: "❌" }
            ],
            mep: [
                { folder: "WIP (Mimari Çalışma)", r: "❌ (Kapalı)", w: "❌", a: "❌" },
                { folder: "WIP (Statik/MEP)", r: "✅", w: "✅", a: "✅ (Lead)" },
                { folder: "SHARED (Koordinasyon)", r: "✅", w: "❌ (Salt Okunur)", a: "❌" },
                { folder: "PUBLISHED (As-Built)", r: "✅", w: "❌", a: "❌" }
            ],
            client: [
                { folder: "WIP (Tüm Disiplinler)", r: "❌ (Karışıklığı önler)", w: "❌", a: "❌" },
                { folder: "SHARED (Koordinasyon)", r: "✅ (Gözlem)", w: "❌", a: "❌" },
                { folder: "PUBLISHED (As-Built)", r: "✅", w: "❌", a: "✅ (Kabul/Ödeme)" },
                { folder: "ARCHIVED (Geçmiş Kayıtlar)", r: "✅", w: "❌", a: "❌" }
            ]
        };

export const clashData = {
            hard: {
                title: "Hard Clash (Fiziksel Çarpışma)",
                desc: "İki katı yapı elemanının uzayda aynı hacmi işgal etmesidir. Matematiksel olarak objelerin bounding box (sınır kutusu) veya poligon kesişimleri tespit edilir. Örn: Havalandırma kanalının (MEP) betonarme kirişin içinden geçmesi.",
                solution: "Navisworks/Solibri üzerinden BCF raporu oluşturulur. MEP mühendisi kanalı kaydırır veya Statik mühendisi kirişe yasal toleranslar içinde rezervasyon (Void) deliği açar."
            },
            soft: {
                title: "Soft Clash (Tolerans ve Boşluk İhlali)",
                desc: "Fiziksel bir çarpışma yoktur ancak elemanların çalışması veya bakımı için gereken minimum mesafe ihlal edilmiştir. Örn: Elektrik panosunun kapağının açılması için gereken 1.2 metre ön boşluğa su borusu konulması.",
                solution: "Yazılımlara fiziksel modelin etrafında 'Sanal Tolerans Kapsülü' (Clearance Box) tanımlanır. Kapsül başka bir obje ile kesiştiğinde uyarı verir."
            },
            time: {
                title: "4D Clash (Zamana Bağlı Lojistik Çakışması)",
                desc: "3D modelde her şey mükemmel olsa bile, montaj sırasındaki çakışmalardır. Örn: Kurulan büyük kule vincin, henüz sökülmemiş iskele sistemine çarpması veya ekipman geçiş yolunun erken dökülen bir beton duvar ile kapanması.",
                solution: "Synchro 4D veya Navisworks TimeLiner ile Gantt şeması modele entegre edilerek yapım aşamaları sanal olarak test edilir (VDC - Virtual Design and Construction)."
            }
        };

export const curriculumDetailData = {
            1: {
                badge: "DERS KODU: BIM501",
                title: "Ontoloji ve Stratejik Bilgi Yönetimi",
                ects: "6.0 AKTS",
                desc: "Yüksek lisans seviyesindeki bu modül, BIM'in yazılım boyutuyla değil, bir organizasyonun 'Bilgi Mimarisinin' (Information Architecture) ISO 19650 standartlarına göre nasıl kurgulanacağı ile ilgilenir.",
                outcomes: [
                    "DIKW (Veri-Bilgi-Bilgelik) piramidini AEC endüstrisine uyarlayarak değer yaratır.",
                    "OIR, PIR, AIR ve EIR arasındaki stratejik nedensellik bağını hukuki metinlerle formüle eder.",
                    "Ortak Veri Ortamı (CDE) süreçlerini ve durum kodlarını (Suitability/Revision) şematize eder."
                ],
                syllabus: [
                    { week: "Hafta 1", topic: "Bilgi Yönetimine Giriş ve DIKW Piramidi" },
                    { week: "Hafta 2", topic: "ISO 19650-1 Terminolojisi ve İlkeler" },
                    { week: "Hafta 3", topic: "CDE Mimarisi, RBAC ve Durum Kodları" },
                    { week: "Hafta 4", topic: "Vaka Analizi: Hatalı EIR (Şartname) İncelemeleri" }
                ],
                lectures: {
                    0: `
                        <div class="space-y-6">
                            <p><strong class="text-amber-400 text-lg">Değerli Meslektaşlarım ve Öğrencilerim, Yüksek Lisans Programımıza Hoş Geldiniz.</strong></p>
                            <p>İlk dersimizde, inşaat endüstrisinin son 30 yılında yaşadığı en büyük travmayı ve kavram kargaşasını masaya yatıracağız. CAD (Computer Aided Design) çizgisinden BIM'e (Building Information Modeling) geçiş, sektörün sandığı gibi basit bir "üç boyutlu yazılım öğrenme" süreci değildir. Bu, <b>Ontolojik (Varlık Felsefesi) bir devrimdir.</b> Bugün bu amfide "Revit'te nasıl duvar çizilir?" sorusunun cevabını aramayacağız; "O duvarın veri tabanındaki ontolojik karşılığı nedir?" sorusuna cevap vereceğiz.</p>
                            
                            <h4 class="text-white font-bold text-lg mt-8 mb-4 border-b border-slate-700 pb-2">1. Varlık Felsefesi (Ontoloji) ve Obje Tabanlı Düşünce</h4>
                            <p>Bugün masanızda duran geleneksel bir 2D DWG projesine bakın. Orada gördüğünüz 30x60 ebatlarındaki dikdörtgen, bilgisayar bilimleri açısından sadece 4 adet koordinat noktası (Line) ve kapalı bir alandan (Hatch) ibarettir. Hiçbir zekası, ağırlığı, maliyeti veya zamansal boyutu yoktur. O dikdörtgenin bir "kolon" olduğunu sadece onu okuyan insan (mühendis) beyniyle yorumlar. Bilgisayar için o bir hiçtir.</p>
                            <p>Oysa BIM ontolojisinde (Industry Foundation Classes - IFC şemasında) o dikdörtgen bir <code class="bg-slate-800 text-emerald-400 px-2 py-1 rounded">IfcColumn</code> varlığıdır. Bu varlık; yerçekimini bilir (Analytical Structural Model), içine ne kadar C30 beton ve TS708 donatı gireceğini bilir (Cost Engineering), hangi tarihte döküleceğini bilir (4D Scheduling) ve yangın anında kaç dakika dayanacağını bilir (Fire Rating). Biz mimarlar ve mühendisler olarak artık "çizgi çizen" (Draftsman) kişiler değiliz; bizler bu akıllı objelerin içine <b>"Bilgi Enjekte Eden Yazarlarız" (Information Authors)</b>.</p>

                            <h4 class="text-white font-bold text-lg mt-8 mb-4 border-b border-slate-700 pb-2">2. Russell Ackoff ve DIKW Piramidi'nin AEC Sektörüne Uyarlanması</h4>
                            <p>BIM'deki "I" harfi (Information) tesadüfen oraya konmamıştır. Enformasyon bilimcisi Russell Ackoff'un 1989'da ortaya attığı <b>DIKW Piramidi</b>, bugün modern inşaat bilgi yönetiminin anayasasıdır. Bu piramidi 10.000 m²'lik bir hastane projesi üzerinden adım adım inceleyelim:</p>
                            
                            <div class="bg-slate-800 p-6 rounded-xl border border-slate-700 my-6 space-y-4">
                                <div class="flex items-start">
                                    <div class="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center font-bold text-blue-400 text-xl flex-shrink-0 mr-4 border border-blue-500/30">D</div>
                                    <div>
                                        <h5 class="text-blue-400 font-bold mb-1">Data (Ham Veri)</h5>
                                        <p class="text-xs text-slate-300 leading-relaxed">Modeldeki bir kapı objesinin genişliğinin 90 cm, yüksekliğinin 210 cm ve yangın dayanımının 120 dakika olmasıdır. Bu değerler tek başlarına Excel hücrelerindeki rakamlardan ibarettir. Henüz bir anlam ifade etmezler. Türkiye'deki çoğu müteahhitlik ofisi maalesef bu seviyede (Level 1) kalır.</p>
                                    </div>
                                </div>
                                <div class="flex items-start">
                                    <div class="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center font-bold text-emerald-400 text-xl flex-shrink-0 mr-4 border border-emerald-500/30">I</div>
                                    <div>
                                        <h5 class="text-emerald-400 font-bold mb-1">Information (Enformasyon / Bilgi)</h5>
                                        <p class="text-xs text-slate-300 leading-relaxed">Bağlam (Context) kazanmış veridir. "Zemin kattaki Acil Servis koridorunda 15 adet 90x210 yangın kapısına ihtiyaç vardır ve toplam maliyeti 450.000 TL'dir." Veriler birleşmiş, metraj (QTO) ve maliyet (5D) raporuna dönüşmüştür. Bu durum "Ne?" sorusuna cevap verir.</p>
                                    </div>
                                </div>
                                <div class="flex items-start">
                                    <div class="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center font-bold text-amber-400 text-xl flex-shrink-0 mr-4 border border-amber-500/30">K</div>
                                    <div>
                                        <h5 class="text-amber-400 font-bold mb-1">Knowledge (Bilgi Birikimi)</h5>
                                        <p class="text-xs text-slate-300 leading-relaxed">Uygulanabilir bilgidir. "Bu 15 adet kapı, yangın yönetmeliği (NFPA 101 / TBYY) gereği 90 cm'den dar olamaz. Aksi takdirde tahliye simülasyonu başarısız olur ve binaya e-Ruhsat alınamaz." Sistem burada devreye girer, "Otomatik Kural Kontrolü (ARC)" yapar ve tasarımcıyı uyarır. Karar verdirir.</p>
                                    </div>
                                </div>
                                <div class="flex items-start">
                                    <div class="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center font-bold text-purple-400 text-xl flex-shrink-0 mr-4 border border-purple-500/30">W</div>
                                    <div>
                                        <h5 class="text-purple-400 font-bold mb-1">Wisdom (Bilgelik / Öngörü)</h5>
                                        <p class="text-xs text-slate-300 leading-relaxed">Geleceği öngörme ve optimize etme yeteneğidir. "Hastane 50 yıl boyunca işletilecek (7D). Bu kapıların menteşeleri her 5 yılda bir arıza veriyor. Üretken yapay zeka (Generative AI) ile hastane içindeki yaya trafiği (Footfall analysis) analiz edildiğinde, bu kapıların otomatik sürgülü kapılarla değiştirilmesi 50 yıllık yaşam döngüsü maliyetini (LCC) %12 düşürecektir."</p>
                                    </div>
                                </div>
                            </div>

                            <h4 class="text-white font-bold text-lg mt-8 mb-4 border-b border-slate-700 pb-2">3. Sektörel Yüzleşme</h4>
                            <p>Bugün "BIM yapıyoruz" diye övünen firmaların %90'ı sadece <b>Data (D)</b> üretmektedir. Devasa ve içi boş 3D modeller inşa eder, bunlardan sadece görselleştirme (Render) veya basit paftalar alırlar. Oysa işverenin (Mülk Sahibinin) o binayı işletmek, bütçelemek ve karbon vergisini hesaplamak için <b>Wisdom (W)</b> seviyesine ihtiyacı vardır.</p>
                            <p>Sizleri bu kürsüde "Revit Operatörü" yapmak için değil, veriyi bilgeliğe dönüştüren ve milyon dolarlık projeleri yöneten <b>Information Managers (Bilgi Yöneticileri)</b> yapmak için eğiteceğiz. Haftaya ISO 19650-1'in acımasız yasal terminolojisiyle devam edeceğiz. Hepinize iyi çalışmalar.</p>
                        </div>
                    `,
                    1: `
                        <div class="space-y-6">
                            <p><strong class="text-amber-400 text-lg">Kavramların Gücü ve Yeni Hukuki Hiyerarşi,</strong></p>
                            <p>Değerli öğrenciler, eğer bir şantiyede veya ofiste aynı dili konuşmuyorsak, aynı binayı inşa edemeyiz. Bugün inceleyeceğimiz <b>ISO 19650-1:2018</b> standardı, sadece bir tavsiye belgesi değil, küresel inşaat sektörünün <b>Anayasasıdır.</b></p>
                            <p>İnşaat sektöründeki en büyük hukuki travma, sözleşmelerdeki "İşveren, Müteahhit, Taşeron" gibi kavramların, dijital bilgi üretimi söz konusu olduğunda havada kalmasıdır. Kim kime ne veriyi, ne zaman ve hangi formatta teslim edecektir? Eğer statiker yanlış bir veri girer de bina çökerse, suçu yazılım mı üstlenecektir yoksa mühendis mi? ISO 19650, bu kaosun içine girip "Durun!" demiştir ve klasik unvanları silip atarak yepyeni, tamamen <b>Bilgi Sorumluluğuna</b> dayalı bir hiyerarşi kurmuştur.</p>

                            <h4 class="text-white font-bold text-lg mt-8 mb-4 border-b border-slate-700 pb-2">Aktörler ve Yasal Roller (ISO 19650 Hiyerarşisi)</h4>
                            
                            <div class="space-y-4">
                                <div class="bg-red-900/20 p-5 rounded-xl border border-red-500/30 relative">
                                    <span class="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">KURAL KOYUCU</span>
                                    <h5 class="text-red-400 font-bold mb-2">1. Appointing Party (Atayan Taraf / İşveren)</h5>
                                    <p class="text-sm text-slate-300">Geleneksel dilde "İşveren" veya "Mülk Sahibi"dir (Örn: Sağlık Bakanlığı, TOKİ veya özel bir Yatırımcı). ISO standartlarında Atayan Taraf, <b>parayı veren ve kuralları koyan</b> kişidir. Projeden ne tür bir "Bilgi" beklediğini OIR, PIR ve EIR (Bilgi Değişimi Gereksinimleri) belgeleriyle en baştan yazılı olarak beyan etmek ZORUNDADIR. Eğer ne istediğini bilmezse, müteahhidin ürettiği çöpten o sorumludur.</p>
                                </div>
                                
                                <div class="bg-blue-900/20 p-5 rounded-xl border border-blue-500/30 relative">
                                    <span class="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">ORKESTRA ŞEFİ</span>
                                    <h5 class="text-blue-400 font-bold mb-2">2. Lead Appointed Party (Ana Atanan Taraf)</h5>
                                    <p class="text-sm text-slate-300">Geleneksel dilde "Ana Yüklenici (Main Contractor)" veya "Ana Tasarım Ofisi"dir. İhaleyi kazanan taraftır. İşverenin EIR (Şartname) taleplerine karşılık olarak <b>BEP (BIM Uygulama Planı)</b> hazırlamakla mükelleftir. Alt taşeronların ürettiği tüm modelleri CDE'de birleştirip çakışma (Clash) testlerini yapar ve işverene "Tertemiz Federated Model" teslim eder.</p>
                                </div>

                                <div class="bg-emerald-900/20 p-5 rounded-xl border border-emerald-500/30 relative">
                                    <span class="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">ÜRETİCİLER</span>
                                    <h5 class="text-emerald-400 font-bold mb-2">3. Appointed Party (Atanan Taraf)</h5>
                                    <p class="text-sm text-slate-300">Geleneksel dilde "Alt Yükleniciler", "Mekanik/Statik Taşeronları" veya "Mimari Danışmanlar"dır. Bizzat yazılımın başına geçip veriyi (Task Information) üreten ekiplerdir. MIDP (Ana Teslimat Planı) içerisindeki kendi görevlerini (TIDP) zamanında ve istenilen LOD/LOIN seviyesinde Ana Atanan Tarafa teslim etmekle yükümlüdürler.</p>
                                </div>
                            </div>

                            <h4 class="text-white font-bold text-lg mt-8 mb-4 border-b border-slate-700 pb-2">Bilgi Konteyneri (Information Container) Gerçeği</h4>
                            <p>Siz "Ben projeyi mail attım" dersiniz, ISO 19650 "Hayır, sen bir Bilgi Konteyneri aktardın" der. Bir PDF, bir IFC dosyası, bir COBie Excel tablosu veya bir nokta bulutu (Point Cloud)... Bunların hepsi birer Bilgi Konteyneridir. Model, bu konteynerlerin bir bütünüdür (Federated).</p>
                            
                            <div class="mt-6 border-l-4 border-amber-500 pl-4 bg-slate-800 p-4 rounded-r-lg">
                                <p class="text-amber-400 font-bold mb-2">Brutal (Acımasız) Gerçek:</p>
                                <p class="text-sm text-slate-300 leading-relaxed">Eğer Atayan Taraf (İşveren), ihaleye çıkarken <b>"Benim işletme (FM) sistemim COBie formatı okuyor, bana teslim edilecek her kapı ve pompanın garanti verisi bu formata uygun olmalı"</b> diye EIR belgesinde belirtmezse; Müteahhit ihaleyi alır, devasa bir geometri çizer, parasını alır ve gider. Binayı teslim alan işletmeci elindeki 3D modele bakakalır çünkü içinde işletmeye yarayacak "Tek bir veri" dahi yoktur. ISO 19650 mahkemesinde suçlu Müteahhit değil, <b>ne istediğini baştan tanımlamayan İşverendir!</b></p>
                            </div>
                            <p>Gelecek hafta, bu bilgi konteynerlerinin içinde barındığı, projenin tek gerçeklik kaynağı olan CDE (Ortak Veri Ortamı) mimarisini ve statüs kodlarını inceleyeceğiz.</p>
                        </div>
                    `,
                    2: `
                        <div class="space-y-6">
                            <p><strong class="text-amber-400 text-lg">Ortak Veri Ortamı (CDE) Bir Dropbox veya Google Drive Değildir!</strong></p>
                            <p>Öğrencilerimin ve hatta sektörde yıllarını harcamış proje müdürlerinin en sık yaptığı ölümcül hata, dosyaları bulut sunucusuna (OneDrive, Google Drive vb.) yüklemeyi "CDE" zannetmeleridir. Hayır, CDE (Common Data Environment) bir depolama alanı değil; <b>Kuralları Olan Acımasız Bir Yargıçtır.</b></p>
                            <p>Eğer bir sunucuda klasörlere herkes istediği gibi dosya atabiliyor, dosyaların isimlerini "Proje_Son_Revize_V2_FINAL.rvt" diye keyfi isimlendirebiliyorsa, o sistem CDE değildir, o bir çöplüktür.</p>

                            <h4 class="text-white font-bold text-lg mt-8 mb-4 border-b border-slate-700 pb-2">Durum Kodları (Suitability Status) ve Hukuki Anlamları</h4>
                            <p>Gerçek bir CDE'de (BIMcollab, Dalux, Aconex vb.) dosyanın sadece adı değil, <b>Uygunluk Kodu (Suitability Code)</b> ve <b>Revizyonu (Revision)</b> vardır. Dosya klasörler arasında sürükle-bırak ile gezmez; "Gateway (Geçiş Kapısı)" denilen dijital onay süreçlerinden geçerek sınıf atlar. Bu 4 ana durumu (ISO 19650-1) inceleyelim:</p>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                                <div class="bg-slate-800 p-5 rounded-xl border-t-4 border-blue-500">
                                    <div class="flex justify-between items-center mb-2">
                                        <h5 class="text-blue-400 font-bold text-lg">1. WIP (Work in Progress)</h5>
                                        <span class="bg-slate-900 px-2 py-1 rounded text-xs font-mono text-slate-300">S0 / P01.01</span>
                                    </div>
                                    <p class="text-sm text-slate-300"><b>Çalışma Alanı:</b> Mimarlar kendi ofis sınırları içinde modeli şekillendirir. Bu alan dışarıya KAPALIDIR. Statik veya Mekanik mühendisi buradaki dosyayı <b>ASLA</b> referans almamalıdır, çünkü tasarım her an değişebilir. (S0: Sadece İç Koordinasyon)</p>
                                </div>

                                <div class="bg-slate-800 p-5 rounded-xl border-t-4 border-amber-500">
                                    <div class="flex justify-between items-center mb-2">
                                        <h5 class="text-amber-400 font-bold text-lg">2. SHARED (Paylaşılan)</h5>
                                        <span class="bg-slate-900 px-2 py-1 rounded text-xs font-mono text-slate-300">S1-S4 / P01</span>
                                    </div>
                                    <p class="text-sm text-slate-300"><b>Koordinasyon Alanı:</b> Mimar takım lideri "Ben kaba taslağı bitirdim" deyip dosyayı WIP'ten SHARED'a gönderir (Gateway 1). Artık ondalık revizyon düşer (P01 olur). Statiker artık bu modele güvenerek kolonlarını dizebilir. Koordinasyon ve Çakışma (Clash) testleri bu alanda yapılır.</p>
                                </div>

                                <div class="bg-slate-800 p-5 rounded-xl border-t-4 border-emerald-500">
                                    <div class="flex justify-between items-center mb-2">
                                        <h5 class="text-emerald-400 font-bold text-lg">3. PUBLISHED (Yayınlanan)</h5>
                                        <span class="bg-slate-900 px-2 py-1 rounded text-xs font-mono text-slate-300">A1-A4 / C01</span>
                                    </div>
                                    <p class="text-sm text-slate-300"><b>Sözleşmesel Onay:</b> Tüm disiplinler çakışmaları çözmüş ve işveren/müşavir projeyi ONAYLAMIŞTIR. Dosya SHARED'dan PUBLISHED'a geçer (Gateway 2). Revizyon 'C' (Contractual) olur. Bu andan itibaren bu modele bakılarak <b>Beton Dökülür ve Hakediş (Fatura) Ödenir.</b> Hukuken bağlayıcıdır.</p>
                                </div>

                                <div class="bg-slate-800 p-5 rounded-xl border-t-4 border-purple-500">
                                    <div class="flex justify-between items-center mb-2">
                                        <h5 class="text-purple-400 font-bold text-lg">4. ARCHIVED (Arşivlenen)</h5>
                                        <span class="bg-slate-900 px-2 py-1 rounded text-xs font-mono text-slate-300">CR</span>
                                    </div>
                                    <p class="text-sm text-slate-300"><b>Proje Hafızası:</b> Proje bittiğinde veya bir model reddedildiğinde dosya Arşiv'e kaldırılır. 10 yıl sonra binada bir arıza çıkıp mahkemelik olunduğunda; "O gün o boruyu oraya kim onaylamıştı?" sorusunun cevabı CDE'nin silinemeyen (Audit Trail) arşiv kayıtlarındadır.</p>
                                </div>
                            </div>

                            <h4 class="text-white font-bold text-lg mt-8 mb-4 border-b border-slate-700 pb-2">Şantiyede Yaşanan Kanlı Vaka</h4>
                            <p class="text-sm text-slate-300 leading-relaxed mb-4">Statik mühendisi, mimarın WIP (Çalışma) klasöründeki dosyayı (gizlice veya sistem yetki hatasından dolayı) referans alır ve kolonları yerleştirir. Oysa mimar ertesi gün asansör kovasının yerini 2 metre kaydırır ama dosyayı henüz SHARED alanına onaylayıp atmamıştır. Statiker eski WIP dosyasına göre betonarme projeyi basar, sahaya gönderir. Sonuç: Asansör kovası ve kolonlar sahada birbirine girer, şantiye durur, 5 milyon TL zarar oluşur.</p>
                            
                            <p class="bg-red-900/30 p-4 rounded-xl border border-red-500/50 text-red-200 font-semibold text-sm">
                                İşte bu yüzden CDE, katı kuralları olan bir (RBAC - Rol Tabanlı Erişim) yetkilendirme sistemidir. ISO 19650'de CDE, sizin "Ben WhatsApp'tan atmıştım" veya "WeTransfer linki süresi dolmuş" yalanlarınızı ortadan kaldıran <b>dijital noterdir.</b>
                            </p>
                        </div>
                    `,
                    3: `
                        <div class="space-y-6">
                            <p><strong class="text-amber-400 text-lg">Şartname İncelemesi (Vaka Analizi): Cehaletin Maliyeti</strong></p>
                            <p>Değerli meslektaşlarım, teorik bilgilerimizi pratiğe dökme vakti geldi. Bugün, Türkiye'de ve dünyada sıklıkla karşılaştığımız, idareler (İşverenler / Appointing Parties) tarafından yazılmış gerçek bir kamu ihale şartnamesinden (EIR - Bilgi Değişimi Gereksinimleri) alınmış bir cümleyi inceleyeceğiz.</p>
                            
                            <div class="p-6 bg-slate-800 border-l-4 border-red-500 rounded-r-xl my-6 relative overflow-hidden">
                                <div class="absolute -right-4 -top-4 text-6xl opacity-10">📜</div>
                                <p class="text-red-300 font-mono text-sm italic leading-relaxed">
                                    "Yüklenici firma, projenin Avan Tasarım (Konsept) aşamasından itibaren tüm mimari, statik ve mekanik modeli <b>LOD 400</b> seviyesinde teslim edecektir. Modeldeki her objenin içine üretici markası, model numarası ve garanti süresi girilecektir."
                                </p>
                            </div>

                            <p>Bu metni yazan ihale makamı, "En yüksek sayı en iyisidir" mantığıyla hareket etmiş ve BIM literatürünü hiç anlamamıştır. Bu şartnamenin altına imza atan müteahhidi iflasa, bu modeli çizecek olan mimarı ise akıl hastanesine gönderecek olan <b>korkunç hataları (Gap Analysis)</b> maddeler halinde inceleyelim:</p>

                            <div class="space-y-6 mt-6">
                                <div>
                                    <h5 class="text-red-400 font-bold mb-2 flex items-center"><span class="bg-red-500/20 px-2 py-1 rounded text-red-400 text-xs mr-2">HATA 1</span> "Avan Projede LOD 400 İstemek"</h5>
                                    <p class="text-sm text-slate-300 leading-relaxed"><b>Akademik Gerçek:</b> BIMForum 2023 standartlarına göre <b>LOD 400</b>, "İmalat ve Fabrika Kesim (Fabrication)" detayıdır. Betonarme kolonun içindeki etriye kancasının kıvrım açısını veya çelik birleşimindeki bulonun yiv dişlerini içerir. Daha binanın kütlesinin, cephe karakterinin ve kat yüksekliklerinin tartışıldığı "Avan (Konsept - LOD 100/200)" aşamasında, kolonun içine donatı çizmek mühendislik dışı bir israftır. Tasarım 10 cm değiştiğinde o binlerce donatıyı yeniden çizmek aylarca sürer (Over-modeling).</p>
                                </div>

                                <div>
                                    <h5 class="text-red-400 font-bold mb-2 flex items-center"><span class="bg-red-500/20 px-2 py-1 rounded text-red-400 text-xs mr-2">HATA 2</span> "Her Objenin İçine Marka Girilecektir"</h5>
                                    <p class="text-sm text-slate-300 leading-relaxed"><b>Akademik Gerçek:</b> Kamu İhale Kanunu (KİK) gereği, rekabeti engellememek için ihale aşamasında projelere "Marka ve Model" yazılamaz (Ancak 'eşdeğeri' ifadesiyle yazılabilir). İhale aşamasından önce modele marka girmeyi zorunlu kılmak hukuken yasadışıdır. Marka ve Garanti verileri (LOI - Level of Information), bina inşa edilirken veya bitiminde (As-Built / LOD 500 / COBie) modele işlenir.</p>
                                </div>
                            </div>

                            <h4 class="text-white font-bold text-lg mt-8 mb-4 border-b border-slate-700 pb-2">Avrupa Standardı ile Çözüm: LOIN (EN 17412-1)</h4>
                            <p class="text-sm text-slate-300 leading-relaxed mb-4">İngiltere ve Avrupa'da "LOD" (Level of Development) kavramı terkedilmeye başlanmış, yerine <b>LOIN (Level of Information Need - Bilgi İhtiyacı Seviyesi)</b> getirilmiştir. LOIN şunu emreder:</p>
                            
                            <blockquote class="bg-emerald-900/20 border-l-4 border-emerald-500 p-4 rounded-r-lg text-emerald-300 font-semibold italic text-sm mb-6">
                                "Sadece işine yarayacak olan geometriyi (LOG) ve veriyi (LOI) iste. Sana fayda sağlamayacak hiçbir çizgiyi tasarımcıya çizdirme, donanımı (RAM/CPU) ve insan ömrünü israf etme."
                            </blockquote>

                            <p><b>Doğru Bir EIR Nasıl Yazılmalıydı?</b><br>
                            <i>"İdare, konsept tasarım aşamasında (Aşama 2) hacimsel kütleleri ve oda alanlarını (IfcSpace) kontrol etmek amacıyla <b>LOD 200 (LOG: Geometrik Temsil)</b> seviyesinde model beklemektedir. Enerji analizi (6D) yapılabilmesi için dış kabuk elemanlarının U-Değerleri <b>(LOI: Bilgi Temsili)</b> modele parametre olarak girilmiş olmalıdır."</i></p>
                            
                            <p class="text-amber-400 font-bold mt-8">Sonuç:</p>
                            <p>Bizler akademisyen ve bilgi yöneticisi olarak, idarelerin kopyala-yapıştır ile hazırladığı bu "toksik" şartnameleri revize etmek ve sektörü <b>"Yalın BIM" (Lean BIM)</b> felsefesine yönlendirmekle görevliyiz.</p>
                        </div>
                    `
                },
                literature: [
                    "ISO 19650-1:2018 (Organization and digitization of information)",
                    "UK BIM Framework Guidance Part 1 & 2",
                    "Eastman, C. et al. (2018). BIM Handbook."
                ],
                global: `
                    <p><b>DIKW Piramidi:</b> Veri (Data) -> Bilgi (Information) -> Bilgi Birikimi (Knowledge) -> Bilgelik (Wisdom) hiyerarşisi ISO 19650-1'in omurgasıdır.</p>
                `,
                tr: `
                    <p class="text-red-700 font-bold mb-1">Sektör Travması: "Şartnameye 'BIM İstenmektedir' Yazıp Geçmek"</p>
                    <p>Kamu projelerinde İdarelerin (İşveren) nitelikli bir <b>EIR (İdare Bilgi Gereksinimleri)</b> dosyası hazırlayamaması en büyük sorundur. İşveren ne istediğini bilmediği için, yüklenici en düşük kalitede modeli teslim eder.</p>
                `
            },
            2: {
                badge: "DERS KODU: BIM502",
                title: "Bilgi Yazarlığı ve LOIN Optimizasyonu",
                ects: "6.0 AKTS",
                desc: "Modelin ne kadar detaylı çizileceği (LOG) ile içine ne kadar veri girileceği (LOI) arasındaki mühendislik dengesini inceler. Aşırı modelleme (Over-modeling) israfını önleme metodolojisidir.",
                outcomes: [
                    "BIMForum LOD spesifikasyonlarını kullanarak proje fazlarına uygun model detayını belirler.",
                    "EN 17412-1 (LOIN) standartlarına uygun olarak bilgi israfını (Over-modeling) önler.",
                    "OmniClass ve UniFormat gibi küresel sınıflandırma sistemleriyle nesnelere meta-veri atar."
                ],
                syllabus: [
                    { week: "Hafta 5", topic: "Parametrik Ontoloji ve Family/Object Mantığı" },
                    { week: "Hafta 6", topic: "BIMForum LOD 2023 Spesifikasyonları" },
                    { week: "Hafta 7", topic: "EN 17412-1 Level of Information Need (LOIN)" },
                    { week: "Hafta 8", topic: "Sınıflandırma Sistemleri (OmniClass, UniFormat)" }
                ],
                lectures: {
                    0: `
                        <div class="space-y-6">
                            <p><strong class="text-amber-400 text-lg">Parametrik Obje Çöplüğüne Hoş Geldiniz,</strong></p>
                            <p>Bugün mimarlık ve mühendislik ofislerindeki bilgisayarların neden sürekli çöktüğünü, dosyaların neden 2 GB boyutlarına ulaşıp açılamadığını konuşacağız. Suçlu bilgisayarlarınız değil; BIM yazılımlarını (Revit, ArchiCAD, Allplan) "3Ds Max" veya "SketchUp" gibi görselleştirme araçları zanneden cehalettir.</p>
                            <h4 class="text-white font-bold text-lg mt-8 mb-4 border-b border-slate-700 pb-2">Family/Object Mantığı ve "Over-modeling" (Aşırı Modelleme) Virüsü</h4>
                            <p>Yeni mezun bir mimar, projesine bir tekerlekli ofis sandalyesi eklemek ister. Gider internetten (BIMobject vb. sitelerden) bir üreticinin paylaştığı "Sandalye" familyasını (objesini) indirip modele koyar. O objenin içinde sandalyenin tekerleklerindeki vidalar, kumaşın iplik dokusu ve altındaki amortisör mekanizması tek tek 3D modellenmiştir. Modelde o sandalyeden 500 tane koyduğunuz an, proje biter. Kilitlenirsiniz.</p>
                            <div class="bg-red-900/20 p-5 rounded-xl border border-red-500/30">
                                <strong class="text-red-400 block mb-2">Akademik Kural 1: Varlığın Amacı Nedir?</strong>
                                <p class="text-slate-300 text-sm">Bizim o sandalyeyi modele koyma amacımız "O sandalyenin kaplayacağı hacmi bilmek (Erişim alanı/Soft Clash)" ve "Maliyetini hesaplamaktır (5D)". Bu kadar! Sandalyenin tekerleğindeki vidayı çizmek mühendislik değil, israftır. Obje basit bir küp olabilir, ancak içine yazacağınız <b><code class="text-amber-400">Marka=X, Fiyat=1000TL, Garanti=2Yıl</code></b> parametreleri, o vidadan milyon kat daha değerlidir.</p>
                            </div>
                        </div>
                    `,
                    1: `
                        <div class="space-y-6">
                            <p><strong class="text-amber-400 text-lg">BIMForum LOD (Level of Development) Yanılgısı,</strong></p>
                            <p>Sektördeki en büyük terminoloji hatası LOD kısaltmasını "Level of Detail" (Detay Seviyesi) olarak çevirmektir. LOD, "Level of Development" yani <b>Gelişim Seviyesi'dir.</b> Detay göze hitap eder, Gelişim ise mühendislik zekasına.</p>
                            <h4 class="text-white font-bold text-lg mt-8 mb-4 border-b border-slate-700 pb-2">LOD 100'den 500'e İhtiyaç Analizi</h4>
                            <p>Bir betonarme kolon üzerinden gidelim:</p>
                            <ul class="space-y-3 text-sm text-slate-300">
                                <li><strong class="text-emerald-400">LOD 100 (Kavramsal):</strong> Orada bir taşıyıcı kütle olacağını biliriz. Hacmi ve tam boyutu belli değildir. Metrajı m² (alan) üzerinden tahmin edilir.</li>
                                <li><strong class="text-blue-400">LOD 200 (Avan Proje):</strong> Kolonun 30x60 olduğu belirlenir. Geometrisi nettir ama yeri veya malzeme sınıfı değişebilir. Yaklaşık metraj alınır.</li>
                                <li><strong class="text-amber-400">LOD 300 (Kesin Proje):</strong> Artık kolonun konumu, ebadı ve C30 olduğu kesindir. <b>İhale (Bidding) bu seviyede yapılır.</b> 5D Metraj tam olarak çıkar.</li>
                                <li><strong class="text-orange-400">LOD 400 (İmalat):</strong> Kolonun içindeki donatı bağları, paspayları modellenir. Fabrikaya CNC büküm için verilecek koddur. Erken aşamada isterseniz projeyi öldürürsünüz.</li>
                                <li><strong class="text-purple-400">LOD 500 (As-Built / İşletme):</strong> Sahada nasıl yapıldıysa, modele o haliyle (sapmalarıyla) güncellenmiş ve bakım verisi girilmiş nihai halidir.</li>
                            </ul>
                        </div>
                    `,
                    2: `
                        <div class="space-y-6">
                            <p><strong class="text-amber-400 text-lg">Avrupa'nın Darbesi: EN 17412-1 (LOIN),</strong></p>
                            <p>LOD kavramı Amerikan (AIA/BIMForum) kökenlidir ve genellikle "geometri" odaklı algılanmıştır. Avrupa standardizasyon komitesi (CEN) masaya yumruğunu vurarak <b>LOIN (Level of Information Need - Bilgi İhtiyacı Seviyesi)</b> kavramını yasal standart yapmıştır.</p>
                            <h4 class="text-white font-bold text-lg mt-8 mb-4 border-b border-slate-700 pb-2">"Gereksizse Çizme, Gerekliyse Yaz!"</h4>
                            <p>LOIN bize şunu sorar: "Hangi amaca (Purpose), kimin için (Actor), hangi tarihte (Milestone), nasıl bir bilgi teslim edeceksin?"</p>
                            <div class="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                <p class="text-sm text-slate-300">Örneğin; binanın "Enerji Performans Analizi (6D)" yapılacaksa, duvarın içindeki tuğlanın 3D derzlerini çizmene (LOG-Geometri) gerek yoktur. Duvarı tek bir düz çizgi olarak bırak, ama özelliklerine <code class="text-amber-400">U-Value (Isıl İletkenlik) = 0.35 W/m²K</code> değerini gir (LOI-Alfanümerik Bilgi). LOIN budur: Geometriyi düşük tut, bilgiyi maksimize et!</p>
                            </div>
                        </div>
                    `,
                    3: `
                        <div class="space-y-6">
                            <p><strong class="text-amber-400 text-lg">Sınıflandırma Sistemleri: Bilgisayarın Gözü Olmak,</strong></p>
                            <p>Bir duvar çizdiniz. Siz ona "Dış Cephe Duvarı" dediniz, mühendis "Tuğla Yüzey" dedi, metrajcı "Poz 15.120" dedi. Eğer herkes aynı objeye farklı isim verirse, metraj yazılımları (5D) ve tesis yönetim yazılımları (7D) o objeyi tanıyamaz.</p>
                            <h4 class="text-white font-bold text-lg mt-8 mb-4 border-b border-slate-700 pb-2">OmniClass ve Uniclass Dilleri</h4>
                            <p>Modelleme yaparken her objeye uluslararası geçerliliği olan bir "Barkod" atamak zorundayız.</p>
                            <ul class="space-y-2 text-sm text-slate-300 mb-4">
                                <li><b>Uniclass 2015 (İngiltere/ISO uyumlu):</b> Tüm yapı sektörünü (altyapı dahil) sınıflar. Örn: <code class="bg-slate-900 px-1 text-emerald-400">Ef_25_10</code> (Duvar Elemanları).</li>
                                <li><b>OmniClass (ABD):</b> Revit gibi yazılımların kökünde vardır. Table 21 Elements tablosu esastır. Örn: <code class="bg-slate-900 px-1 text-blue-400">21-02 10 10</code> (Dış Duvar).</li>
                            </ul>
                            <p class="text-amber-500 font-bold">Brutal Gerçek:</p>
                            <p class="text-sm text-slate-300">Projeyi modellediniz ama objelere bu sınıflandırma kodlarını (Classification Code) girmediniz. O model, görsel bir dijital maketten farksızdır. Veritabanına (Maliyet, İş Programı) veri aktaramazsınız. Tüm emeğiniz çöp olur.</p>
                        </div>
                    `
                },
                literature: [
                    "BIMForum Level of Development (LOD) Specification 2023",
                    "BS EN 17412-1:2020 (Level of Information Need)",
                    "OmniClass Construction Classification System"
                ],
                global: `
                    <p><b>Avrupa Standardı (LOIN):</b> "Sadece ihtiyaç duyulan geometriyi ve veriyi sağla" kuralı uygulanır. Aşırı detaylı çizim donanım israfı kabul edilir.</p>
                `,
                tr: `
                    <p class="text-red-700 font-bold mb-1">Sektör Travması: "Avan Projede LOD 400 İstemek"</p>
                    <p>İhale şartnamelerinde genellikle kopyala-yapıştır ile <i>"Tüm proje LOD 400 olacaktır"</i> yazılır. Oysa LOD 400 "İmalat/CNC Fabrika" detayıdır ve erken aşamada istenmesi mühendislik dışıdır.</p>
                `
            },
            3: {
                badge: "DERS KODU: BIM503",
                title: "openBIM ve Birlikte Çalışabilirlik (Interoperability)",
                ects: "8.0 AKTS",
                desc: "Farklı disiplinlerin (Mimar, Statiker, MEP) kapalı kaynaklı (proprietary) yazılımlarının sınırlarını aşarak, MVD ve IFC şemaları üzerinden kayıpsız veri transferi yapmasını hedefler.",
                outcomes: [
                    "IFC 4.3 şema yapısını ve EXPRESS-G dilinin temel hiyerarşisini analiz eder.",
                    "SAF (Structural Analysis Format) ile fiziksel modeli analitik modele dönüştürür.",
                    "BCF (BIM Collaboration Format) kullanarak çok disiplinli CDE platformlarında Issue yönetimi yapar."
                ],
                syllabus: [
                    { week: "Hafta 9", topic: "buildingSMART ve openBIM Felsefesi" },
                    { week: "Hafta 10", topic: "IFC 4.3 Şema Okuryazarlığı (EXPRESS-G)" },
                    { week: "Hafta 11", topic: "SAF ve Analitik Düğüm Toleransları (Node Adjustment)" },
                    { week: "Hafta 12", topic: "VDC: Çakışma Matrisi ve BCF Protokolü" }
                ],
                lectures: {
                    0: `
                        <div class="space-y-6">
                            <p><strong class="text-amber-400 text-lg">Yazılım Tekellerine Karşı Özgürlük Hareketi: openBIM,</strong></p>
                            <p>Sektöre atıldığınızda göreceğiniz en acı tablo şudur: "Mimarlar Revit kullanıyor, Statiker Tekla kullanıyor, Mekanikçi ArchiCAD kullanıyor... Birbirlerine dosya atamıyorlar!" Yıllarca her yazılım firması (Autodesk, Nemetschek, Trimble) kendi formatını (.rvt, .pln) sektöre dayatarak "Vendor Lock-in" (Tedarikçi Kilidi) yaratmıştır.</p>
                            <h4 class="text-white font-bold text-lg mt-8 mb-4 border-b border-slate-700 pb-2">buildingSMART ve Özgür Veri</h4>
                            <p>Açık kaynak savunucuları bir araya gelerek buildingSMART organizasyonunu kurdu ve dediler ki: "Binanın verisi hiçbir yazılım şirketinin tekelinde olamaz. Veri, formatlardan bağımsızdır!"</p>
                            <p class="text-sm text-slate-300">Bu dersin amacı size bir yazılımı kullanmayı öğretmek değil; yazılımların kendi aralarında nasıl "konuştuğunu" (Interoperability) öğretmektir. Bir devlet ihalesine girerken ".rvt formatında teslim edilecektir" diye yazan bir memur, yasadışı bir rekabet ihlali yapmaktadır. Doğrusu: "Açık standart olan IFC formatında teslim edilecektir" olmalıdır.</p>
                        </div>
                    `,
                    1: `
                        <div class="space-y-6">
                            <p><strong class="text-amber-400 text-lg">IFC 3D Bir PDF Değildir, Bir Veritabanıdır!</strong></p>
                            <p>IFC (Industry Foundation Classes) formatını dışa aktarırken (Export) yaşanan en büyük hezimet, mimarın IFC'yi sadece geometri aktaran bir araç (gelişmiş bir DWG veya 3D PDF) sanmasıdır.</p>
                            <h4 class="text-white font-bold text-lg mt-8 mb-4 border-b border-slate-700 pb-2">EXPRESS-G Veri Şeması</h4>
                            <p>Elinize bir IFC kod dizini (Not defteri ile açılmış hali) aldığınızda geometri görmezsiniz. İlişkisel bir veritabanı görürsünüz.</p>
                            <ul class="space-y-2 text-sm text-slate-300 font-mono mb-4">
                                <li><span class="text-amber-400">IfcProject:</span> En tepedeki kapsayıcı.</li>
                                <li><span class="text-emerald-400">IfcBuilding:</span> Projenin içindeki bina.</li>
                                <li><span class="text-blue-400">IfcBuildingStorey:</span> Binanın içindeki kat.</li>
                                <li><span class="text-red-400">IfcWallStandardCase:</span> Katın içindeki duvar.</li>
                            </ul>
                            <p class="text-sm text-slate-300">Eğer modelleme yazılımınızda "Katlardaki duvarlar" ilişkisini koparırsanız, IFC'yi export ettiğinizde duvarlar "Uzayda süzülen" sahipsiz geometrilere dönüşür (IfcBuildingElementProxy). Çıkan bu çöp data ile metraj alamaz, çakışma testi yapamazsınız.</p>
                        </div>
                    `,
                    2: `
                        <div class="space-y-6">
                            <p><strong class="text-amber-400 text-lg">Statik Mühendisinin Gözyaşları ve SAF Standardı,</strong></p>
                            <p>Gelelim mimar ile inşaat mühendisi arasındaki en kanlı çatışmaya. Mimar modeli çizer, IFC olarak statik mühendisine (SAP2000, SCIA vb.) yollar. Mühendis modeli açar ve "Bu çöp, hiçbir düğüm noktası birbirine değmiyor, sıfırdan çizeceğim" der.</p>
                            <h4 class="text-white font-bold text-lg mt-8 mb-4 border-b border-slate-700 pb-2">Neden Çöktü? B-Rep vs Analitik Model</h4>
                            <p class="text-sm text-slate-300 mb-4">IFC "Fiziksel" kütleyi (örneğin 30x60 bir hacim) aktarır. Oysa statik program hacimle ilgilenmez! O, kirişin tam ortasından geçen <b class="text-amber-400">1D hayali çizgi (Analitik Eksen)</b> ve mesnet noktalarıyla ilgilenir. Mimar kirişi kolonun kenarına sıfırladığında fiziksel olarak kusursuzdur, ancak 1D çizgiler havada kalır (Dışmerkezlik / Eccentricity).</p>
                            <div class="bg-blue-900/20 p-5 rounded-xl border border-blue-500/30">
                                <strong class="text-blue-400 block mb-2">Çözüm: SAF (Structural Analysis Format)</strong>
                                <p class="text-sm text-slate-300">Nemetschek Grubu Excel tabanlı, sadece 1D eksenleri, düğüm toleranslarını (Node Adjustment) ve yükleri aktaran açık kaynaklı SAF formatını geliştirdi. Artık fiziksel modeli IFC ile, analitik rijitlik modelini SAF ile göndermeyi öğreneceksiniz.</p>
                            </div>
                        </div>
                    `,
                    3: `
                        <div class="space-y-6">
                            <p><strong class="text-amber-400 text-lg">WhatsApp Şantiyesi İlkelliği ve BCF Protokolü,</strong></p>
                            <p>Sanal Şantiye (VDC) toplantılarında çakışmalar (Clash) bulunur. Geleneksel ve ilkel bir ofiste, çakışmanın ekran görüntüsü (Screenshot) alınır, kırmızıyla işaretlenir ve WhatsApp veya Mail üzerinden "Kiriş boruya giriyor, kaydırın" diye atılır. Kirişin hangi katta, hangi koordinatta olduğu meçhuldür.</p>
                            <h4 class="text-white font-bold text-lg mt-8 mb-4 border-b border-slate-700 pb-2">BIM Collaboration Format (BCF)</h4>
                            <p class="text-sm text-slate-300 mb-4">BCF, 3 boyutlu bir koordinat mesajlaşma sistemidir. Modelin kendisini değil, "Kamera Koordinatını, Yorumu, İlgili GUID (Obje ID) kodlarını" içeren çok hafif bir dosyadır (.bcfzip veya API bağlantısı).</p>
                            <p class="text-sm text-slate-300">Navisworks veya Solibri'de hatayı bulduğunuzda bir BCF Issue yaratırsınız. Mimar Revit'ini açar, BCF panelinden o mesaja çift tıklar. Revit kamerası saniyeler içinde o hatanın olduğu X, Y, Z koordinatına uçarak mimarı hatanın olduğu yere kilitler. İletişim, veri hiyerarşisine bağlanmıştır.</p>
                        </div>
                    `
                },
                literature: [
                    "ISO 16739-1:2018 (Industry Foundation Classes)",
                    "buildingSMART BCF (BIM Collaboration Format) XML Reference",
                    "Nemetschek Group SAF Format Specifications"
                ],
                global: `
                    <p><b>buildingSMART:</b> Model verilerinin uluslararası bağımsız açık format olan IFC ile paylaşılması zorunludur. Çakışmalar BCF dosyalarıyla kamera koordinatına uçarak yönetilir.</p>
                `,
                tr: `
                    <p class="text-red-700 font-bold mb-1">Sektör Travması: "IFC'yi 3D DWG Zannetmek"</p>
                    <p>Yerel kamu ihalelerinde yasadışı olmasına rağmen marka dayatılarak ".rvt formatında teslim edilecektir" yazılması sektördeki openBIM gelişimini ve veri bağımsızlığını baltalamaktadır.</p>
                `
            },
            4: {
                badge: "DERS KODU: BIM504",
                title: "Yönetimsel Protokoller ve Sözleşme Hukuku",
                ects: "6.0 AKTS",
                desc: "BIM sürecinin omurgası: İşveren gereksinimlerinin (EIR), hukuki ve teknik bağlayıcılığı olan bir BEP (BIM Uygulama Planı) dokümanına dönüştürülmesi sanatıdır.",
                outcomes: [
                    "ISO 19650-2 standartlarına uygun Sözleşme Öncesi ve Sonrası BEP hazırlar.",
                    "TIDP (Görev) ve MIDP (Ana Bilgi Teslimat) matrislerini hiyerarşik olarak kurgular.",
                    "Fikri mülkiyet (IP) hakları ve tasarım sorumluluğu (Design Liability) sınırlarını belirler."
                ],
                syllabus: [
                    { week: "Hafta 13", topic: "Sözleşme Hukuku ve BIM Protocol (CIC/AIA)" },
                    { week: "Hafta 14", topic: "BEP (BIM Execution Plan) Hazırlık Teknikleri" },
                    { week: "Hafta 15", topic: "MIDP ve TIDP Hiyerarşisi" },
                    { week: "Hafta 16", topic: "RACI Matrisi ve Hukuki Sorumluluk Atamaları" }
                ],
                lectures: {
                    0: `
                        <div class="space-y-6">
                            <p><strong class="text-amber-400 text-lg">Hapse Girmek İstemiyorsan Bu Dersi Dinle: Tasarım Sorumluluğu,</strong></p>
                            <p>Bir bina çöktüğünde veya sistem hatalı çalıştığında, hukuk mahkemesi "Bu model kimindi?" diye sorar. BIM projelerinde herkesin dosyası üst üste bindiği (Federated Model) için, işler ters gittiğinde "Suçlu kim?" sorusunu cevaplamak geleneksel projelere göre çok daha karışıktır.</p>
                            <h4 class="text-white font-bold text-lg mt-8 mb-4 border-b border-slate-700 pb-2">CIC BIM Protocol ve Fikri Mülkiyet (IP)</h4>
                            <p class="text-sm text-slate-300 mb-4">Statiker, mekanik modeldeki şaft boşluğunu referans alıp betonarme döşemeyi deldi. Ancak mekanikçi son anda şaftın yerini değiştirdi ve bilgi vermedi. Bina döküldü, şaft yanlış yerde. Suçlu kim? İngiliz İnşaat Konseyi (CIC) der ki: "Referans alınan model (Background Model) bir garanti içermez. Sorumluluk, o delik tasarımını kendi modeline ekleyen statikerdedir."</p>
                            <p class="text-sm text-slate-300">Bir diğer sanrı: İşveren parayı bastı, modeli aldı. Gidip o modeli kopyalayıp yan arsaya aynısını yapabilir mi? Hayır! Modellerin telif hakkı onu yazanlara aittir, işverene sadece "o binayı inşa etme ve işletme lisansı" verilir.</p>
                        </div>
                    `,
                    1: `
                        <div class="space-y-6">
                            <p><strong class="text-amber-400 text-lg">Dostlar Alışverişte Görsün Belgesi: Hatalı BEP'ler,</strong></p>
                            <p>Eğer bir ihaleyi kazandıysanız, işverene sunacağınız ilk ve en kritik sözleşme metni BEP (BIM Execution Plan - BIM Uygulama Planı)'dır. Türkiye'deki firmaların %90'ı, internetten buldukları jenerik bir BEP PDF'sini indirir, firma logosunu değiştirir ve teslim eder.</p>
                            <h4 class="text-white font-bold text-lg mt-8 mb-4 border-b border-slate-700 pb-2">BEP Bir Taahhütnamedir (Smart Contract Öncesi)</h4>
                            <div class="bg-red-900/20 p-5 rounded-xl border border-red-500/30 mb-4">
                                <p class="text-sm text-slate-300">O kopyalayıp yapıştırdığınız BEP'in 48. sayfasında "Tüm modeller LOD 400 seviyesinde, COBie standartlarında haftalık teslim edilecektir" yazar. Siz o belgeyi imzaladığınız an, 10 milyon liralık bir yazılım, sensör ve personel ordusunu sözleşmesel olarak taahhüt etmiş olursunuz. Teslim edemezseniz hakedişiniz kesilir!</p>
                            </div>
                            <p class="text-sm text-slate-300">Gerçek bir BEP; klasör isimlendirme standartlarından, kullanılacak yazılım versiyonlarına, CDE sunucusunun hangi ülkede yedekleneceğine kadar projenin Anayasasıdır.</p>
                        </div>
                    `,
                    2: `
                        <div class="space-y-6">
                            <p><strong class="text-amber-400 text-lg">Neyi, Ne Zaman, Kim Teslim Edecek? (TIDP & MIDP)</strong></p>
                            <p>BIM Koordinatörü cuma akşamı modeli birleştirmek için bekler, ancak dosyalar gelmez. Neden? Çünkü "görev matrisi" oluşturulmamıştır. ISO 19650 der ki; model bir bütün olarak değil, "Bilgi Konteynerleri" olarak parçalara bölünerek yönetilir.</p>
                            <h4 class="text-white font-bold text-lg mt-8 mb-4 border-b border-slate-700 pb-2">TIDP (Task) -> MIDP (Master) Hiyerarşisi</h4>
                            <ul class="space-y-2 text-sm text-slate-300">
                                <li><strong class="text-blue-400">TIDP (Bireysel Bilgi Teslimat Planı):</strong> Mekanik taşeron kendi içinde bir program yapar: "Pompaları salı günü, havalandırma kanallarını perşembe günü teslim edeceğim."</li>
                                <li><strong class="text-emerald-400">MIDP (Ana Bilgi Teslimat Planı):</strong> Ana Yüklenici (Lead Appointed Party), tüm taşeronların TIDP'lerini alır ve devasa bir master iş programına (MIDP) bağlar. Hangi dosyanın ne zaman CDE'ye yükleneceği sözleşmesel bir KPI (Performans Kriteri) haline gelir.</li>
                            </ul>
                        </div>
                    `,
                    3: `
                        <div class="space-y-6">
                            <p><strong class="text-amber-400 text-lg">Sorumluluktan Kaçış Yok: RACI Matrisi,</strong></p>
                            <p>Büyük projelerde kaosun en büyük sebebi "Bunu kimin kontrol edeceği belli değildi" veya "Bana bilgi verilmedi" cümleleridir. Profesyonel yönetimde bu cümlelerin mazereti yoktur, RACI matrisi vardır.</p>
                            <h4 class="text-white font-bold text-lg mt-8 mb-4 border-b border-slate-700 pb-2">R.A.C.I. Nedir?</h4>
                            <div class="grid grid-cols-2 gap-4 text-sm text-slate-300">
                                <div class="bg-slate-800 p-3 rounded"><strong class="text-amber-400 block">R (Responsible - Sorumlu):</strong> İşi bizzat yapan kişi. (Örn: Modelleyen Mimar).</div>
                                <div class="bg-slate-800 p-3 rounded"><strong class="text-red-400 block">A (Accountable - Hesap Veren):</strong> İşin doğruluğundan yasal olarak sorumlu olan ve onaylayan kişi. (Örn: Proje Müdürü. A harfi her görev için sadece 1 kişi olabilir).</div>
                                <div class="bg-slate-800 p-3 rounded"><strong class="text-blue-400 block">C (Consulted - Danışılan):</strong> İş yapılmadan önce fikri alınan uzman. İki yönlü iletişim. (Örn: Yangın Danışmanı).</div>
                                <div class="bg-slate-800 p-3 rounded"><strong class="text-emerald-400 block">I (Informed - Bilgilendirilen):</strong> İş bittikten sonra tek yönlü bilgilendirilen kişi. (Örn: Şantiye Şefi).</div>
                            </div>
                            <p class="text-sm text-slate-300 mt-4">CDE platformlarındaki onay akışları (Gateways) rastgele değil, projenin en başında kurulan bu RACI matrisine göre kodlanır.</p>
                        </div>
                    `
                },
                literature: [
                    "ISO 19650-2:2018 (Delivery phase of the assets)",
                    "CIC BIM Protocol (Construction Industry Council)",
                    "AIA E203 Building Information Modeling and Digital Data Exhibit"
                ],
                global: `
                    <p><b>CIC BIM Protocol:</b> RACI (Responsible, Accountable, Consulted, Informed) matrisi ile olası hatalarda (çöken bir kolon vs) hukuki sorumluluğun hangi disipline ait olduğu sözleşmeye bağlanır.</p>
                `,
                tr: `
                    <p class="text-red-700 font-bold mb-1">Sektör Travması: "Dostlar Alışverişte Görsün BEP'leri"</p>
                    <p>Türkiye'de BEP genellikle projeye başlarken değil, proje bitiminde "teslim evrakı tam görünsün" diye internetten bulunmuş kopyala-yapıştır şablonlarla doldurulur. Hukuki bağlayıcılığı yansıtmaz.</p>
                `
            },
            5: {
                badge: "DERS KODU: BIM505",
                title: "Dijital İkiz ve 7D İşletme (O&M)",
                ects: "8.0 AKTS",
                desc: "İnşaat sonrasında binanın 50 yıllık yaşam ömründeki tesis yönetiminin (Facility Management - FM) statik BIM modelinden Dinamik bir Dijital İkize dönüştürülmesi süreci.",
                outcomes: [
                    "As-Built (PIM) modelindeki verileri İşletme Modeline (AIM) dönüştürür.",
                    "COBie spreadsheet veri dökümlerini Tesis Yönetimi (CAFM) yazılımlarına entegre eder.",
                    "Smart Contracts (Akıllı Sözleşmeler) ve IoT sensör verilerinin model üzerindeki etkisini kurgular."
                ],
                syllabus: [
                    { week: "Hafta 17", topic: "As-Built Modelin AIM'e (Asset Information Model) Dönüşümü" },
                    { week: "Hafta 18", topic: "COBie Spreadsheet Anatomisi ve Veri Çekimi" },
                    { week: "Hafta 19", topic: "IoT, Sensör Verisi ve Digital Twin Entegrasyonu" },
                    { week: "Hafta 20", topic: "Smart Contracts ve Blockchain Tabanlı Hakedişler" }
                ],
                lectures: {
                    0: `
                        <div class="space-y-6">
                            <p><strong class="text-amber-400 text-lg">PIM'den AIM'e Geçiş: İnşaat Bitti, Gerçek Sınav Başlıyor,</strong></p>
                            <p>Proje teslim edildi, kurdele kesildi. Müteahhit parasını aldı gitti. Peki işletmeci (Facility Manager) ne yapacak? Elinde inşaat döneminde üretilmiş, milyonlarca obje, geçici iskele veya kalıp verisi barındıran 5 GB'lık devasa bir PIM (Project Information Model) var.</p>
                            <h4 class="text-white font-bold text-lg mt-8 mb-4 border-b border-slate-700 pb-2">AIM (Asset Information Model - Varlık Bilgi Modeli)</h4>
                            <p class="text-sm text-slate-300">Hastanenin tesisat yöneticisi elinde tabletle sahada dolaşırken 5 GB'lık Revit dosyasını açamaz. Onun binanın "inşa süreciyle" veya kalıp demiriyle işi yoktur. Onun asansörün garanti belgesiyle, HVAC pompasının son bakım tarihiyle işi vardır.</p>
                            <div class="bg-emerald-900/20 p-5 rounded-xl border border-emerald-500/30">
                                <p class="text-sm text-emerald-200">İşte bu yüzden ISO 19650-3 devreye girer. İşletme safhasında model arındırılır (Purge). Sadece işletmeye yönelik bilgi, geometri ile eşleştirilerek hafifletilmiş bir AIM (Asset Information Model) yapısına dönüştürülür. AIM, tesis yönetim (CAFM/CMMS) yazılımlarının merkez veri tabanıdır.</p>
                            </div>
                        </div>
                    `,
                    1: `
                        <div class="space-y-6">
                            <p><strong class="text-amber-400 text-lg">Neden Herkes COBie'den Nefret Eder ama COBie'ye Muhtaçtır?</strong></p>
                            <p>Amerika ve İngiltere'deki devlet projelerinde zorunlu olan COBie (Construction Operations Building Information Exchange), aslında sönük görünümlü, yüzlerce sekmeli devasa bir <b>Excel Tablosudur.</b></p>
                            <h4 class="text-white font-bold text-lg mt-8 mb-4 border-b border-slate-700 pb-2">Neden 3D Görsel Yerine Excel?</h4>
                            <p class="text-sm text-slate-300 mb-4">Bir hastanede 10.000 tane kapı, 5.000 tane aydınlatma armatürü vardır. Tesis yönetimi yazılımları (IBM Maximo, SAP vb.) 3 boyutlu grafikleri okuyamaz, veri tabloları (Data Schema) ile çalışırlar.</p>
                            <ul class="space-y-2 text-sm text-slate-300">
                                <li>Müteahhit inşaat boyunca CDE üzerinden COBie tablolarını doldurur: <i>Kapı (GUID: 1234) -> Zemin Kat -> Üretici: X Firması -> Garanti Bitiş: 2028.</i></li>
                                <li>Bina bitince bu Excel tablosu işletme yazılımına "İçe Aktar (Import)" edilir. Sistem saniyeler içinde 10.000 kapının bakım takvimini otomatik oluşturur.</li>
                            </ul>
                            <p class="text-sm text-red-400 font-bold mt-2">Kötü Haber: Modelinizi başından beri UniClass veya OmniClass gibi bir standarda göre kodlamadıysanız, COBie tablonuz hatalı çıkar ve işveren o modeli reddeder.</p>
                        </div>
                    `,
                    2: `
                        <div class="space-y-6">
                            <p><strong class="text-amber-400 text-lg">3D Model Dijital İkiz (Digital Twin) Değildir!</strong></p>
                            <p>Sektörde çok fazla "Buzzword" (Pazarlama terimi) döner. Harika kaplanmış (Render), içinde gezilebilen bir BIM modeline "Dijital İkiz" diyip satmaya çalışırlar. Yanlış!</p>
                            <h4 class="text-white font-bold text-lg mt-8 mb-4 border-b border-slate-700 pb-2">Gerçek Bir Dijital İkizin Anatomisi</h4>
                            <p class="text-sm text-slate-300 mb-4">Bir şeye Dijital İkiz diyebilmeniz için, <b>fiziksel varlık ile dijital model arasında iki yönlü, gerçek zamanlı (Real-time) veri akışı</b> olmalıdır.</p>
                            <div class="bg-blue-900/20 p-5 rounded-xl border border-blue-500/30">
                                <ul class="space-y-2 text-sm text-slate-300">
                                    <li><strong class="text-blue-400">Adım 1: BIM (Veri Tabanı)</strong> Geometrik ve yasal statik veriyi sağlar.</li>
                                    <li><strong class="text-emerald-400">Adım 2: IoT (Sensörler)</strong> Dinamik veriyi sağlar. Odanın şu anki CO2 oranı veya pompanın titreşim frekansı.</li>
                                    <li><strong class="text-amber-400">Adım 3: AI (Makine Öğrenimi)</strong> Veriyi okur ve <i>"Pompadaki bu titreşim grafiğine göre cihaz 3 gün sonra arıza verecek, bakım ekibini gönder"</i> (Kestirimci Bakım) kararını verir.</li>
                                </ul>
                            </div>
                            <p class="text-sm text-slate-300 mt-2">BIM, dijital ikizin sadece iskeletidir. Sensör ve algoritma yoksa, o sadece donuk bir 3D modeldir.</p>
                        </div>
                    `,
                    3: `
                        <div class="space-y-6">
                            <p><strong class="text-amber-400 text-lg">Hakedişlerin Geleceği: Blockchain ve Akıllı Sözleşmeler,</strong></p>
                            <p>Dersimizin ve müfredatımızın finalindeyiz. İnşaat sektörünün en büyük problemi "Güven" ve "Geç Ödemeler" dir. Ana yüklenici parasını alır, ama taşerona hakedişini 90 gün boyunca ödemez. Sistem insan vicdanına bırakılmıştır.</p>
                            <h4 class="text-white font-bold text-lg mt-8 mb-4 border-b border-slate-700 pb-2">Code is Law (Kod Kanundur)</h4>
                            <p class="text-sm text-slate-300 mb-4">Web3 ve Blockchain (Ethereum tabanlı Smart Contracts), insan faktörünü ve rüşveti ortadan kaldırır. Nasıl mı?</p>
                            <ul class="space-y-3 text-sm text-slate-300">
                                <li>1. Taraflar anlaşır ve hakediş bütçesi dijital sözleşmeye (Smart Contract) kripto (veya tokenize edilmiş fiat para) olarak kilitlenir. Patron bile o parayı geri çekemez.</li>
                                <li>2. Modeldeki 100 tonluk çelik kolonun <b>GUID kodu</b> bu sözleşmeye bağlanır.</li>
                                <li>3. Lazer tarama drone'u veya bağımsız müşavir (Oracle) o çeliğin şantiyede yerinde olduğunu sisteme "Onaylandı" olarak girer.</li>
                                <li>4. Kod tetiklenir (IF Status=Erected THEN Pay). İşverenin veya müteahhidin "durun" demesine fırsat kalmadan, para saniyeler içinde işçinin/taşeronun cüzdanına düşer.</li>
                            </ul>
                            <p class="text-amber-500 font-bold mt-4">İşte BIM Master vizyonu budur. Çizgi çizmek değil, sektörü kökünden değiştirecek algoritmaları ve sistemleri yönetmektir. Mezuniyetiniz hayırlı olsun.</p>
                        </div>
                    `
                },
                literature: [
                    "ISO 19650-3:2020 (Operational phase of the assets)",
                    "BS 1192-4 (COBie - Construction Operations Building Information Exchange)",
                    "Digital Built Britain - Digital Twin Guidelines"
                ],
                global: `
                    <p><b>COBie & ISO 19650-3:</b> Her asansörün, klimanın garanti süresi, bakım takvimi ve parça kodları modelden süzülerek (COBie Excel formatında) hastane/havaalanı işletmecisine devredilir.</p>
                `,
                tr: `
                    <p class="text-red-700 font-bold mb-1">Sektör Travması: "Klasör Dolusu Kağıtla Tesis Yönetimi"</p>
                    <p>Devasa projelerde (Şehir Hastaneleri vb.) milyonlarca liralık As-Built model inşaat bitince arşive atılır. Bina yönetimi, eski usül klasör dolusu PDF kılavuzlar ve kopuk Excel tablolarıyla yürütülür.</p>
                `
            }
        };

export const dataIsoParts = {
            1: {
                title: "ISO 19650-1: Kavramlar ve İlkeler",
                focus: "Bilgi Yönetiminin Felsefesi",
                desc: "Tüm ISO 19650 serisinin temelidir. Bilgi yönetiminin neden sadece 3D modelleme olmadığını, yapıların dijital yaşam döngüsü boyunca 'verinin' nasıl bir stratejik varlığa dönüştüğünü tanımlar. DIKW (Veri-Bilgi-Bilgelik) hiyerarşisinin inşaat sektöründeki karşılığıdır.",
                points: ["Bilgi Konteyneri (Information Container) kavramının tanımı.", "Ortak Veri Ortamı (CDE) süreçleri ve mantığı.", "Bilgi hiyerarşisi (OIR, PIR, AIR, EIR) ilkeleri."],
                legal: "Sözleşmelerde kullanılacak temel terminolojinin standartlaştırılmasını yasal güvenceye bağlar."
            },
            2: {
                title: "ISO 19650-2: Yapım (Teslim) Aşaması",
                focus: "Proje Süresi Boyunca Bilgi Yönetimi",
                desc: "Bir yapının inşaat ve tasarım aşamasında (Project Delivery Phase) bilginin nasıl üretileceğini, denetleneceğini ve teslim edileceğini belirler. 8 Adımlı Bilgi Yönetim Sürecini detaylandırarak, tarafların (Yüklenici, Alt Yüklenici, İşveren) rollerini belirler.",
                points: ["BIM Uygulama Planı (BEP) hazırlama yükümlülükleri.", "TIDP ve MIDP (Bilgi Teslimat Programları) hiyerarşisi.", "PIM (Project Information Model) oluşturma adımları."],
                legal: "İhale şartnameleri, sözleşme ekleri ve hakediş onay süreçleri için doğrudan yasal referanstır."
            },
            3: {
                title: "ISO 19650-3: İşletme (Varlık) Aşaması",
                focus: "Bina Ömrü Boyunca Bilgi Akışı",
                desc: "Yapı inşa edildikten sonra başlayan işletme ve bakım (O&M - Facility Management) aşamasına odaklanır. Bu aşama, binanın ömrünün %80'ini ve maliyetinin en büyük kısmını oluşturur. Sensör verileri (IoT) ve tesis yönetim programları ile entegrasyonu tanımlar.",
                points: ["AIM (Asset Information Model) yapısının sürekliliği.", "COBie (Construction Operations Building Information Exchange) standartları.", "Bakım-Onarım senaryolarında anlık bilgi güncelleme prosedürleri."],
                legal: "Bina mülk devir teslim sözleşmeleri ve profesyonel Tesis Yönetimi (FM) ihalelerinin yasal dayanağıdır."
            },
            4: {
                title: "ISO 19650-4: Bilgi Değişimi Detayları",
                focus: "openBIM ve Veri Dürüstlüğü",
                desc: "Farklı disiplinler ve yazılımlar arasında verinin kayıpsız, şeffaf ve güvenilir şekilde nasıl aktarılacağını (Information Exchange) belirler. Çeviri hatalarından kaynaklanan zaman ve para kayıplarını sıfırlamayı amaçlar.",
                points: ["IFC (Industry Foundation Classes) güncel şemaları.", "MVD (Model View Definition) standartları.", "Veri doğrulama (Validation/Verification) süreçleri."],
                legal: "Kamu ihalelerinde tekelleşmeyi (yazılım markası dayatmayı) engellemek için yasal openBIM zorunluluğunun temelidir."
            },
            5: {
                title: "ISO 19650-5: Güvenlik Odaklı Bilgi Yönetimi",
                focus: "Siber Güvenlik & Hassas Varlık Koruma",
                desc: "Hassas yapıların (Hastaneler, Savunma Sanayii Tesisleri, Altyapı Projeleri) dijital ikizlerinin siber saldırılara, sabotajlara veya veri hırsızlığına karşı nasıl korunacağını tanımlar. 'Güvenlik Bilincine Sahip' (Security-Minded) bir yönetim kültürü oluşturur.",
                points: ["Rol Tabanlı Erişim Yetkileri (RBAC - Role Based Access Control).", "Hassas Veri Sınıflandırma ve Şifreleme standartları.", "Güvenlik Açığı Değerlendirmeleri ve Tehdit Senaryoları."],
                legal: "Kritik Kamu Altyapıları Güvenlik Kanunları ve Ulusal Güvenlik sözleşmelerinin temel siber kalkanıdır."
            }
        };

export const dataPyramid = {
            oir: {
                title: "OIR (Organizational Information Requirements)",
                desc: "Organizasyonel Bilgi Gereksinimleri, bir kurumun veya şirketin kendi ticari ve yönetimsel hedeflerini gerçekleştirmek için ihtiyaç duyduğu üst düzey bilgileri tanımlar. BIM sürecinin en tepesindeki stratejik kararlardır.",
                example: "Örnek: Bir gayrimenkul yatırım ortaklığının, 'Tüm binaların yıllık karbon ayak izini ve portföy genelindeki enerji giderlerini tek bir merkezden izlemek istemesi' OIR'ı tetikler."
            },
            pir: {
                title: "PIR (Project Information Requirements)",
                desc: "Proje Bilgi Gereksinimleri, belirli bir yapım veya tasarım projesinin teslim edilmesi için gerekli olan stratejik bilgileri tanımlar. Kurumun hedeflerinin (OIR), o spesifik projeye uyarlanmış halidir.",
                example: "Örnek: 'İnşa edilecek hastanenin acil servis departmanında, ambulans yanaşma ve hasta transfer sürelerinin sanal simülasyonlarla (4D) test edilerek doğrulanması' talebi."
            },
            air: {
                title: "AIR (Asset Information Requirements)",
                desc: "Varlık Bilgi Gereksinimleri, binanın teslim edildikten sonraki işletme ve bakım aşamasında ihtiyaç duyulacak tüm teknik özellikleri tanımlar. Mekanik cihazların ömürleri, garanti süreleri, bakım periyotları bu kapsama girer.",
                example: "Örnek: 'Tüm jeneratör ve asansör sistemlerinin marka, model, garanti başlangıcı ve parça kodlarının COBie şablonunda modele işlenmiş olarak teslim edilmesi' zorunluluğu."
            },
            eir: {
                title: "EIR (Exchange Information Requirements)",
                desc: "Bilgi Değişimi Gereksinimleri, ihaleye çıkarken işverenin yüklenicilerden talep ettiği tüm teknik, yönetimsel ve ticari teslim standartlarını detaylandıran en kritik sözleşme ekidir. Piramidin en tabanında, sahaya doğrudan dokunan kısımdır.",
                example: "Örnek: 'Modellerin IFC 4.3 formatında teslim edilmesi, çakışmaların en fazla 5mm toleransla Navisworks üzerinde raporlanması ve her disiplinin LOD 350 detayında çalışması' talebi."
            }
        };

export const dataCdeStates = {
            wip: {
                filename: "PRJ-MST-XX-ZZ-M3-A-0001",
                suitability: "S0 (Tasarım Aşamasındaki İç Taslak)",
                revision: "P01.01 (Onaylanmamış iç çalışma taslağı)",
                access: "Sadece ilgili disiplinin yazar kadrosu (Örn: Mimarlar)",
                rule: "WIP (Work in Progress) aşamasındaki veriler henüz onaylanmamış tasarımlardır. Başka disiplinler tarafından referans (XREF/Link) alınamaz. Revizyon kodundaki ondalık (P01.01), dosyanın henüz onaylanmayan iç iterasyonlarını gösterir."
            },
            shared: {
                filename: "PRJ-MST-XX-ZZ-M3-A-0001",
                suitability: "S1 (Koordinasyon ve Çakışma Testine Uygun)",
                revision: "P01 (Onaylanmış paylaşım revizyonu)",
                access: "Tüm disiplin yazarları, koordinatörler ve işveren temsilcileri",
                rule: "Shared (Paylaşılan) aşamasına gelen model, disiplin yöneticisi tarafından onaylanmış ve çakışma (Clash Detection) testleri için hazır hale gelmiştir. Diğer disiplinler bu dosyayı güvenle referans alarak kendi tasarımlarını koordine edebilirler. Ondalık kaldırılır (P01)."
            },
            published: {
                filename: "PRJ-MST-XX-ZZ-M3-A-0001",
                suitability: "A1 (İmalat ve Şantiyede Yapıma Uygun - As-Built)",
                revision: "C01 (Resmi sözleşmesel hakediş / kabul revizyonu)",
                access: "Yüklenici şantiye ekipleri, alt yükleniciler, müşavir ve işveren",
                rule: "Published (Yayınlanan) aşaması, işverenin veya müşavirin resmi onayından geçmiş olan imalat (As-Built) modelidir. Sahadaki imalatlar ve hakediş ödemeleri sadece bu statüdeki bilgi konteynerleri baz alınarak gerçekleştirilebilir. Revizyon kodu 'C' (Contractual) ön ekini alır."
            },
            archived: {
                filename: "PRJ-MST-XX-ZZ-M3-A-0001",
                suitability: "CR (Arşivlenmiş Tarihsel Kayıt)",
                revision: "C01.1 (Tamamlanmış proje dijital hafızası)",
                access: "Sistem yöneticileri, hukuki danışmanlar ve mülk sahibi",
                rule: "Archived (Arşiv) alanı, tamamlanan projenin tüm yasal süreçlerini, hakediş geçmişini ve As-Built durumunu dondurulmuş şekilde saklayan dijital hafızadır. İleride yaşanabilecek hukuki uyuşmazlıklarda delil niteliği taşır."
            }
        };

export const dataLCAStages = {
            'A': {
                title: "Ürün ve İnşaat Süreci (A1-A5)",
                type: "Gömülü Karbon (Embodied)",
                desc: "Malzemelerin doğadan çıkarılması (A1), fabrikaya nakliyesi (A2), üretimi (A3), şantiyeye nakliyesi (A4) ve inşa süreci (A5). Bu aşamadaki emisyonlar, bina henüz açılmadan atmosfere salınmış olan 'Gömülü Karbon'u temsil eder.",
                bimRule: "Geometrik Hacim (QTO) × Malzeme Yoğunluğu × EPD (Çevresel Ürün Beyanı) Karbon Faktörü.",
                percentage: "55",
                color: "bg-emerald-500"
            },
            'B': {
                title: "Kullanım ve İşletme Aşaması (B1-B7)",
                type: "Operasyonel Karbon (Operational)",
                desc: "Binanın ömrü boyunca (genellikle 50-60 yıl) harcadığı ısıtma, soğutma, havalandırma (B6) ve su kullanımı (B7). Ayrıca bakım, onarım ve malzeme değişimleri (B1-B5) de bu faza dahildir.",
                bimRule: "Enerji Modeli (BEM) simülasyonları × İklimsel Veri (EPW) × Yıllık Şebeke Emisyon Faktörü.",
                percentage: "40",
                color: "bg-amber-500"
            },
            'C': {
                title: "Ömür Sonu / Yıkım Aşaması (C1-C4)",
                type: "Gömülü Karbon (Yıkım)",
                desc: "Binanın ekonomik ömrünü tamamladığında gerçekleşen yıkım işlemi (C1), atıkların nakliyesi (C2), atık işleme (C3) ve düzenli depolama/bertaraf (C4) süreçlerini kapsar.",
                bimRule: "Modeldeki yapısal elemanların sökülebilirlik indeksleri (Deconstructability) ve tahmini atık taşıma mesafeleri.",
                percentage: "5",
                color: "bg-slate-700"
            },
            'D': {
                title: "Sistem Sınırları Ötesi (D)",
                type: "Döngüsel Ekonomi Potansiyeli",
                desc: "Bu faz bir emisyon değil, bir 'kazanç' potansiyelidir. Yıkılan binadan çıkan malzemelerin geri dönüştürülmesi (örn: çelik), yeniden kullanılması veya enerji geri kazanımı (yakma) ile doğaya sağlanan faydayı ölçer.",
                bimRule: "Malzeme Pasaportları (Material Passports) ile objelerin geri dönüştürülebilirlik oranlarının meta-veri olarak saklanması.",
                percentage: "+Kazanç",
                color: "bg-blue-500"
            }
        };

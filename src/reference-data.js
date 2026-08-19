const VERIFIED_AT = "2026-08-19T22:00:00.000Z";
export const REFERENCE_DATA_VERSION = "2026-08-20.2";

const TYC_SOURCE = "https://www.myk.gov.tr/images/articles/TYC/Tyc_bilgi_merkezi/Seviye_Tanimlay%C4%B1cilari/TYC_Seviye_Tanimlayicilari2.pdf";
const TYC_PAGE = "https://myk.gov.tr/tr/page/90";
const TYC_LEGAL = "https://www.myk.gov.tr/images/articles/TYC/Tyc_bilgi_merkezi/mevzuat_duzenlemeleri/TYC_Belgesi.pdf";
const EQF_SOURCE = "https://europass.europa.eu/en/description-eight-eqf-levels";
const EQF_DISPLAY_TR = "https://europass.europa.eu/tr/description-eight-eqf-levels";
const EQF_LEGAL = "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32017H0615(01)";

export const qualificationFrameworks = Object.freeze([
  {
    id: "tyc",
    code: "TYÇ",
    nameTr: "Türkiye Yeterlilikler Çerçevesi",
    nameEn: "Turkish Qualifications Framework",
    jurisdiction: "Türkiye",
    dimensions: ["Bilgi", "Beceri", "Yetkinlik"],
    officialSourceUrl: TYC_PAGE,
    descriptorSourceUrl: TYC_SOURCE,
    legalSourceUrl: TYC_LEGAL,
    verifiedAt: VERIFIED_AT,
    sourceStatus: "official"
  },
  {
    id: "eqf",
    code: "AYÇ/EQF",
    nameTr: "Avrupa Yeterlilikler Çerçevesi",
    nameEn: "European Qualifications Framework",
    jurisdiction: "Avrupa Birliği",
    dimensions: ["Knowledge", "Skills", "Responsibility and autonomy"],
    officialSourceUrl: EQF_SOURCE,
    legalSourceUrl: EQF_LEGAL,
    verifiedAt: VERIFIED_AT,
    sourceStatus: "official"
  }
]);

export const qualificationDatasetRegistry = Object.freeze([
  {
    id: "tyc-portal",
    datasetName: "Türkiye Yeterlilikler Veri Tabanı",
    publisherName: "Mesleki Yeterlilik Kurumu",
    coverageNote: "Türkiye'de düzenlenen yeterliliklerin kamuya açık portal üst verisi; bu pilot seçki eksiksiz değildir ve portalda bulunmak TYÇ'ye yerleştirildiği anlamına gelmez.",
    accessUrl: "https://portal.tyc.gov.tr/",
    documentationUrl: "https://www.tyc.gov.tr/sayfa/turkiye-yeterlilikler-veri-tabani-i2d7fe7ae-2bef-4c53-bf91-1b8a02259823.html",
    dataFormats: ["HTML portal", "manual verified snapshot"],
    licenceStatus: "reuse_terms_not_stated",
    licenceNote: "Yalnız sınırlı kamu üst verisi tutulur; otomatik veya tam içerik alımı kapalıdır.",
    ingestionStatus: "manual_snapshot_only",
    automatedIngestionEnabled: false,
    verifiedAt: "2026-08-19T23:30:00.000Z"
  },
  {
    id: "europass-qdr",
    datasetName: "Qualifications Dataset Register / European Data Portal",
    publisherName: "European Commission / Europass",
    coverageNote: "Ülke ve veri sağlayıcı kapsamı değişebilir; ELM tabanlı yeterlilik ve öğrenme fırsatı veri setleri.",
    accessUrl: "https://europa.eu/europass/qdr/",
    documentationUrl: "https://europass.europa.eu/en/stakeholders/qdr",
    dataFormats: ["ELM v3", "JSON-LD", "TTL", "SPARQL"],
    licenceStatus: "open_data_declared_terms_check_required",
    licenceNote: "Açık veri beyanı vardır; her dağıtımın kapsamı ve yeniden kullanım koşulları canlı alımdan önce ayrıca doğrulanır.",
    ingestionStatus: "manual_snapshot_only",
    automatedIngestionEnabled: false,
    verifiedAt: "2026-08-19T23:30:00.000Z"
  }
]);

export const officialQualificationReferences = Object.freeze([
  { qualificationCode: "TR0030009160", qualificationTitle: "Makine Resim ve Konstrüksiyon Ön Lisans Diploması", responsibleInstitution: "Kütahya Dumlupınar Üniversitesi", qualificationType: "Ön Lisans Diploması (Mesleki)", orientation: "Mesleki", tycLevel: 5, eqfLevel: 5, placementStatus: "not_placed", levelStatus: "portal_detail_provisional", sourceRegistryId: "tyc-portal", sourceUrl: "https://portal.tyc.gov.tr/yeterlilik/makine-resim-ve-konstruksiyon-on-lisans-diplomasi-TR00309160.html" },
  { qualificationCode: "TR0030008977", qualificationTitle: "Büro Yönetimi ve Yönetici Asistanlığı Ön Lisans Diploması", responsibleInstitution: "Kütahya Dumlupınar Üniversitesi", qualificationType: "Ön Lisans Diploması", orientation: "Mesleki", tycLevel: 5, eqfLevel: null, placementStatus: "placement_not_verified", levelStatus: "portal_list_provisional", sourceRegistryId: "tyc-portal", sourceUrl: "https://portal.tyc.gov.tr/yeterlilikarama?belgetipi=9&page=46" },
  { qualificationCode: "TR0030009146", qualificationTitle: "İç Mimarlık Lisans Diploması", responsibleInstitution: "Kütahya Dumlupınar Üniversitesi", qualificationType: "Lisans Diploması", orientation: "Akademik", tycLevel: 6, eqfLevel: null, placementStatus: "placement_not_verified", levelStatus: "portal_list_provisional", sourceRegistryId: "tyc-portal", sourceUrl: "https://portal.tyc.gov.tr/yeterlilik/ic-mimarlik-lisans-diplomasi-TR00309146.html" },
  { qualificationCode: "TR0030009064", qualificationTitle: "Biyokimya Lisans Diploması", responsibleInstitution: "Kütahya Dumlupınar Üniversitesi", qualificationType: "Lisans Diploması", orientation: "Akademik", tycLevel: 6, eqfLevel: 6, creditValueEcts: 240, placementStatus: "not_placed", levelStatus: "portal_detail_provisional", sourceRegistryId: "tyc-portal", sourceUrl: "https://tyc.gov.tr/yeterlilik/biyokimya-lisans-diplomasi-TR0030009064.html" },
  { qualificationCode: "TR0030009057", qualificationTitle: "Cebir ve Sayılar Teorisi Doktora Diploması", responsibleInstitution: "Kütahya Dumlupınar Üniversitesi", qualificationType: "Doktora Diploması", orientation: "Akademik", tycLevel: 8, eqfLevel: 8, creditValueEcts: 240, placementStatus: "not_placed", levelStatus: "portal_detail_provisional", sourceRegistryId: "tyc-portal", sourceUrl: "https://tyc.gov.tr/yeterlilik/cebir-ve-sayilar-teorisi-doktora-diplomasi-TR00309057.html" },
  { qualificationCode: "TR0030009011", qualificationTitle: "Devreler ve Sistemler Doktora Diploması", responsibleInstitution: "Kütahya Dumlupınar Üniversitesi", qualificationType: "Doktora Diploması", orientation: "Akademik", tycLevel: 8, eqfLevel: 8, creditValueEcts: 240, placementStatus: "not_placed", levelStatus: "portal_detail_provisional", sourceRegistryId: "tyc-portal", sourceUrl: "https://portal.tyc.gov.tr/yeterlilik/devreler-ve-sistemler-doktora-diplomasi-TR00309011.html" }
].map((item) => ({
  ...item,
  retrievedAt: item.creditValueEcts ? "2026-08-19T23:55:00.000Z" : "2026-08-19T23:30:00.000Z",
  metadataScope: "minimal_public_metadata",
  institutionalValidationRequired: true
})));

const tycDescriptors = [
  {
    level: 1,
    knowledge: "Kendisi ve çevresine ilişkin genel bilgiye sahip olma",
    skills: "Basit görevleri yerine getirmek için gerekli temel beceriye sahip olma",
    competence: "Basit görevleri rehberlik ve gözetim altında gerçekleştirme"
  },
  {
    level: 2,
    knowledge: "Bir iş veya öğrenme alanına ait başlangıç düzeyinde olgusal bilgiye sahip olma",
    skills: "Görevleri yerine getirmek ve olası basit sorunları çözmek için gerekli bilgiyi kullanma temel becerisine sahip olma",
    competence: "Basit görevleri gözetim altında sınırlı özerklik ile gerçekleştirme\n\nHayat boyu öğrenme yaklaşımı kapsamında öğrenme ihtiyaçlarının farkında olma"
  },
  {
    level: 3,
    knowledge: "Bir iş veya öğrenme alanına ait başlangıç düzeyinde kuramsal, orta düzeyde olgusal bilgiye sahip olma",
    skills: "Görevleri yerine getirmek ve problem çözmek için, gerekli veri, yöntem ve araç-gereçleri seçip kullanma becerisine sahip olma",
    competence: "Görevleri yerine getirmede sorumluluk alma\n\nDeğişen şartları dikkate alarak görevi tamamlama\n\nHayat boyu öğrenme yaklaşımı kapsamında öğrenme ihtiyaçlarını rehberlik eşliğinde belirleme ve karşılama"
  },
  {
    level: 4,
    knowledge: "Bir iş veya öğrenme alanına ait orta düzeyde kuramsal ve işlemsel, orta düzeyin üzerinde olgusal bilgiye sahip olma",
    skills: "Bir iş veya öğrenme alanına özgü iş ve işlemleri yerine getirmek ve sorunlara çözüm üretmek amacıyla bilişsel ve uygulamalı becerilere sahip olma",
    competence: "Öngörülebilir, ancak değişime açık ortamlarda, görevleri tamamlamak için tam sorumluluk alma\n\nBaşkalarının yürüttüğü sıradan görevlerin gözetimini yapma, bu görevlerin değerlendirilmesinde ve iyileştirilmesinde sınırlı sorumluluk alma\n\nHayat boyu öğrenme yaklaşımı kapsamında öğrenme ihtiyaçlarını karşılama ve rehberlik eşliğinde ileriye yönelik öğrenme hedeflerini belirleme\n\nBir iş veya öğrenme alanındaki bilgi, beceri, tutum ve davranışlar ile etik meseleler ve toplumsal sorunların ilişkisi konusunda farkındalığa sahip olma"
  },
  {
    level: 5,
    knowledge: "Bir iş veya öğrenme alanının sınırlarının farkında olarak, bu alana özgü, kapsamlı, kuramsal ve olgusal bilgilere sahip olma",
    skills: "Sınırları belirlenmiş soyut ve somut sorunlara yaratıcı çözümler geliştirmede gerekli, kapsamlı, bilişsel ve uygulamalı becerilere sahip olma",
    competence: "Öngörülemeyen değişikliklerin olduğu ortamlarda yönetim ve gözetim görevi yapma\n\nKendisinin ve başkalarının başarım düzeyini değerlendirme ve geliştirme\n\nProjelerin yönetimi dâhil iş veya öğrenme ortamlarında işleme dair etkileşimde bulunma\n\nBir iş veya öğrenme alanına yönelik hayat boyu öğrenme yaklaşımının kapsamına ve bu kapsamın örgün ve yaygın eğitim ile serbest öğrenme yollarıyla ilişkisi konusunda genel farkındalığa sahip olma\n\nBir iş veya öğrenme alanındaki bilgi, beceri, tutum ve davranışlar ile toplumsal ve etik meseleler ve sorumluluklar ilişkisinin farkında olma"
  },
  {
    level: 6,
    knowledge: "Bir iş veya öğrenme alanında sorgulayıcı bakış açısını kapsayacak şekilde ileri düzeyde kuramsal, metodolojik ve olgusal bilgiye sahip olma",
    skills: "Uzmanlık gerektiren bir iş veya öğrenme alanında, karmaşık ve öngörülemeyen sorunları çözmek için gerekli, uzmanlık ve yenilik niteliği gösteren ileri düzeyde becerilere sahip olma",
    competence: "Öngörülemeyen iş veya öğrenme ortamlarında sorumluluk alarak karar verme ve bu ortamlarda karmaşık teknik veya meslekî faaliyet veya projeleri yönetme\n\nKişilerin ve grupların meslekî gelişiminin yönetiminde sorumluluk alma\n\nBir iş veya öğrenme alanına yönelik hayat boyu öğrenme yaklaşımının kavramları, politikaları, araçlarının uygulaması ve bunların örgün ve yaygın eğitim ile serbest öğrenme yollarıyla ilişkisi konusunda deneyim sahibi olma\n\nBir iş veya öğrenme değerlendirmesinde bulunurken toplumsal ve etik değerlerin farkında olma"
  },
  {
    level: 7,
    knowledge: "Bir iş veya öğrenme alanında, özgün fikirlerin ve/veya araştırmanın temelini oluşturan ve bir kısmı en ileri düzeydeki ihtisas bilgisine sahip olma\n\nAlanındaki ve alanının ilişkili olduğu değişik alanların arayüzündeki bilgi meselelerinde sorgulayıcı yaklaşıma sahip olma",
    skills: "Bir iş veya öğrenme alanında yeni bilgi ve yöntemleri geliştirmek ve farklı alanlardan bilgiyi bütünleştirmek için yürütülen araştırma ve/veya yenilik faaliyetlerinde sorun çözmede ileri düzeyde beceriye sahip olma\n\nİleri araştırma işlemlerinin kavranılması, tasarlanması, uygulanması ve uyarlanmasını yapma becerisine ekip üyesi veya kısmen özerk olarak sahip olma",
    competence: "Öngörülemeyen, karmaşık ve yeni stratejik yaklaşımlar gerektiren iş veya öğrenme ortamlarını yönetme ve dönüştürme\n\nKarmaşık bir ortamda değişimi yönetme tecrübesine sahip olma\n\nMeslekî bilgi ve uygulamaya katkı yapmak ve/veya takımların stratejik başarım düzeyini değerlendirmek için sorumluluk alma\n\nBir iş veya öğrenme alanına ve alanlar arasındaki arayüz bilgisine yönelik hayat boyu öğrenme yaklaşımının kavram, politika, araçlar ve uygulaması ve bunların örgün ve yaygın eğitim ile serbest öğrenme yollarıyla ilişkisi konusunda liderlik yapma\n\nBir iş veya öğrenme alanında, toplumsal ve etik meseleleri ve sorumlulukları dikkate alarak bilgiyi bütünleştirme ve yargıda bulunma"
  },
  {
    level: 8,
    knowledge: "Bir iş veya öğrenme alanındaki kuram, uygulama, yöntem ve tekniklerin en ileri düzeydeki sistematik bilgisine ve sorgulayıcı analiz yapacak kapasiteye sahip olma\n\nBir iş veya öğrenme alanıyla ilişkili olarak farklı iş veya öğrenme alanlarında en ileri düzeydeki arayüz bilgisine sahip olma",
    skills: "Bir iş veya öğrenme alanındaki en ileri düzeydeki araştırma ve/veya yenilikte kritik sorunları çözmek, mevcut bilgiyi veya meslekî uygulamayı genişletmek ve yeniden tanımlamak için sentez ve değerlendirmeyi de kapsayan en ileri düzeydeki bilgi, yöntem ve teknikleri kullanmayı gerektiren uzmanlaşmış becerilere sahip olma\n\nİleri araştırma süreçlerinin kavranılması, tasarlanması, uygulanması ve uyarlanmasını yapma becerisine özerk olarak sahip olma\n\nAlanında ortaya çıkan, farklı alanlardaki yöntem ve yaklaşımların kullanımını da gerektiren yeni ve karmaşık sorunları çözme becerisine sahip olma",
    competence: "Güçlü bir yetkinlik, yenilik, özerklik, bilimsel ve meslekî tutarlılığa sahip olma ve araştırma dâhil iş veya öğrenme ortamlarındaki en ileri seviyedeki yeni fikirlerin ve süreçlerin geliştirilmesinde yetkin olduğunu gösterme\n\nBir iş veya öğrenme alanındaki mevcut bilgi veya meslekî uygulamanın yeniden tanımlanmasına veya genişletilmesine imkân veren yeni ve özgün yaklaşımların geliştirilmesinde liderlik yapma\n\nBir iş veya öğrenme alanına ve alanlar arasındaki arayüz bilgisine yönelik hayat boyu öğrenme yaklaşımının öngörülmeyen, karmaşık ve yenilik gerektiren ortamlarda geliştirilmesine, örgün ve yaygın eğitim ile serbest öğrenme yollarıyla desteklenmesine ilişkin konularda özgün politika ve uygulamalar geliştirme\n\nBir iş veya öğrenme alanında, toplumsal ve etik meseleleri ve sorumlulukları dikkate alarak yeni bilgi üretme"
  }
];

const eqfDescriptors = [
  { level: 1, knowledge: "Basic general knowledge", skills: "Basic skills required to carry out simple tasks", competence: "Work or study under direct supervision in a structured context" },
  { level: 2, knowledge: "Basic factual knowledge of a field of work or study", skills: "Basic cognitive and practical skills required to use relevant information in order to carry out tasks and to solve routine problems using simple rules and tools", competence: "Work or study under supervision with some autonomy" },
  { level: 3, knowledge: "Knowledge of facts, principles, processes and general concepts, in a field of work or study", skills: "A range of cognitive and practical skills required to accomplish tasks and solve problems by selecting and applying basic methods, tools, materials and information", competence: "Take responsibility for completion of tasks in work or study; adapt own behaviour to circumstances in solving problems" },
  { level: 4, knowledge: "Factual and theoretical knowledge in broad contexts within a field of work or study", skills: "A range of cognitive and practical skills required to generate solutions to specific problems in a field of work or study", competence: "Exercise self-management within the guidelines of work or study contexts that are usually predictable, but are subject to change; supervise the routine work of others, taking some responsibility for the evaluation and improvement of work or study activities" },
  { level: 5, knowledge: "Comprehensive, specialised, factual and theoretical knowledge within a field of work or study and an awareness of the boundaries of that knowledge", skills: "A comprehensive range of cognitive and practical skills required to develop creative solutions to abstract problems", competence: "Exercise management and supervision in contexts of work or study activities where there is unpredictable change; review and develop performance of self and others" },
  { level: 6, knowledge: "Advanced knowledge of a field of work or study, involving a critical understanding of theories and principles", skills: "Advanced skills, demonstrating mastery and innovation, required to solve complex and unpredictable problems in a specialised field of work or study", competence: "Manage complex technical or professional activities or projects, taking responsibility for decision-making in unpredictable work or study contexts; take responsibility for managing professional development of individuals and groups" },
  { level: 7, knowledge: "Highly specialised knowledge, some of which is at the forefront of knowledge in a field of work or study, as the basis for original thinking and/or research. Critical awareness of knowledge issues in a field and at the interface between different fields", skills: "Specialised problem-solving skills required in research and/or innovation in order to develop new knowledge and procedures and to integrate knowledge from different fields", competence: "Manage and transform work or study contexts that are complex, unpredictable and require new strategic approaches; take responsibility for contributing to professional knowledge and practice and/or for reviewing the strategic performance of teams" },
  { level: 8, knowledge: "Knowledge at the most advanced frontier of a field of work or study and at the interface between fields", skills: "The most advanced and specialised skills and techniques, including synthesis and evaluation, required to solve critical problems in research and/or innovation and to extend and redefine existing knowledge or professional practice", competence: "Demonstrate substantial authority, innovation, autonomy, scholarly and professional integrity and sustained commitment to the development of new ideas or processes at the forefront of work or study contexts including research" }
];

const eqfDisplayTrSeed = [
  { level: 1, knowledge: "Temel genel bilgiler", skills: "Basit görevleri yerine getirmek için gerekli temel beceriler", competence: "Yapılandırılmış bir çalışma veya öğrenim bağlamında, doğrudan gözetim altında çalışabilme" },
  { level: 2, knowledge: "Bir çalışma veya öğrenim alanına ilişkin temel olgusal bilgi", skills: "Basit kurallar ve araçlardan yararlanarak rutin sorunları çözmek ve bir görevi yerine getirmek amacıyla konuya ilişkin bilgileri kullanmak için gerekli temel bilişsel ve pratik beceriler", competence: "Çalışırken veya öğrenirken gözetim altında ve belli düzeyde bağımsız çalışabilme" },
  { level: 3, knowledge: "Bir çalışma veya öğrenim alanındaki olgular, ilkeler, süreçler ve genel kavramlara ilişkin bilgi", skills: "Temel yöntemler, araçlar, materyaller ve bilgiler arasından seçim yaparak ve bunları uygulayarak görevleri başarıyla tamamlamak ve sorunları çözebilmek için gerekli bilişsel ve pratik beceriler", competence: "Çalışırken veya öğrenirken görevleri tamamlamak için sorumluluk alma; sorunları çözerken kendi davranışlarını duruma göre uyarlama" },
  { level: 4, knowledge: "Bir çalışma veya öğrenim alanındaki geniş bağlamlara ilişkin olgusal ve kavramsal bilgi", skills: "Bir çalışma veya öğrenim alanındaki belirli sorunlara çözüm üretebilmek için gerekli bilişsel ve pratik beceriler", competence: "Öngörülebilir olsa da değişiklik gösterebilecek çalışma veya öğrenim bağlamlarında yönergeler dahilinde öz yönetim uygulama; çalışma veya öğrenim etkinliklerinin değerlendirilmesi ve geliştirilmesi konusunda sınırlı düzeyde sorumluluk alarak başkalarının rutin işlerinin gözetimini yapabilme" },
  { level: 5, knowledge: "Bir çalışma veya öğrenim alanında kapsamlı, o alana mahsus, olgusal ve kavramsal bilgiye ve bu bilginin sınırlarına ilişkin farkındalığa sahip olma", skills: "Soyut sorunlara yaratıcı çözümler geliştirmek için gereken kapsamlı bilişsel ve pratik beceriler", competence: "Öngörülemeyen değişikliklerin olabileceği çalışma ve öğrenim etkinliklerinin olduğu bağlamlarda yönetim ve gözetim uygulama; kendinin ve başkalarının performansını değerlendirme ve geliştirme" },
  { level: 6, knowledge: "Bir çalışma veya öğrenim alanındaki kuram ve ilkelere eleştirel düzeyde hakim olmayı kapsayan ileri düzeyde bilgi", skills: "Uzmanlık odaklı bir çalışma veya öğrenim alanında karşılaşılan karmaşık ve öngörülemeyen sorunları çözebilmek için gerekli ustalığın ve inovasyonun sergilenmesini içeren ileri düzeyde beceriler", competence: "Öngörülemeyen çalışma veya öğrenim bağlamlarındaki karar verme süreçlerinde sorumluluk alarak karmaşık teknik ve mesleki uzmanlık gerektiren etkinlikleri ve projeleri yönetme; bireylerin ve grupların mesleki gelişimlerinin yönetilmesinde sorumluluk alma" },
  { level: 7, knowledge: "Belli bir çalışma veya öğrenim alanında önde gelen bilgiler de dahil olmak üzere, özgün düşünme ve/veya araştırma becerilerinin temelini oluşturan yüksek düzeyde uzmanlık bilgisi. Belli bir alandaki bilgiye veya farklı alanlar arasındaki etkileşime ilişkin konular hakkında eleştirel farkındalık", skills: "Araştırma ve/veya inovasyonda yeni bilgi ve usuller geliştirmek ve farklı alanlardan gelen bilgileri bütünleştirmek için gerekli uzmanlaşmış problem çözme becerileri", competence: "Karmaşık, öngörülemeyen ve yeni stratejik yaklaşımlar gerektiren çalışma veya öğrenim bağlamlarını yönetme ve dönüştürme; mesleki bilgi ve uygulamaya katkı sağlanmasında ve/veya ekiplerin stratejik performansının değerlendirilmesinde sorumluluk alma" },
  { level: 8, knowledge: "Belli bir çalışma veya öğrenim alanına veya farklı alanların etkileşimine ilişkin en ileri düzey bilgi", skills: "Araştırma ve/veya inovasyona ilişkin kritik sorunları çözmek için ve mevcut bilgi veya mesleki uygulamayı genişletmek ve yeniden tanımlamak için gerekli sentezleme ve değerlendirme gibi ileri düzeyde ve uzmanlık gerektiren beceri ve teknikler", competence: "Araştırma içeren çalışma veya öğrenim bağlamlarının ön planında kayda değer yetki, inovasyon, otonomi, akademik ve mesleki bütünlüğün yanı sıra yeni fikir ve süreçlerin geliştirilmesi konusunda sürekli kararlılık gösterme" }
];

export const qualificationLevelTranslations = Object.freeze(eqfDisplayTrSeed.map((item) => ({
  id: `eqf-${item.level}-tr`,
  descriptorId: `eqf-${item.level}`,
  frameworkId: "eqf",
  languageCode: "tr",
  ...item,
  competenceLabel: "Sorumluluk alabilme ve otonomi",
  knowledgeBasis: "official_display_translation",
  skillsBasis: item.level === 7 ? "institutional_operational_translation" : "official_display_translation",
  competenceBasis: "official_display_translation",
  displaySourceUrl: EQF_DISPLAY_TR,
  verifiedAt: "2026-08-19T23:45:00.000Z",
  institutionalValidationRequired: true
})));

export const qualificationLevelDescriptors = Object.freeze([
  ...tycDescriptors.map((item) => ({
    id: `tyc-${item.level}`,
    frameworkId: "tyc",
    ...item,
    competenceLabel: "Yetkinlik",
    sourceLanguage: "tr",
    contentBasis: "official_verbatim",
    officialSourceUrl: TYC_SOURCE,
    verifiedAt: VERIFIED_AT
  })),
  ...eqfDescriptors.map((item) => ({
    id: `eqf-${item.level}`,
    frameworkId: "eqf",
    ...item,
    competenceLabel: "Responsibility and autonomy",
    sourceLanguage: "en",
    contentBasis: "official_verbatim",
    officialSourceUrl: EQF_SOURCE,
    verifiedAt: VERIFIED_AT,
    displayTranslationTr: qualificationLevelTranslations.find((translation) => translation.level === item.level)
  }))
]);

export const qualificationMatrixColumns = Object.freeze([
  { key: "frameworkDescriptor", label: "Seviye tanımlayıcısı", required: true, input: "reference" },
  { key: "learningOutcome", label: "Öğrenme hedefi / çıktısı", required: true, input: "textarea" },
  { key: "learningLevel", label: "Öğrenme düzeyi ve eylem fiili", required: true, input: "text" },
  { key: "courseContent", label: "Ders içeriği / öğrenme etkinliği", required: true, input: "textarea" },
  { key: "assessmentMethod", label: "Ölçme-değerlendirme yöntemi", required: true, input: "textarea" },
  { key: "evidence", label: "Başarı ölçütü ve kanıt", required: true, input: "textarea" },
  { key: "alignmentRationale", label: "Uyum gerekçesi", required: true, input: "textarea" }
]);

export const qualificationMatrixTemplates = Object.freeze(qualificationLevelDescriptors.map((descriptor) => {
  const framework = qualificationFrameworks.find((item) => item.id === descriptor.frameworkId);
  return {
    id: `matrix-${descriptor.frameworkId}-${descriptor.level}`,
    frameworkId: descriptor.frameworkId,
    frameworkCode: framework.code,
    level: descriptor.level,
    title: `${framework.code} ${descriptor.level}. seviye — yeterlilik/öğrenme hedefi/içerik/ölçme matrisi`,
    candidateInstructions: "Her öğrenme hedefini seçilen seviye tanımlayıcısıyla ilişkilendirin; ders içeriğini, ölçme-değerlendirme yöntemini, gözlenebilir kanıtı ve uyum gerekçesini yazın. Otomatik eşleşme akademik karar değildir.",
    columns: qualificationMatrixColumns,
    officialSourceUrl: descriptor.officialSourceUrl,
    verifiedAt: descriptor.verifiedAt,
    institutionalValidationRequired: true,
    isSyntheticTemplate: true
  };
}));

export const qualificationMatrixExamples = Object.freeze([
  { id: "example-tyc-5", templateId: "matrix-tyc-5", frameworkId: "tyc", level: 5, frameworkDimension: "skills", learningOutcomeCode: "ÖÇ-1", learningOutcomeSample: "Sınırları belirlenmiş bir veri setindeki temel kalite sorunlarını saptar ve uygun düzeltme işlemini uygular.", learningLevelSample: "Uygulama ve çözüm geliştirme", courseContentSample: "Eksik değer, tutarlılık ve temel veri temizleme uygulaması", assessmentMethodSample: "Uygulama görevi + analitik rubrik", evidenceSample: "Temizlenmiş veri seti, işlem günlüğü ve rubrikte en az yeterli düzey", alignmentRationaleSample: "Sınırları belirli somut bir soruna bilişsel ve uygulamalı beceriyle yaratıcı çözüm üretildiği gözlenebilir.", pilotNotice: "Örnek satırdır; resmî yeterlilik veya kurumsal onay değildir." },
  { id: "example-tyc-6", templateId: "matrix-tyc-6", frameworkId: "tyc", level: 6, frameworkDimension: "skills", learningOutcomeCode: "ÖÇ-1", learningOutcomeSample: "Karmaşık bir veri setinin güvenilirliğini eleştirel ölçütlerle değerlendirir ve kanıta dayalı bir görselleştirme üretir.", learningLevelSample: "Analiz, değerlendirme ve üretme", courseContentSample: "Kaynak güvenilirliği, veri kalite ölçütleri ve görsel anlatım ilkeleri", assessmentMethodSample: "Vaka analizi + ürün dosyası + analitik rubrik", evidenceSample: "Gerekçeli analiz raporu, görselleştirme ve en az %70 rubrik başarısı (pilot eşik)", alignmentRationaleSample: "Karmaşık ve öngörülemeyen sorunlarda uzmanlık ve yenilik niteliği gösteren ileri beceri kanıtı üretir.", pilotNotice: "Örnek satırdır; başarı eşiği pilot parametredir ve kurumsal doğrulama gerekir." },
  { id: "example-tyc-7", templateId: "matrix-tyc-7", frameworkId: "tyc", level: 7, frameworkDimension: "skills", learningOutcomeCode: "ÖÇ-1", learningOutcomeSample: "Farklı disiplinlerden veri kaynaklarını bütünleştirerek yeni bir analiz yöntemi tasarlar ve gerekçelendirir.", learningLevelSample: "Sentez, tasarım ve gerekçelendirme", courseContentSample: "Disiplinler arası veri modelleme ve yöntem karşılaştırması", assessmentMethodSample: "Araştırma tasarısı + jüri sunumu + rubrik", evidenceSample: "Yöntem protokolü, karşılaştırmalı gerekçe ve değerlendirme tutanağı", alignmentRationaleSample: "Yeni bilgi/yöntem geliştirme ve farklı alanlardan bilgiyi bütünleştirme becerisiyle ilişkilidir.", pilotNotice: "Örnek satırdır; resmî yeterlilik veya komisyon kararı değildir." },
  { id: "example-tyc-8", templateId: "matrix-tyc-8", frameworkId: "tyc", level: 8, frameworkDimension: "competence", learningOutcomeCode: "ÖÇ-1", learningOutcomeSample: "Alan sınırlarını genişleten özgün bir veri kalite yaklaşımı geliştirir, bağımsız olarak doğrular ve etik etkilerini tartışır.", learningLevelSample: "Özgün üretim, doğrulama ve etik yargı", courseContentSample: "İleri araştırma tasarımı, yöntem doğrulama ve araştırma etiği", assessmentMethodSample: "Özgün araştırma ürünü + bağımsız savunma + uzman rubriği", evidenceSample: "Tekrarlanabilir yöntem, doğrulama kanıtı, etik etki analizi ve jüri kaydı", alignmentRationaleSample: "Özerklik, bilimsel tutarlılık, özgün yaklaşım geliştirme ve yeni bilgi üretme boyutlarını birlikte kanıtlar.", pilotNotice: "Örnek satırdır; doktora veya resmî derece eşdeğerliği iddiası taşımaz." },
  { id: "example-eqf-5", templateId: "matrix-eqf-5", frameworkId: "eqf", level: 5, frameworkDimension: "skills", learningOutcomeCode: "LO-1", learningOutcomeSample: "Sınırları belirlenmiş soyut bir veri problemi için uygulanabilir ve yaratıcı bir çözüm geliştirir.", learningLevelSample: "Apply and develop", courseContentSample: "Veri problemi tanımlama, çözüm seçenekleri ve uygulama deneyi", assessmentMethodSample: "Performans görevi + analitik rubrik", evidenceSample: "Çalışan çözüm prototipi, süreç kaydı ve rubrik kanıtı", alignmentRationaleSample: "EQF 5 düzeyindeki kapsamlı bilişsel/uygulamalı beceri ve soyut problemlere yaratıcı çözüm beklentisini örnekler.", pilotNotice: "Türkçe pilot örneğidir; resmî AYÇ çevirisi veya yeterlilik kararı değildir." },
  { id: "example-eqf-6", templateId: "matrix-eqf-6", frameworkId: "eqf", level: 6, frameworkDimension: "skills", learningOutcomeCode: "LO-1", learningOutcomeSample: "Uzmanlık alanındaki karmaşık ve öngörülemeyen bir veri sorununa yenilikçi çözüm üretir.", learningLevelSample: "Analyse, evaluate and create", courseContentSample: "İleri veri kalite analizi ve yenilikçi görselleştirme", assessmentMethodSample: "Vaka analizi + ürün dosyası + akran/uzman rubriği", evidenceSample: "Gerekçeli çözüm, çalışan ürün ve değerlendirme kaydı", alignmentRationaleSample: "EQF 6 mastery, innovation ve complex/unpredictable problem çözme beklentisiyle ilişkilidir.", pilotNotice: "Türkçe pilot örneğidir; resmî AYÇ çevirisi veya yeterlilik kararı değildir." },
  { id: "example-eqf-7", templateId: "matrix-eqf-7", frameworkId: "eqf", level: 7, frameworkDimension: "competence", learningOutcomeCode: "LO-1", learningOutcomeSample: "Karmaşık bir öğrenme bağlamını yeni stratejik yaklaşımla dönüştürür ve ekip performansını değerlendirir.", learningLevelSample: "Transform and review", courseContentSample: "Stratejik öğrenme analitiği tasarımı ve değişim yönetimi", assessmentMethodSample: "Strateji dosyası + kurul simülasyonu + rubrik", evidenceSample: "Dönüşüm planı, risk kaydı, performans ölçütleri ve gerekçeli değerlendirme", alignmentRationaleSample: "EQF 7 complex/unpredictable contexts ile strategic performance review beklentisini örnekler.", pilotNotice: "Türkçe pilot örneğidir; resmî AYÇ çevirisi veya yeterlilik kararı değildir." },
  { id: "example-eqf-8", templateId: "matrix-eqf-8", frameworkId: "eqf", level: 8, frameworkDimension: "competence", learningOutcomeCode: "LO-1", learningOutcomeSample: "Araştırmanın ön cephesinde yeni bir yöntem geliştirir ve bilimsel/meslekî bütünlükle sürdürülebilir biçimde doğrular.", learningLevelSample: "Originate, validate and lead", courseContentSample: "En ileri araştırma yöntemi, sentez, değerlendirme ve bilimsel bütünlük", assessmentMethodSample: "Özgün araştırma ürünü + bağımsız savunma + uzman değerlendirmesi", evidenceSample: "Tekrarlanabilir yöntem, bağımsız doğrulama, etik analiz ve uzman tutanağı", alignmentRationaleSample: "EQF 8 authority, innovation, autonomy, integrity ve sustained commitment beklentilerini örnekler.", pilotNotice: "Türkçe pilot örneğidir; resmî AYÇ çevirisi veya yeterlilik kararı değildir." }
]);

export const financeHandoffRoutes = Object.freeze([
  {
    id: "finance-route-catalog",
    triggerKey: "paid-program-enrollment",
    order: 1,
    title: "Ücretli programa başvuru ve ödeme simülasyonuna yönlendirme",
    sourcePage: "catalog",
    destinationPage: "finance",
    fromRole: "learner",
    toRole: "finance",
    learnerActionLabel: "Ödeme adımına geç • Simülasyon",
    learnerMessage: "Başvuru kaydı taslak olarak oluşturulur; gerçek tahsilat yapılmadan Mali İşler pilot kuyruğuna yönlendirilir.",
    financeMessage: "Mali İşler rolü örnek ücret, ödeme kanalı, dekont üst verisi ve mutabakat durumunu yalnız simülasyon olarak inceler.",
    gibExplanation: "GİB / e-Arşiv kartı yalnız fatura taslağı ve onay kapısını gösterir; gerçek belge numarası üretmez ve GİB’e veri göndermez.",
    mysMaysExplanation: "MYS / MAYS kartı bütçe, harcama ve muhasebe aktarımının önerilen onay adımlarını gösterir; canlı sisteme bağlanmaz.",
    statusPath: ["Başvuru taslağı", "Ödeme simülasyonu bekleniyor", "Mali İşler incelemesi", "Mutabakat taslağı", "Kayıt uygunluğu"]
  },
  {
    id: "finance-route-transfer",
    triggerKey: "bank-transfer-simulation",
    order: 2,
    title: "Havale/EFT dekont üst verisi ve mali inceleme",
    sourcePage: "applications",
    destinationPage: "finance",
    fromRole: "learner",
    toRole: "finance",
    learnerActionLabel: "Havale/EFT simülasyonu oluştur",
    learnerMessage: "Yalnız sentetik referans numarası ve örnek tutar kaydedilir; banka hesabı veya gerçek dekont yüklenmez.",
    financeMessage: "Mali İşler, sentetik kayıt ile program ücret taslağını eşleştirir ve gerekirse revizyon ister.",
    gibExplanation: "Eşleşen kayıt için yalnız e-Arşiv taslak ön izlemesi oluşturulur; mali birim doğrulaması gerekir.",
    mysMaysExplanation: "Mutabakat sonucu MYS / MAYS aktarım simülasyonu günlüğüne eklenir; gerçek muhasebe fişi oluşmaz.",
    statusPath: ["Sentetik dekont", "Eşleştirme bekleniyor", "Mali kontrol", "Taslak mutabakat"]
  },
  {
    id: "finance-route-pos",
    triggerKey: "virtual-pos-simulation",
    order: 3,
    title: "Sanal POS ödeme ekranı simülasyonu",
    sourcePage: "applications",
    destinationPage: "finance",
    fromRole: "learner",
    toRole: "finance",
    learnerActionLabel: "Sanal POS demosunu aç",
    learnerMessage: "Kart alanları gösterilmez ve Payment Request API çağrılmaz; başarı/ret senaryosu kullanıcı seçimiyle örneklenir.",
    financeMessage: "Mali İşler yalnız sentetik işlem sonucunu, programı ve örnek tutarı görür; gerçek provizyon yoktur.",
    gibExplanation: "Başarılı demo sonucu fatura taslağı kuyruğuna alınabilir; GİB servisine istek yapılmaz.",
    mysMaysExplanation: "Örnek tahsilat durumu muhasebe aktarım taslağında gösterilir; MYS / MAYS bağlantısı kapalıdır.",
    statusPath: ["Kanal seçimi", "Başarı/ret simülasyonu", "Mali kontrol", "Fatura taslağı"]
  },
  {
    id: "finance-route-invoice",
    triggerKey: "invoice-and-accounting-draft",
    order: 4,
    title: "Fatura ve MYS / MAYS aktarım taslağı",
    sourcePage: "finance",
    destinationPage: "integrations",
    fromRole: "finance",
    toRole: "it",
    learnerActionLabel: "Entegrasyon taslağını incele",
    learnerMessage: "Öğrenen yalnız durum mesajını görür; gerçek fatura veya muhasebe belgesi sunulmaz.",
    financeMessage: "Mali İşler yapılandırılabilir pilot parametreleri doğrular ve Bilgi İşlem onay kapısına gönderilecek taslağı inceler.",
    gibExplanation: "GİB / e-Arşiv yalnız kapalı entegrasyon kartı, örnek istek ve hata/yeniden deneme günlüğü sunar.",
    mysMaysExplanation: "MYS / MAYS yalnız kapalı entegrasyon kartı ve önerilen onay sırasını sunar; gerçek aktarım yapılmaz.",
    statusPath: ["Mali parametre doğrulaması", "GİB taslağı", "MYS/MAYS taslağı", "Bilgi İşlem kontrolü", "Kapalı entegrasyon"]
  }
].map((route) => ({
  ...route,
  institutionalValidationRequired: true,
  realPaymentEnabled: false,
  realInvoiceEnabled: false,
  realTransferEnabled: false,
  realDataSent: false,
  isSynthetic: true
})));

export const roleWorkflowOverviews = Object.freeze([
  { roleId: "learner", roleLabel: "Öğrenen / Öğrenci", title: "Öğrenen / Öğrenci genel bakışı", summary: "Katalog, başvuru, eğitim, değerlendirme, ödeme simülasyonu ve dijital yeterlilik durumlarını izler.", primaryPage: "catalog", responsibilities: ["Kataloğu inceleme", "Kendi başvurusunu oluşturma", "Ödeme simülasyonunu görme", "Pilot belgeyi doğrulama"], allowedActions: ["catalog.read", "application.create_own", "payment.simulate_own", "credential.verify_own"], prohibitedActions: ["commission.decide", "finance.reconcile", "integration.enable", "real_payment.send"], financeHandoffVisibility: true },
  { roleId: "instructor", roleLabel: "Üniversite içi eğitici", title: "Üniversite içi eğitici genel bakışı", summary: "Program önerisini TYÇ/AYÇ matrisi, AKTS iş yükü, ölçme planı ve kalite kanıtlarıyla hazırlar.", primaryPage: "proposal", responsibilities: ["Program taslağı", "TYÇ/AYÇ matrisi", "İş yükü gerekçesi", "Revizyon yanıtı"], allowedActions: ["proposal.create_own", "matrix.fill_own", "proposal.submit_own", "revision.respond_own"], prohibitedActions: ["commission.decide", "finance.collect", "integration.enable", "other_application.read"], financeHandoffVisibility: false },
  { roleId: "externalInstructor", roleLabel: "Kurum dışı eğitici", title: "Kurum dışı eğitici genel bakışı", summary: "Kendi program önerisini, sentetik kanıt üst verisini ve TYÇ/AYÇ uyum matrisini yönetir.", primaryPage: "proposal", responsibilities: ["Program önerisi", "TYÇ/AYÇ matrisi", "Kanıt üst verisi", "Revizyon yanıtı"], allowedActions: ["proposal.create_own", "matrix.fill_own", "evidence.metadata_add_own", "revision.respond_own"], prohibitedActions: ["commission.decide", "student_record.write", "finance.collect", "other_application.read"], financeHandoffVisibility: false },
  { roleId: "coordinator", roleLabel: "Koordinatörlük / SEM", title: "Koordinatörlük / SEM genel bakışı", summary: "Eksik belge, süre ve idari ön kontrolleri yürütür; komisyon ve Mali İşler yönlendirmelerini koordine eder.", primaryPage: "applications", responsibilities: ["Ön kontrol", "Eksik belge/revizyon", "SLA izleme", "Komisyon sevki", "Mali yönlendirme"], allowedActions: ["application.review", "revision.request", "commission.queue", "finance.handoff", "report.read"], prohibitedActions: ["commission.final_decision", "finance.reconcile", "integration.enable", "real_notification.send"], financeHandoffVisibility: true },
  { roleId: "commission", roleLabel: "Mikro Yeterlilik Komisyonu üyesi", title: "Mikro Yeterlilik Komisyonu genel bakışı", summary: "Kanıtları ve TYÇ/AYÇ matrislerini inceler; gerekçeli akademik pilot görüşünü insan olarak kaydeder.", primaryPage: "commission", responsibilities: ["Kanıt/matris inceleme", "Karar olmayan AI analizi", "Gerekçeli oy", "Karar geçmişi"], allowedActions: ["evidence.review", "matrix.review", "commission.vote", "commission.reason", "audit.read"], prohibitedActions: ["ai.autonomous_decision", "finance.collect", "integration.enable", "real_board_decision.publish"], financeHandoffVisibility: false },
  { roleId: "studentAffairs", roleLabel: "Öğrenci İşleri", title: "Öğrenci İşleri genel bakışı", summary: "Pilot kayıtların AKTS, program ve belge alanlarını kontrol eder; ÖBİS/YÖKSİS aktarımını dry-run olarak görür.", primaryPage: "applications", responsibilities: ["AKTS kontrolü", "Belge alanı doğrulama", "Aktarım taslağı", "İstisna raporu"], allowedActions: ["student_record.review", "ects.validate", "credential.fields_review", "transfer.dry_run"], prohibitedActions: ["commission.decide", "integration.enable", "real_student_record.write", "real_transfer.send"], financeHandoffVisibility: false },
  { roleId: "it", roleLabel: "Bilgi İşlem", title: "Bilgi İşlem genel bakışı", summary: "Kapalı entegrasyon kartlarını, onay kapılarını, hata/yeniden deneme senaryolarını ve rol denetimini yönetir.", primaryPage: "integrations", responsibilities: ["Entegrasyon sağlığı", "Örnek istek/hata", "Yetki matrisi", "Audit log", "Mali entegrasyon taslağı"], allowedActions: ["integration.simulate", "integration.retry_dry_run", "rbac.audit", "audit.read", "finance.integration_review"], prohibitedActions: ["commission.decide", "real_endpoint.call", "secret.store_in_client", "production.promote"], financeHandoffVisibility: true },
  { roleId: "finance", roleLabel: "Finans / Döner Sermaye", title: "Finans / Döner Sermaye genel bakışı", summary: "Örnek tahsilat, mutabakat, fatura ve hak ediş taslaklarını; GİB ile MYS/MAYS kapılarını inceler.", primaryPage: "finance", responsibilities: ["Ödeme simülasyonu", "Mutabakat taslağı", "Fatura/e-Arşiv taslağı", "Hak ediş", "GİB ve MYS/MAYS"], allowedActions: ["payment.simulate", "finance.reconcile_draft", "invoice.draft", "entitlement.review", "finance.parameters_configure"], prohibitedActions: ["real_payment.collect", "real_invoice.issue", "real_tax_rule.assert", "real_accounting_transfer.send"], financeHandoffVisibility: true },
  { roleId: "admin", roleLabel: "Sistem yöneticisi", title: "Sistem yöneticisi genel bakışı", summary: "Dokuz rolün yetki matrisini, pilot parametreleri, denetim izini ve sistem sağlığını izler; karar vermez.", primaryPage: "reports", responsibilities: ["Rol/yetki matrisi", "Pilot veri sağlığı", "Denetim izi", "Hata durumu", "Preview sürümü"], allowedActions: ["rbac.audit", "pilot.parameters_review", "audit.read", "system.health_read", "preview.version_read"], prohibitedActions: ["commission.decide", "finance.approve", "real_user.impersonate", "production.promote"], financeHandoffVisibility: true }
].map((role) => ({ ...role, realSystemWriteEnabled: false, isSynthetic: true })));

const roleStepSeed = {
  learner: [
    ["catalog", "Programı incele", "Program ayrıntısı, AKTS, TYÇ önerisi ve ücret durumunu inceler.", "Program ayrıntısını aç", null, false],
    ["applications", "Başvuruyu oluştur", "Ücretli programda gerçek ödeme almayan mali yönlendirme görünür.", "Başvuruya geç", "finance", true],
    ["finance", "Ödeme simülasyonunu tamamla", "Sanal POS veya havale/EFT senaryosu seçilir; gerçek veri alınmaz.", "Ödeme demosunu aç", "finance", true],
    ["wallet", "Başarı ve belge durumunu izle", "İnsan değerlendirmesi sonrası pilot yeterlilik görüntülenir.", "Cüzdanımı aç", null, false]
  ],
  instructor: [
    ["proposal", "Program önerisini hazırla", "Öğrenme çıktısı, iş yükü ve yöntem alanlarını doldurur.", "Taslağı aç", null, false],
    ["proposal", "TYÇ/AYÇ matrisini doldur", "Seviye, hedef, içerik, ölçme ve kanıt alanlarını eşler.", "Matrisi düzenle", null, false],
    ["applications", "Koordinatörlüğe gönder", "Kendi taslağını idari ön kontrole iletir.", "Ön kontrole gönder", "coordinator", false]
  ],
  externalInstructor: [
    ["proposal", "Dış eğitici önerisini hazırla", "Program ve sentetik kanıt üst verisini oluşturur.", "Öneriyi aç", null, false],
    ["proposal", "TYÇ/AYÇ matrisini doldur", "Seçilen seviyeye göre hedef, içerik ve ölçme kanıtını açıklar.", "Matrisi düzenle", null, false],
    ["applications", "Kanıt kontrolüne gönder", "Üst veri ve kontrol listesi koordinatörlüğe iletilir.", "Ön kontrole gönder", "coordinator", false]
  ],
  coordinator: [
    ["applications", "İdari ön kontrol", "Eksik alan, kanıt ve süre kontrol edilir.", "Kontrolü başlat", null, false],
    ["applications", "Mali yönlendirme", "Ücretli başvuru ödeme simülasyonu için Mali İşler kuyruğuna yönlendirilir.", "Mali İşlere yönlendir", "finance", true],
    ["commission", "Komisyon gündemi", "Tam dosya komisyon incelemesine sevk edilir.", "Komisyona sevk et", "commission", false]
  ],
  commission: [
    ["commission", "Kanıt ve matris incelemesi", "TYÇ/AYÇ, Bologna, AKTS ve ölçme kanıtları karşılaştırılır.", "İncelemeyi aç", null, false],
    ["commission", "Gerekçeli görüş", "İnsan üye onay, revizyon, ret veya çekimser görüşü gerekçelendirir.", "Görüş kaydet", null, false],
    ["audit", "Karar geçmişi", "Pilot görüş değişiklikleri denetim izinde görüntülenir.", "Geçmişi aç", null, false]
  ],
  studentAffairs: [
    ["applications", "Kayıt ve AKTS kontrolü", "Onaylanmış pilot kaydın AKTS ve belge alanları incelenir.", "Kaydı incele", null, false],
    ["integrations", "Aktarım dry-run", "ÖBİS/YÖKSİS örnek istek günlüğü görüntülenir.", "Dry-run aç", "it", false]
  ],
  it: [
    ["integrations", "Entegrasyon sağlığı", "Tüm kurumsal entegrasyonlar bağlı değil olarak doğrulanır.", "Durumu denetle", null, true],
    ["integrations", "Hata ve yeniden deneme", "Güvenli örnek istek ve yeniden deneme çalıştırılır.", "Dry-run çalıştır", null, true]
  ],
  finance: [
    ["finance", "Ödeme simülasyonu kuyruğu", "Sentetik ödeme durumu incelenir.", "Kuyruğu aç", null, true],
    ["finance", "Mutabakat ve hak ediş taslağı", "Pilot parametrelerle taslak hesap oluşturulur.", "Taslak oluştur", null, true],
    ["integrations", "GİB ve MYS/MAYS kapıları", "Gerçek belge/aktarım oluşturmayan taslak Bilgi İşleme yönlendirilir.", "Entegrasyon taslağını gönder", "it", true]
  ],
  admin: [
    ["reports", "Sistem ve rol matrisi", "Dokuz rolün ekran, işlem ve yasaklı eylem ayrımı incelenir.", "Yetki matrisini aç", null, false],
    ["audit", "Denetim ve veri sınırı", "Sentetik veri, kapalı entegrasyon ve Preview sınırları doğrulanır.", "Denetim izini aç", null, true]
  ]
};

export const roleWorkflowSteps = Object.freeze(Object.entries(roleStepSeed).flatMap(([roleId, steps]) =>
  steps.map(([pageKey, title, description, actionLabel, nextRole, financeRelated], index) => ({
    id: `${roleId}-${index + 1}`,
    roleId,
    stepOrder: index + 1,
    pageKey,
    title,
    description,
    actionLabel,
    nextRole,
    financeRelated,
    realSystemEffect: false,
    isSynthetic: true
  }))
));

const pilotDraftRows = {
  tyc: [
    { dimension: "knowledge", learningOutcome: "Karmaşık bir veri probleminin kuramsal ve olgusal bileşenlerini eleştirel olarak açıklar.", learningLevel: "Analiz", courseContent: "Veri kalitesi, gösterge tasarımı ve kanıt sınırları", assessmentMethod: "Gerekçeli vaka analizi ve analitik rubrik", evidence: "Vaka raporu, kaynak izi ve rubrik kaydı", alignmentRationale: "Bilgi boyutu seviye 6 sorgulayıcı bakış beklentisiyle ilişkilendirilmiştir." },
    { dimension: "skills", learningOutcome: "Karmaşık ve öngörülemeyen bir veri sorununa yenilikçi ve izlenebilir bir çözüm geliştirir.", learningLevel: "Değerlendirme ve üretme", courseContent: "Çözüm seçenekleri, prototip ve doğrulama planı", assessmentMethod: "Performans görevi, ürün dosyası ve analitik rubrik", evidence: "Çalışan prototip, karar günlüğü ve doğrulama sonucu", alignmentRationale: "Beceri boyutu uzmanlık ve yenilik niteliği gösteren ileri becerilerle eşlenmiştir." },
    { dimension: "competence", learningOutcome: "Belirsiz bir pilot proje bağlamında gerekçeli karar alır ve ekip gelişimi için sorumluluk üstlenir.", learningLevel: "Değerlendirme ve sorumluluk", courseContent: "Proje yönetimi, karar izi ve mesleki gelişim planı", assessmentMethod: "Ekip simülasyonu, gözlem kontrol listesi ve yansıtıcı rapor", evidence: "Karar günlüğü, gözlem kaydı ve gelişim önerisi", alignmentRationale: "Yetkinlik boyutu öngörülemeyen ortamda sorumluluk alma ve gelişimi yönetme beklentisiyle eşlenmiştir." }
  ],
  eqf: [
    { dimension: "knowledge", learningOutcome: "Explains complex data-quality assumptions from an advanced and critical perspective.", learningLevel: "Analysis", courseContent: "Data-quality dimensions, indicator validity and evidence limits", assessmentMethod: "Reasoned case analysis with an analytic rubric", evidence: "Case report, source trace and rubric record", alignmentRationale: "Mapped to advanced knowledge involving a critical understanding at EQF level 6." },
    { dimension: "competence", learningOutcome: "Manages a complex pilot task and takes responsibility for reviewing team performance.", learningLevel: "Evaluation and responsibility", courseContent: "Project controls, review criteria and improvement cycles", assessmentMethod: "Team simulation, observation checklist and reflective brief", evidence: "Decision log, observation record and improvement proposal", alignmentRationale: "Mapped to managing complex activities and responsibility for professional development at EQF level 6." },
    { dimension: "skills", learningOutcome: "Develops and validates an innovative response to an unpredictable data-quality problem.", learningLevel: "Evaluate and create", courseContent: "Solution alternatives, prototype construction and validation planning", assessmentMethod: "Performance task, product portfolio and analytic rubric", evidence: "Working prototype, decision trace and validation result", alignmentRationale: "Mapped to advanced skills demonstrating mastery and innovation at EQF level 6." }
  ]
};

export const qualificationMatrixDrafts = Object.freeze([
  { id: "DRF-MAT-TYC-6-001", frameworkId: "tyc", level: 6, programTitle: "Veri ile karar verme — TYÇ 6 pilot matrisi", ownerRole: "instructor", ownerName: "Dr. Öğr. Üyesi Ekin Demir", status: "pilot_draft", updatedAt: "2026-08-19T23:50:00.000Z", rows: pilotDraftRows.tyc },
  { id: "DRF-MAT-EQF-6-001", frameworkId: "eqf", level: 6, programTitle: "Veri ile karar verme — AYÇ/EQF 6 pilot matrisi", ownerRole: "externalInstructor", ownerName: "Uzman Eğitici Selin Ada", status: "pilot_draft", updatedAt: "2026-08-19T23:50:00.000Z", rows: pilotDraftRows.eqf }
].map((draft) => ({
  ...draft,
  sourceUrl: draft.frameworkId === "tyc" ? TYC_SOURCE : EQF_SOURCE,
  institutionalValidationRequired: true,
  realSystemEffect: false,
  isSynthetic: true
})));

export const pilotPaymentRequests = Object.freeze([
  {
    id: "PAY-2401",
    applicationId: null,
    programId: "program-green-skills",
    programCode: "MY-PRG-2026-011",
    program: "Yeşil Dönüşüm İçin Temel Yetkinlikler",
    learner: "Derya Örnek",
    amount: 1750,
    currency: "TRY",
    channel: "Havale/EFT simülasyonu",
    status: "pending_finance",
    createdAt: "2026-08-19T15:20:00.000Z",
    updatedAt: "2026-08-19T15:20:00.000Z",
    realPayment: false,
    enrollmentCreated: false,
    hasFinancialIdentifiers: false,
    realDataSent: false,
    isSynthetic: true
  }
]);

export const pilotPaymentEvents = Object.freeze([
  { id: "PAY-2401-EVT-01", paymentRequestId: "PAY-2401", eventOrder: 1, occurredAt: "2026-08-19T15:18:00.000Z", actorRole: "learner", actionLabel: "Sentetik ödeme taslağı oluşturuldu", fromStatus: null, toStatus: "draft", reason: "Havale/EFT kanalı yalnız demo senaryosu olarak seçildi; finansal tanımlayıcı alınmadı." },
  { id: "PAY-2401-EVT-02", paymentRequestId: "PAY-2401", eventOrder: 2, occurredAt: "2026-08-19T15:20:00.000Z", actorRole: "coordinator", actionLabel: "Mali İşler pilot kuyruğuna yönlendirildi", fromStatus: "draft", toStatus: "pending_finance", reason: "Gerçek ödeme alınmadı; yalnız rol bazlı inceleme ve durum geçişi örneklendi." }
].map((event) => ({ ...event, realPayment: false, hasFinancialIdentifiers: false, realDataSent: false, isSynthetic: true })));

export const qualificationReferenceSnapshot = Object.freeze({
  version: REFERENCE_DATA_VERSION,
  verifiedAt: VERIFIED_AT,
  frameworks: qualificationFrameworks,
  descriptors: qualificationLevelDescriptors,
  descriptorTranslations: qualificationLevelTranslations,
  datasetRegistry: qualificationDatasetRegistry,
  officialQualificationReferences,
  matrixTemplates: qualificationMatrixTemplates,
  matrixExamples: qualificationMatrixExamples,
  matrixDrafts: qualificationMatrixDrafts,
  financeRoutes: financeHandoffRoutes,
  paymentRequests: pilotPaymentRequests,
  paymentEvents: pilotPaymentEvents,
  roleOverviews: roleWorkflowOverviews,
  roleSteps: roleWorkflowSteps,
  notices: {
    officialData: "TYÇ ve AYÇ/EQF seviye tanımlayıcıları kamuya açık resmî kaynaklardan doğrulanmıştır.",
    pilotData: "Şablonlar, örnekler, mali yönlendirmeler ve rol akışları sentetiktir; kurumsal doğrulama gerekir.",
    noLiveEffects: "Gerçek ödeme, fatura, aktarım, kişisel veri veya canlı kurumsal sistem bağlantısı yoktur."
  }
});

export function findQualificationTemplate(frameworkId, level) {
  return qualificationMatrixTemplates.find((template) => template.frameworkId === frameworkId && template.level === Number(level)) || null;
}

export function findQualificationDescriptor(frameworkId, level) {
  return qualificationLevelDescriptors.find((descriptor) => descriptor.frameworkId === frameworkId && descriptor.level === Number(level)) || null;
}

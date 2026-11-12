-- =============================================================================
-- רק פרטי — reference seed (safe for production: settings, policies, sources,
-- catalog, geography). No fake users or listings. Idempotent.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Application settings (admin-configurable)
-- ---------------------------------------------------------------------------
insert into public.application_settings (key, value, description) values
  ('max_active_listings', '2', 'מספר מודעות פעילות/ממתינות מרבי לחשבון (ברירת מחדל)'),
  ('listing_expiry_days', '60', 'מספר ימים עד שמודעה פעילה פגה'),
  ('contact_reveal_limit_per_hour', '20', 'חשיפות פרטי קשר מרביות לשעה למשתמש'),
  ('lookup_limit_per_hour_guest', '5', 'בדיקות רכב לשעה לאורח (לפי IP)'),
  ('lookup_limit_per_hour_user', '20', 'בדיקות רכב לשעה למשתמש מחובר'),
  ('otp_limit_per_hour', '5', 'בקשות קוד אימות לשעה למספר טלפון'),
  ('flag_listing_frequency_threshold', '3', 'מודעות ב-30 יום שמעליהן נפתח דגל תדירות'),
  ('flag_distinct_vehicles_threshold', '4', 'רכבים שונים ב-180 יום שמעליהם נפתח דגל דפוס סוחר'),
  ('flag_related_accounts_threshold', '1', 'חשבונות קשורים מפרסמים שמעליהם נפתח דגל'),
  ('valuation_min_comparables', '5', 'מספר מודעות דומות מינימלי לחישוב טווח מחירי פרסום'),
  ('valuation_window_days', '120', 'חלון זמן (ימים) למודעות דומות בהערכת שווי'),
  ('images_min', '3', 'מספר תמונות מינימלי למודעה'),
  ('images_max', '15', 'מספר תמונות מרבי למודעה'),
  ('accessibility_contact', '{"name": "", "email": "", "phone": ""}', 'פרטי רכז/ת נגישות (מוצגים בהצהרת הנגישות)'),
  ('maintenance_mode', 'false', 'מצב תחזוקה')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Policy versions (drafts pending legal review — see docs/LEGAL_REVIEW_CHECKLIST.md)
-- ---------------------------------------------------------------------------
insert into public.policy_versions (policy_type, version, title, summary, is_current) values
  ('terms', '2026-11-draft-1', 'תנאי שימוש', 'טיוטה ראשונה – טעונה אישור יועץ משפטי', true),
  ('privacy', '2026-11-draft-1', 'מדיניות פרטיות', 'טיוטה ראשונה – טעונה אישור יועץ משפטי', true),
  ('private_seller_declaration', '2026-11-v1', 'הצהרת מוכר פרטי', 'אני מצהיר/ה שאני מפרסם/ת את הרכב כאדם פרטי ולא כסוחר, מגרש או נציג של עסק למכירת רכבים.', true),
  ('contact_sharing', '2026-11-v1', 'הסכמה לשיתוף פרטי קשר', 'הסכמה להצגת מספר הטלפון למתעניינים מחוברים בלבד', true),
  ('marketing', '2026-11-v1', 'הסכמה לדיוור שיווקי', 'הסכמה נפרדת, לא מסומנת כברירת מחדל', true)
on conflict (policy_type, version) do nothing;

-- ---------------------------------------------------------------------------
-- Vehicle data sources (provider registry)
-- ---------------------------------------------------------------------------
insert into public.vehicle_data_sources (key, name_he, name_en, provider_kind, source_url, dataset_name, license_info, usage_permission, supported_data_types, status, adapter_version, config) values
  ('gov_il_vehicles', 'מאגר כלי רכב – משרד התחבורה (data.gov.il)', 'Ministry of Transport vehicle registry (data.gov.il)', 'government_vehicle',
   'https://data.gov.il', 'כלי רכב פרטיים ומסחריים', 'רישיון מאגרי המידע הממשלתיים הפתוחים (נדרש אזכור מקור)', 'שימוש מותר בכפוף לתנאי הרישיון של data.gov.il; יש לאמת את תנאי השימוש המסחרי לפני השקה.',
   array['identity','specs','registration','test','color'], 'not_configured', '1.0.0', '{"api": "ckan_datastore_search", "resource_id_env": "GOV_VEHICLE_RESOURCE_ID"}'),
  ('gov_il_vehicle_history', 'היסטוריית נסועה ובעלויות – משרד התחבורה (data.gov.il)', 'Ministry of Transport mileage & ownership history (data.gov.il)', 'government_history',
   'https://data.gov.il', 'נתוני טסט ובעלויות היסטוריים', 'רישיון מאגרי המידע הממשלתיים הפתוחים', 'שימוש מותר בכפוף לתנאי הרישיון; כיסוי חלקי בלבד – לא כל רכב מופיע.',
   array['test_mileage_history','ownership_type_history'], 'not_configured', '1.0.0', '{"api": "ckan_datastore_search", "resource_id_env": "GOV_VEHICLE_HISTORY_RESOURCE_ID"}'),
  ('gov_il_recalls', 'קריאות ריקול – משרד התחבורה (data.gov.il)', 'Ministry of Transport recall notices (data.gov.il)', 'government_recalls',
   'https://data.gov.il', 'קריאות שירות (ריקול)', 'רישיון מאגרי המידע הממשלתיים הפתוחים', 'שימוש מותר בכפוף לתנאי הרישיון.',
   array['recalls'], 'not_configured', '1.0.0', '{"api": "ckan_datastore_search", "resource_id_env": "GOV_VEHICLE_RECALLS_RESOURCE_ID"}'),
  ('commercial_valuation', 'ספק הערכת שווי מסחרי', 'Commercial valuation provider', 'commercial_valuation',
   null, null, 'נדרש הסכם מסחרי', 'לא מחובר. נדרש הסכם מסחרי ומפתח API מהספק.', array['valuation'], 'not_configured', '0.1.0', '{"provider_env": "VALUATION_PROVIDER"}'),
  ('commercial_history', 'ספק היסטוריית רכב מורחבת', 'Extended vehicle-history provider', 'commercial_history',
   null, null, 'נדרש הסכם מסחרי', 'לא מחובר. נדרש הסכם מסחרי ומפתח API מהספק.', array['accident_history','insurance_history'], 'not_configured', '0.1.0', '{"provider_env": "HISTORY_PROVIDER"}'),
  ('supabase_phone_auth', 'אימות SMS (Supabase Phone Auth)', 'SMS OTP via Supabase Phone Auth', 'sms',
   'https://supabase.com/docs/guides/auth/phone-login', null, 'לפי ספק ה-SMS שנבחר', 'הגדרת ספק SMS מתבצעת בלוח הבקרה של Supabase.', array['otp'], 'not_configured', '1.0.0', '{"status_env": "AUTH_SMS_CONFIGURED"}'),
  ('email_provider', 'ספק דוא"ל', 'Email provider', 'email', null, null, null, 'אופציונלי.', array['transactional_email'], 'not_configured', '0.1.0', '{"provider_env": "EMAIL_PROVIDER"}'),
  ('analytics_provider', 'אנליטיקה', 'Analytics', 'analytics', null, null, null, 'אירועים אנונימיים בלבד; ללא מספרי רישוי או טלפונים.', array['events'], 'configured', '1.0.0', '{"mode": "internal_table"}')
on conflict (key) do nothing;

insert into public.vehicle_valuation_sources (key, name_he, source_type, status, priority, label_he, disclaimer_he, config) values
  ('internal_listings', 'מחירי פרסום של מודעות דומות ברק פרטי', 'internal_listings', 'configured', 10, 'מחירי פרסום של מודעות דומות', 'מדובר במחירי פרסום (מחירים מבוקשים) ולא במחירי עסקאות שבוצעו בפועל.', '{"min_comparables": 5, "window_days": 120}'),
  ('commercial_provider', 'ספק הערכת שווי מסחרי', 'commercial_provider', 'not_configured', 20, 'הערכת שווי מספק חיצוני', 'דורש הסכם מסחרי. לא מחובר.', '{}'),
  ('government_pricing', 'מחירון ממשלתי', 'government', 'not_configured', 30, 'מחיר ממשלתי', 'יחובר רק לאחר אישור הרשאות שימוש.', '{}')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Geography: districts, sub-districts (נפות), cities & local councils
-- Coordinates are approximate centroids for radius search; null where unknown.
-- CBS locality codes (סמל יישוב) are left null here and populated by the admin import
-- of the official CBS localities file (see docs/DATA_SOURCES.md).
-- ---------------------------------------------------------------------------
insert into public.geo_districts (code, name_he, name_en, sort_order) values
  ('north', 'מחוז הצפון', 'Northern District', 10),
  ('haifa', 'מחוז חיפה', 'Haifa District', 20),
  ('center', 'מחוז המרכז', 'Central District', 30),
  ('tel_aviv', 'מחוז תל אביב', 'Tel Aviv District', 40),
  ('jerusalem', 'מחוז ירושלים', 'Jerusalem District', 50),
  ('south', 'מחוז הדרום', 'Southern District', 60),
  ('judea_samaria', 'יהודה ושומרון', 'Judea and Samaria Area', 70)
on conflict (code) do nothing;

insert into public.geo_regions (district_id, code, name_he, name_en, sort_order)
select d.id, r.code, r.name_he, r.name_en, r.sort_order from (values
  ('north', 'safed', 'נפת צפת', 'Safed', 10), ('north', 'kinneret', 'נפת כנרת', 'Kinneret', 20), ('north', 'yizreel', 'נפת יזרעאל', 'Jezreel', 30),
  ('north', 'akko', 'נפת עכו', 'Akko', 40), ('north', 'golan', 'נפת גולן', 'Golan', 50),
  ('haifa', 'haifa', 'נפת חיפה', 'Haifa', 10), ('haifa', 'hadera', 'נפת חדרה', 'Hadera', 20),
  ('center', 'sharon', 'נפת השרון', 'Sharon', 10), ('center', 'petah_tikva', 'נפת פתח תקווה', 'Petah Tikva', 20),
  ('center', 'ramla', 'נפת רמלה', 'Ramla', 30), ('center', 'rehovot', 'נפת רחובות', 'Rehovot', 40),
  ('tel_aviv', 'tel_aviv', 'נפת תל אביב', 'Tel Aviv', 10),
  ('jerusalem', 'jerusalem', 'נפת ירושלים', 'Jerusalem', 10),
  ('south', 'ashkelon', 'נפת אשקלון', 'Ashkelon', 10), ('south', 'beer_sheva', 'נפת באר שבע', 'Beer Sheva', 20),
  ('judea_samaria', 'judea_samaria', 'יהודה ושומרון', 'Judea and Samaria', 10)
) as r(district, code, name_he, name_en, sort_order)
join public.geo_districts d on d.code = r.district
on conflict (code) do nothing;

insert into public.geo_cities (district_id, region_id, cbs_code, name_he, name_en, lat, lng, is_major)
select d.id, r.id, c.cbs, c.he, c.en, c.lat, c.lng, c.major from (values
  -- Tel Aviv district
  ('tel_aviv', null::integer, 'תל אביב - יפו', 'Tel Aviv-Yafo', 32.08, 34.78, true),
  ('tel_aviv', null::integer, 'חולון', 'Holon', 32.01, 34.77, true),
  ('tel_aviv', null::integer, 'בת ים', 'Bat Yam', 32.02, 34.75, true),
  ('tel_aviv', null::integer, 'רמת גן', 'Ramat Gan', 32.07, 34.82, true),
  ('tel_aviv', null::integer, 'בני ברק', 'Bnei Brak', 32.08, 34.83, true),
  ('tel_aviv', null::integer, 'גבעתיים', 'Givatayim', 32.07, 34.81, true),
  ('tel_aviv', null::integer, 'קריית אונו', 'Kiryat Ono', 32.06, 34.86, false),
  ('tel_aviv', null::integer, 'הרצליה', 'Herzliya', 32.17, 34.84, true),
  ('tel_aviv', null::integer, 'רמת השרון', 'Ramat HaSharon', 32.15, 34.84, false),
  ('tel_aviv', null::integer, 'אור יהודה', 'Or Yehuda', 32.03, 34.86, false),
  ('tel_aviv', null::integer, 'אזור', 'Azor', 32.02, 34.80, false),
  ('tel_aviv', null::integer, 'כפר שמריהו', 'Kfar Shmaryahu', 32.19, 34.82, false),
  -- Center district
  ('petah_tikva', null::integer, 'פתח תקווה', 'Petah Tikva', 32.09, 34.89, true),
  ('petah_tikva', null::integer, 'ראש העין', 'Rosh HaAyin', 32.10, 34.96, false),
  ('petah_tikva', null::integer, 'גבעת שמואל', 'Givat Shmuel', 32.08, 34.85, false),
  ('petah_tikva', null::integer, 'אלעד', 'Elad', 32.05, 34.95, false),
  ('petah_tikva', null::integer, 'שוהם', 'Shoham', 32.00, 34.95, false),
  ('petah_tikva', null::integer, 'יהוד-מונוסון', 'Yehud-Monosson', 32.03, 34.89, false),
  ('petah_tikva', null::integer, 'סביון', 'Savyon', 32.05, 34.88, false),
  ('petah_tikva', null::integer, 'גני תקווה', 'Ganei Tikva', 32.06, 34.87, false),
  ('petah_tikva', null::integer, 'בית דגן', 'Beit Dagan', 32.00, 34.83, false),
  ('sharon', null::integer, 'נתניה', 'Netanya', 32.33, 34.86, true),
  ('sharon', null::integer, 'כפר סבא', 'Kfar Saba', 32.18, 34.91, true),
  ('sharon', null::integer, 'רעננה', 'Ra''anana', 32.18, 34.87, true),
  ('sharon', null::integer, 'הוד השרון', 'Hod HaSharon', 32.15, 34.89, false),
  ('sharon', null::integer, 'טירה', 'Tira', 32.23, 34.95, false),
  ('sharon', null::integer, 'קלנסווה', 'Qalansawe', 32.28, 34.98, false),
  ('sharon', null::integer, 'כפר יונה', 'Kfar Yona', 32.32, 34.93, false),
  ('sharon', null::integer, 'אבן יהודה', 'Even Yehuda', 32.27, 34.89, false),
  ('sharon', null::integer, 'תל מונד', 'Tel Mond', 32.25, 34.92, false),
  ('sharon', null::integer, 'פרדסיה', 'Pardesiya', 32.31, 34.91, false),
  ('sharon', null::integer, 'קדימה-צורן', 'Kadima-Zoran', 32.28, 34.91, false),
  ('sharon', null::integer, 'כוכב יאיר - צור יגאל', 'Kochav Yair-Tzur Yigal', 32.23, 34.99, false),
  ('sharon', null::integer, 'ג''לג''וליה', 'Jaljulia', 32.15, 34.95, false),
  ('ramla', null::integer, 'ראשון לציון', 'Rishon LeZion', 31.97, 34.79, true),
  ('ramla', null::integer, 'רמלה', 'Ramla', 31.93, 34.87, true),
  ('ramla', null::integer, 'לוד', 'Lod', 31.95, 34.89, true),
  ('ramla', null::integer, 'מודיעין-מכבים-רעות', 'Modi''in-Maccabim-Re''ut', 31.90, 35.01, true),
  ('ramla', null::integer, 'באר יעקב', 'Beer Ya''akov', 31.94, 34.84, false),
  ('rehovot', null::integer, 'רחובות', 'Rehovot', 31.89, 34.81, true),
  ('rehovot', null::integer, 'נס ציונה', 'Ness Ziona', 31.93, 34.80, false),
  ('rehovot', null::integer, 'יבנה', 'Yavne', 31.88, 34.74, false),
  ('rehovot', null::integer, 'גדרה', 'Gedera', 31.81, 34.78, false),
  ('rehovot', null::integer, 'גן יבנה', 'Gan Yavne', 31.79, 34.71, false),
  ('rehovot', null::integer, 'מזכרת בתיה', 'Mazkeret Batya', 31.85, 34.84, false),
  ('rehovot', null::integer, 'קריית עקרון', 'Kiryat Ekron', 31.86, 34.82, false),
  ('rehovot', null::integer, 'בני עי"ש', 'Bnei Ayish', 31.78, 34.75, false),
  -- Haifa district
  ('haifa', null::integer, 'חיפה', 'Haifa', 32.79, 34.99, true),
  ('haifa', null::integer, 'קריית אתא', 'Kiryat Ata', 32.80, 35.11, false),
  ('haifa', null::integer, 'קריית ביאליק', 'Kiryat Bialik', 32.83, 35.09, false),
  ('haifa', null::integer, 'קריית מוצקין', 'Kiryat Motzkin', 32.84, 35.08, false),
  ('haifa', null::integer, 'קריית ים', 'Kiryat Yam', 32.85, 35.07, false),
  ('haifa', null::integer, 'נשר', 'Nesher', 32.77, 35.04, false),
  ('haifa', null::integer, 'טירת כרמל', 'Tirat Carmel', 32.76, 34.97, false),
  ('haifa', null::integer, 'טבעון', 'Kiryat Tivon', 32.72, 35.13, false),
  ('haifa', null::integer, 'רכסים', 'Rekhasim', 32.75, 35.10, false),
  ('haifa', null::integer, 'דאלית אל-כרמל', 'Daliyat al-Karmel', 32.69, 35.05, false),
  ('haifa', null::integer, 'עספיא', 'Isfiya', 32.72, 35.07, false),
  ('hadera', null::integer, 'חדרה', 'Hadera', 32.44, 34.92, true),
  ('hadera', null::integer, 'אום אל-פחם', 'Umm al-Fahm', 32.52, 35.15, false),
  ('hadera', null::integer, 'באקה אל-גרבייה', 'Baqa al-Gharbiyye', 32.42, 35.04, false),
  ('hadera', null::integer, 'זכרון יעקב', 'Zikhron Ya''akov', 32.57, 34.95, false),
  ('hadera', null::integer, 'בנימינה-גבעת עדה', 'Binyamina-Giv''at Ada', 32.52, 34.95, false),
  ('hadera', null::integer, 'פרדס חנה-כרכור', 'Pardes Hanna-Karkur', 32.47, 34.97, false),
  ('hadera', null::integer, 'אור עקיבא', 'Or Akiva', 32.51, 34.92, false),
  ('hadera', null::integer, 'קיסריה', 'Caesarea', 32.52, 34.90, false),
  ('hadera', null::integer, 'ג''סר א-זרקא', 'Jisr az-Zarqa', 32.54, 34.91, false),
  ('hadera', null::integer, 'עארה-ערערה', 'Ar''ara', 32.49, 35.09, false),
  ('hadera', null::integer, 'כפר קרע', 'Kafr Qara', 32.51, 35.05, false),
  -- North district
  ('yizreel', null::integer, 'נצרת', 'Nazareth', 32.70, 35.30, true),
  ('yizreel', null::integer, 'נוף הגליל', 'Nof HaGalil', 32.71, 35.33, false),
  ('yizreel', null::integer, 'עפולה', 'Afula', 32.61, 35.29, true),
  ('yizreel', null::integer, 'מגדל העמק', 'Migdal HaEmek', 32.67, 35.24, false),
  ('yizreel', null::integer, 'בית שאן', 'Beit She''an', 32.50, 35.50, false),
  ('yizreel', null::integer, 'יקנעם עילית', 'Yokneam Illit', 32.66, 35.11, false),
  ('yizreel', null::integer, 'כפר כנא', 'Kafr Kanna', 32.75, 35.34, false),
  ('yizreel', null::integer, 'שפרעם', 'Shefa-''Amr', 32.81, 35.17, false),
  ('yizreel', null::integer, 'עין מאהל', 'Ein Mahil', 32.72, 35.36, false),
  ('yizreel', null::integer, 'יפיע', 'Yafa an-Naseriyye', 32.69, 35.28, false),
  ('yizreel', null::integer, 'אכסאל', 'Iksal', 32.68, 35.32, false),
  ('yizreel', null::integer, 'רמת ישי', 'Ramat Yishai', 32.70, 35.17, false),
  ('yizreel', null::integer, 'זרזיר', 'Zarzir', 32.73, 35.21, false),
  ('kinneret', null::integer, 'טבריה', 'Tiberias', 32.79, 35.53, true),
  ('kinneret', null::integer, 'מגדל', 'Migdal', 32.84, 35.50, false),
  ('kinneret', null::integer, 'יבנאל', 'Yavne''el', 32.70, 35.51, false),
  ('kinneret', null::integer, 'כפר תבור', 'Kfar Tavor', 32.69, 35.42, false),
  ('safed', null::integer, 'צפת', 'Safed', 32.96, 35.50, true),
  ('safed', null::integer, 'קריית שמונה', 'Kiryat Shmona', 33.21, 35.57, false),
  ('safed', null::integer, 'חצור הגלילית', 'Hatzor HaGlilit', 32.98, 35.54, false),
  ('safed', null::integer, 'ראש פינה', 'Rosh Pinna', 32.97, 35.54, false),
  ('safed', null::integer, 'מטולה', 'Metula', 33.28, 35.57, false),
  ('safed', null::integer, 'טובא-זנגרייה', 'Tuba-Zangariyye', 32.97, 35.59, false),
  ('akko', null::integer, 'עכו', 'Acre', 32.93, 35.08, true),
  ('akko', null::integer, 'נהריה', 'Nahariya', 33.01, 35.10, true),
  ('akko', null::integer, 'כרמיאל', 'Karmiel', 32.92, 35.30, true),
  ('akko', null::integer, 'מעלות-תרשיחא', 'Ma''alot-Tarshiha', 33.02, 35.27, false),
  ('akko', null::integer, 'סח''נין', 'Sakhnin', 32.86, 35.30, false),
  ('akko', null::integer, 'טמרה', 'Tamra', 32.85, 35.20, false),
  ('akko', null::integer, 'עראבה', 'Arraba', 32.85, 35.34, false),
  ('akko', null::integer, 'מג''ד אל-כרום', 'Majd al-Krum', 32.92, 35.26, false),
  ('akko', null::integer, 'כפר יאסיף', 'Kafr Yasif', 32.95, 35.16, false),
  ('akko', null::integer, 'ג''דיידה-מכר', 'Jadeidi-Makr', 32.93, 35.15, false),
  ('akko', null::integer, 'שלומי', 'Shlomi', 33.07, 35.14, false),
  ('akko', null::integer, 'דיר אל-אסד', 'Deir al-Asad', 32.94, 35.27, false),
  ('akko', null::integer, 'בענה', 'Bi''ina', 32.93, 35.27, false),
  ('akko', null::integer, 'נחף', 'Nahf', 32.93, 35.32, false),
  ('akko', null::integer, 'ראמה', 'Rameh', 32.94, 35.37, false),
  ('akko', null::integer, 'כאבול', 'Kabul', 32.87, 35.21, false),
  ('golan', null::integer, 'קצרין', 'Katzrin', 32.99, 35.69, false),
  ('golan', null::integer, 'מג''דל שמס', 'Majdal Shams', 33.27, 35.77, false),
  -- Jerusalem district
  ('jerusalem', null::integer, 'ירושלים', 'Jerusalem', 31.77, 35.21, true),
  ('jerusalem', null::integer, 'בית שמש', 'Beit Shemesh', 31.75, 34.99, true),
  ('jerusalem', null::integer, 'מבשרת ציון', 'Mevaseret Zion', 31.80, 35.15, false),
  ('jerusalem', null::integer, 'אבו גוש', 'Abu Ghosh', 31.81, 35.11, false),
  ('jerusalem', null::integer, 'קריית יערים', 'Kiryat Ye''arim', 31.81, 35.10, false),
  ('jerusalem', null::integer, 'צור הדסה', 'Tzur Hadassah', 31.72, 35.10, false),
  -- South district
  ('beer_sheva', null::integer, 'באר שבע', 'Beer Sheva', 31.25, 34.79, true),
  ('beer_sheva', null::integer, 'אילת', 'Eilat', 29.56, 34.95, true),
  ('beer_sheva', null::integer, 'דימונה', 'Dimona', 31.07, 35.03, false),
  ('beer_sheva', null::integer, 'ערד', 'Arad', 31.26, 35.21, false),
  ('beer_sheva', null::integer, 'נתיבות', 'Netivot', 31.42, 34.59, false),
  ('beer_sheva', null::integer, 'אופקים', 'Ofakim', 31.31, 34.62, false),
  ('beer_sheva', null::integer, 'רהט', 'Rahat', 31.39, 34.75, false),
  ('beer_sheva', null::integer, 'ירוחם', 'Yeruham', 30.99, 34.93, false),
  ('beer_sheva', null::integer, 'מצפה רמון', 'Mitzpe Ramon', 30.61, 34.80, false),
  ('beer_sheva', null::integer, 'עומר', 'Omer', 31.27, 34.85, false),
  ('beer_sheva', null::integer, 'להבים', 'Lehavim', 31.37, 34.82, false),
  ('beer_sheva', null::integer, 'מיתר', 'Meitar', 31.32, 34.93, false),
  ('beer_sheva', null::integer, 'תל שבע', 'Tel Sheva', 31.25, 34.86, false),
  ('beer_sheva', null::integer, 'כסיפה', 'Kuseife', 31.24, 35.10, false),
  ('beer_sheva', null::integer, 'חורה', 'Hura', 31.30, 34.94, false),
  ('beer_sheva', null::integer, 'לקיה', 'Lakiya', 31.32, 34.87, false),
  ('beer_sheva', null::integer, 'ערערה בנגב', 'Ar''ara BaNegev', 31.16, 35.01, false),
  ('beer_sheva', null::integer, 'שגב שלום', 'Segev Shalom', 31.20, 34.84, false),
  ('ashkelon', null::integer, 'אשדוד', 'Ashdod', 31.80, 34.65, true),
  ('ashkelon', null::integer, 'אשקלון', 'Ashkelon', 31.67, 34.57, true),
  ('ashkelon', null::integer, 'קריית גת', 'Kiryat Gat', 31.61, 34.76, false),
  ('ashkelon', null::integer, 'קריית מלאכי', 'Kiryat Malakhi', 31.73, 34.74, false),
  ('ashkelon', null::integer, 'שדרות', 'Sderot', 31.52, 34.60, false),
  -- Judea and Samaria
  ('judea_samaria', null::integer, 'מעלה אדומים', 'Ma''ale Adumim', 31.78, 35.30, false),
  ('judea_samaria', null::integer, 'מודיעין עילית', 'Modi''in Illit', 31.93, 35.04, false),
  ('judea_samaria', null::integer, 'ביתר עילית', 'Beitar Illit', 31.70, 35.12, false),
  ('judea_samaria', null::integer, 'אריאל', 'Ariel', 32.11, 35.17, false),
  ('judea_samaria', null::integer, 'גבעת זאב', 'Giv''at Ze''ev', 31.86, 35.17, false),
  ('judea_samaria', null::integer, 'אפרת', 'Efrat', 31.66, 35.15, false),
  ('judea_samaria', null::integer, 'קרני שומרון', 'Karnei Shomron', 32.17, 35.09, false),
  ('judea_samaria', null::integer, 'אורנית', 'Oranit', 32.13, 34.99, false),
  ('judea_samaria', null::integer, 'אלפי מנשה', 'Alfei Menashe', 32.17, 35.02, false),
  ('judea_samaria', null::integer, 'בית אל', 'Beit El', 31.94, 35.22, false),
  ('judea_samaria', null::integer, 'קריית ארבע', 'Kiryat Arba', 31.53, 35.12, false),
  ('judea_samaria', null::integer, 'עמנואל', 'Immanuel', 32.16, 35.13, false),
  ('judea_samaria', null::integer, 'אלקנה', 'Elkana', 32.11, 35.03, false)
) as c(region, cbs, he, en, lat, lng, major)
join public.geo_regions r on r.code = c.region
join public.geo_districts d on d.id = r.district_id
on conflict (district_id, name_he) do nothing;

-- ---------------------------------------------------------------------------
-- Vehicle catalog: manufacturers common in the Israeli market and their
-- widely sold passenger models. Trims/generations are managed via admin import.
-- ---------------------------------------------------------------------------
insert into public.vehicle_makes (slug, name_he, name_en, is_popular, sort_order) values
  ('toyota', 'טויוטה', 'Toyota', true, 10), ('hyundai', 'יונדאי', 'Hyundai', true, 20), ('kia', 'קיה', 'Kia', true, 30),
  ('mazda', 'מאזדה', 'Mazda', true, 40), ('skoda', 'סקודה', 'Skoda', true, 50), ('mitsubishi', 'מיצובישי', 'Mitsubishi', true, 60),
  ('nissan', 'ניסאן', 'Nissan', true, 70), ('suzuki', 'סוזוקי', 'Suzuki', true, 80), ('honda', 'הונדה', 'Honda', true, 90),
  ('volkswagen', 'פולקסווגן', 'Volkswagen', true, 100), ('seat', 'סיאט', 'SEAT', true, 110), ('chevrolet', 'שברולט', 'Chevrolet', false, 120),
  ('ford', 'פורד', 'Ford', false, 130), ('peugeot', 'פיג''ו', 'Peugeot', true, 140), ('citroen', 'סיטרואן', 'Citroën', false, 150),
  ('renault', 'רנו', 'Renault', false, 160), ('opel', 'אופל', 'Opel', false, 170), ('fiat', 'פיאט', 'Fiat', false, 180),
  ('dacia', 'דאצ''יה', 'Dacia', false, 190), ('mg', 'MG', 'MG', true, 200), ('byd', 'BYD', 'BYD', true, 210),
  ('chery', 'צ''רי', 'Chery', false, 220), ('geely', 'ג''ילי', 'Geely', false, 230), ('tesla', 'טסלה', 'Tesla', true, 240),
  ('mercedes-benz', 'מרצדס', 'Mercedes-Benz', true, 250), ('bmw', 'ב.מ.וו', 'BMW', true, 260), ('audi', 'אאודי', 'Audi', true, 270),
  ('volvo', 'וולוו', 'Volvo', false, 280), ('lexus', 'לקסוס', 'Lexus', false, 290), ('subaru', 'סובארו', 'Subaru', false, 300),
  ('mini', 'מיני', 'MINI', false, 310), ('jeep', 'ג''יפ', 'Jeep', false, 320), ('land-rover', 'לנד רובר', 'Land Rover', false, 330),
  ('jaguar', 'יגואר', 'Jaguar', false, 340), ('porsche', 'פורשה', 'Porsche', false, 350), ('alfa-romeo', 'אלפא רומיאו', 'Alfa Romeo', false, 360),
  ('cupra', 'קופרה', 'Cupra', false, 370), ('ds', 'DS', 'DS', false, 380), ('smart', 'סמארט', 'Smart', false, 390),
  ('isuzu', 'איסוזו', 'Isuzu', false, 400), ('ssangyong', 'סאנגיונג', 'SsangYong', false, 410), ('polestar', 'פולסטאר', 'Polestar', false, 420),
  ('xpeng', 'אקספנג', 'XPeng', false, 430), ('nio', 'ניו', 'NIO', false, 440), ('lynk-co', 'לינק אנד קו', 'Lynk & Co', false, 450),
  ('jac', 'JAC', 'JAC', false, 460), ('leapmotor', 'ליפמוטור', 'Leapmotor', false, 470), ('zeekr', 'זיקר', 'Zeekr', false, 480),
  ('ora', 'אורה', 'ORA', false, 490), ('aiways', 'איוויז', 'Aiways', false, 500), ('seres', 'סרס', 'Seres', false, 510),
  ('dongfeng', 'דונגפנג', 'Dongfeng', false, 520), ('infiniti', 'אינפיניטי', 'Infiniti', false, 530), ('lancia', 'לנצ''יה', 'Lancia', false, 540),
  ('daihatsu', 'דייהטסו', 'Daihatsu', false, 550), ('lada', 'לאדה', 'Lada', false, 560)
on conflict (slug) do nothing;

insert into public.vehicle_catalog_aliases (entity_type, entity_id, alias, source)
select 'make', m.id, a.alias, 'seed' from (values
  ('toyota', 'טויוטא'), ('hyundai', 'יונדאי'), ('hyundai', 'יונדיי'), ('hyundai', 'Hyundai'), ('kia', 'קיא'), ('mazda', 'מזדה'),
  ('skoda', 'שקודה'), ('mitsubishi', 'מיצובישי'), ('mitsubishi', 'מיצובישי'), ('volkswagen', 'VW'), ('volkswagen', 'פולקסוואגן'),
  ('mercedes-benz', 'מרצדס בנץ'), ('mercedes-benz', 'Mercedes'), ('bmw', 'BMW'), ('bmw', 'ב.מ.וו.'), ('bmw', 'במוו'),
  ('peugeot', 'פיגו'), ('citroen', 'סיטרואן'), ('citroen', 'Citroen'), ('chevrolet', 'שברולט'), ('chevrolet', 'שברולט'),
  ('seat', 'סיאט'), ('dacia', 'דאציה'), ('chery', 'צרי'), ('geely', 'גילי'), ('jeep', 'גיפ'), ('land-rover', 'לנדרובר'),
  ('ssangyong', 'סאנג יונג'), ('ssangyong', 'KGM')
) as a(slug, alias) join public.vehicle_makes m on m.slug = a.slug
on conflict (entity_type, alias) do nothing;

insert into public.vehicle_models (make_id, slug, name_he, name_en, body_style, category, is_popular)
select m.id, v.slug, v.he, v.en, v.body::public.body_style, v.cat, v.pop from (values
  -- Toyota
  ('toyota', 'corolla', 'קורולה', 'Corolla', 'sedan', 'family', true), ('toyota', 'yaris', 'יאריס', 'Yaris', 'hatchback', 'city', true),
  ('toyota', 'yaris-cross', 'יאריס קרוס', 'Yaris Cross', 'crossover', 'suv', true), ('toyota', 'c-hr', 'C-HR', 'C-HR', 'crossover', 'suv', true),
  ('toyota', 'rav4', 'RAV4', 'RAV4', 'suv', 'suv', true), ('toyota', 'auris', 'אוריס', 'Auris', 'hatchback', 'family', false),
  ('toyota', 'prius', 'פריוס', 'Prius', 'hatchback', 'family', false), ('toyota', 'camry', 'קאמרי', 'Camry', 'sedan', 'executive', false),
  ('toyota', 'aygo', 'אייגו', 'Aygo', 'hatchback', 'city', false), ('toyota', 'land-cruiser', 'לנד קרוזר', 'Land Cruiser', 'suv', 'suv', false),
  ('toyota', 'highlander', 'היילנדר', 'Highlander', 'suv', 'suv', false), ('toyota', 'bz4x', 'bZ4X', 'bZ4X', 'suv', 'electric', false),
  ('toyota', 'corolla-cross', 'קורולה קרוס', 'Corolla Cross', 'crossover', 'suv', true), ('toyota', 'verso', 'ורסו', 'Verso', 'mpv', 'mpv', false),
  -- Hyundai
  ('hyundai', 'i10', 'i10', 'i10', 'hatchback', 'city', true), ('hyundai', 'i20', 'i20', 'i20', 'hatchback', 'city', true),
  ('hyundai', 'i25', 'i25', 'i25 (Accent)', 'sedan', 'family', true), ('hyundai', 'i30', 'i30', 'i30', 'hatchback', 'family', true),
  ('hyundai', 'i35', 'i35', 'i35 (Elantra)', 'sedan', 'family', true), ('hyundai', 'elantra', 'אלנטרה', 'Elantra', 'sedan', 'family', true),
  ('hyundai', 'ioniq', 'איוניק', 'Ioniq', 'hatchback', 'family', true), ('hyundai', 'ioniq-5', 'איוניק 5', 'Ioniq 5', 'crossover', 'electric', true),
  ('hyundai', 'ioniq-6', 'איוניק 6', 'Ioniq 6', 'sedan', 'electric', false), ('hyundai', 'kona', 'קונה', 'Kona', 'crossover', 'suv', true),
  ('hyundai', 'tucson', 'טוסון', 'Tucson', 'suv', 'suv', true), ('hyundai', 'santa-fe', 'סנטה פה', 'Santa Fe', 'suv', 'suv', false),
  ('hyundai', 'bayon', 'באיון', 'Bayon', 'crossover', 'suv', false), ('hyundai', 'venue', 'ונו', 'Venue', 'crossover', 'suv', false),
  ('hyundai', 'sonata', 'סונטה', 'Sonata', 'sedan', 'executive', false), ('hyundai', 'staria', 'סטאריה', 'Staria', 'minivan', 'mpv', false),
  -- Kia
  ('kia', 'picanto', 'פיקנטו', 'Picanto', 'hatchback', 'city', true), ('kia', 'rio', 'ריו', 'Rio', 'hatchback', 'city', true),
  ('kia', 'stonic', 'סטוניק', 'Stonic', 'crossover', 'suv', true), ('kia', 'niro', 'נירו', 'Niro', 'crossover', 'suv', true),
  ('kia', 'ceed', 'סיד', 'Ceed', 'hatchback', 'family', true), ('kia', 'xceed', 'XCeed', 'XCeed', 'crossover', 'suv', false),
  ('kia', 'sportage', 'ספורטאז''', 'Sportage', 'suv', 'suv', true), ('kia', 'sorento', 'סורנטו', 'Sorento', 'suv', 'suv', false),
  ('kia', 'seltos', 'סלטוס', 'Seltos', 'crossover', 'suv', false), ('kia', 'ev6', 'EV6', 'EV6', 'crossover', 'electric', true),
  ('kia', 'ev3', 'EV3', 'EV3', 'crossover', 'electric', false), ('kia', 'ev9', 'EV9', 'EV9', 'suv', 'electric', false),
  ('kia', 'forte', 'פורטה', 'Forte', 'sedan', 'family', false), ('kia', 'soul', 'סול', 'Soul', 'crossover', 'suv', false),
  ('kia', 'carnival', 'קרניבל', 'Carnival', 'minivan', 'mpv', false), ('kia', 'carens', 'קרנס', 'Carens', 'mpv', 'mpv', false),
  -- Mazda
  ('mazda', 'mazda2', 'מאזדה 2', 'Mazda2', 'hatchback', 'city', true), ('mazda', 'mazda3', 'מאזדה 3', 'Mazda3', 'hatchback', 'family', true),
  ('mazda', 'mazda6', 'מאזדה 6', 'Mazda6', 'sedan', 'executive', false), ('mazda', 'cx-3', 'CX-3', 'CX-3', 'crossover', 'suv', true),
  ('mazda', 'cx-30', 'CX-30', 'CX-30', 'crossover', 'suv', true), ('mazda', 'cx-5', 'CX-5', 'CX-5', 'suv', 'suv', true),
  ('mazda', 'cx-60', 'CX-60', 'CX-60', 'suv', 'suv', false), ('mazda', 'mx-30', 'MX-30', 'MX-30', 'crossover', 'electric', false),
  -- Skoda
  ('skoda', 'fabia', 'פאביה', 'Fabia', 'hatchback', 'city', true), ('skoda', 'scala', 'סקאלה', 'Scala', 'hatchback', 'family', true),
  ('skoda', 'octavia', 'אוקטביה', 'Octavia', 'sedan', 'family', true), ('skoda', 'superb', 'סופרב', 'Superb', 'sedan', 'executive', false),
  ('skoda', 'kamiq', 'קאמיק', 'Kamiq', 'crossover', 'suv', true), ('skoda', 'karoq', 'קארוק', 'Karoq', 'suv', 'suv', true),
  ('skoda', 'kodiaq', 'קודיאק', 'Kodiaq', 'suv', 'suv', false), ('skoda', 'enyaq', 'אניאק', 'Enyaq', 'suv', 'electric', true),
  ('skoda', 'rapid', 'ראפיד', 'Rapid', 'sedan', 'family', false), ('skoda', 'citigo', 'סיטיגו', 'Citigo', 'hatchback', 'city', false),
  -- Mitsubishi
  ('mitsubishi', 'outlander', 'אאוטלנדר', 'Outlander', 'suv', 'suv', true), ('mitsubishi', 'eclipse-cross', 'אקליפס קרוס', 'Eclipse Cross', 'crossover', 'suv', true),
  ('mitsubishi', 'asx', 'ASX', 'ASX', 'crossover', 'suv', true), ('mitsubishi', 'space-star', 'ספייס סטאר', 'Space Star', 'hatchback', 'city', true),
  ('mitsubishi', 'attrage', 'אטראז''', 'Attrage', 'sedan', 'city', false), ('mitsubishi', 'lancer', 'לנסר', 'Lancer', 'sedan', 'family', false),
  ('mitsubishi', 'pajero', 'פג''רו', 'Pajero', 'suv', 'suv', false),
  -- Nissan
  ('nissan', 'micra', 'מיקרה', 'Micra', 'hatchback', 'city', true), ('nissan', 'juke', 'ג''וק', 'Juke', 'crossover', 'suv', true),
  ('nissan', 'qashqai', 'קשקאי', 'Qashqai', 'crossover', 'suv', true), ('nissan', 'x-trail', 'אקס-טרייל', 'X-Trail', 'suv', 'suv', false),
  ('nissan', 'leaf', 'ליף', 'Leaf', 'hatchback', 'electric', false), ('nissan', 'sentra', 'סנטרה', 'Sentra', 'sedan', 'family', false),
  ('nissan', 'note', 'נוט', 'Note', 'hatchback', 'city', false), ('nissan', 'kicks', 'קיקס', 'Kicks', 'crossover', 'suv', false),
  -- Suzuki
  ('suzuki', 'swift', 'סוויפט', 'Swift', 'hatchback', 'city', true), ('suzuki', 'ignis', 'איגניס', 'Ignis', 'hatchback', 'city', false),
  ('suzuki', 'vitara', 'ויטרה', 'Vitara', 'crossover', 'suv', true), ('suzuki', 's-cross', 'S-Cross', 'S-Cross', 'crossover', 'suv', true),
  ('suzuki', 'jimny', 'ג''ימני', 'Jimny', 'suv', 'suv', false), ('suzuki', 'baleno', 'באלנו', 'Baleno', 'hatchback', 'city', false),
  ('suzuki', 'celerio', 'סלריו', 'Celerio', 'hatchback', 'city', false), ('suzuki', 'sx4', 'SX4', 'SX4', 'crossover', 'suv', false),
  -- Honda
  ('honda', 'civic', 'סיוויק', 'Civic', 'hatchback', 'family', true), ('honda', 'jazz', 'ג''אז', 'Jazz', 'hatchback', 'city', true),
  ('honda', 'hr-v', 'HR-V', 'HR-V', 'crossover', 'suv', true), ('honda', 'cr-v', 'CR-V', 'CR-V', 'suv', 'suv', true),
  ('honda', 'accord', 'אקורד', 'Accord', 'sedan', 'executive', false), ('honda', 'zr-v', 'ZR-V', 'ZR-V', 'crossover', 'suv', false),
  -- Volkswagen
  ('volkswagen', 'polo', 'פולו', 'Polo', 'hatchback', 'city', true), ('volkswagen', 'golf', 'גולף', 'Golf', 'hatchback', 'family', true),
  ('volkswagen', 'jetta', 'ג''טה', 'Jetta', 'sedan', 'family', false), ('volkswagen', 'passat', 'פאסאט', 'Passat', 'sedan', 'executive', false),
  ('volkswagen', 't-cross', 'T-Cross', 'T-Cross', 'crossover', 'suv', true), ('volkswagen', 't-roc', 'T-Roc', 'T-Roc', 'crossover', 'suv', true),
  ('volkswagen', 'tiguan', 'טיגואן', 'Tiguan', 'suv', 'suv', true), ('volkswagen', 'touareg', 'טוארג', 'Touareg', 'suv', 'suv', false),
  ('volkswagen', 'id3', 'ID.3', 'ID.3', 'hatchback', 'electric', false), ('volkswagen', 'id4', 'ID.4', 'ID.4', 'suv', 'electric', true),
  ('volkswagen', 'up', 'up!', 'up!', 'hatchback', 'city', false), ('volkswagen', 'taigo', 'טאיגו', 'Taigo', 'crossover', 'suv', false),
  -- SEAT / Cupra
  ('seat', 'ibiza', 'איביזה', 'Ibiza', 'hatchback', 'city', true), ('seat', 'leon', 'לאון', 'Leon', 'hatchback', 'family', true),
  ('seat', 'arona', 'ארונה', 'Arona', 'crossover', 'suv', true), ('seat', 'ateca', 'אטקה', 'Ateca', 'suv', 'suv', true),
  ('seat', 'tarraco', 'טאראקו', 'Tarraco', 'suv', 'suv', false), ('seat', 'toledo', 'טולדו', 'Toledo', 'sedan', 'family', false),
  ('cupra', 'formentor', 'פורמנטור', 'Formentor', 'crossover', 'suv', true), ('cupra', 'born', 'בורן', 'Born', 'hatchback', 'electric', false),
  ('cupra', 'leon', 'לאון', 'Leon', 'hatchback', 'family', false), ('cupra', 'ateca', 'אטקה', 'Ateca', 'suv', 'suv', false),
  -- Chevrolet / Ford / Opel
  ('chevrolet', 'spark', 'ספארק', 'Spark', 'hatchback', 'city', false), ('chevrolet', 'cruze', 'קרוז', 'Cruze', 'sedan', 'family', false),
  ('chevrolet', 'malibu', 'מאליבו', 'Malibu', 'sedan', 'executive', false), ('chevrolet', 'trax', 'טראקס', 'Trax', 'crossover', 'suv', false),
  ('chevrolet', 'equinox', 'אקווינוקס', 'Equinox', 'suv', 'suv', false), ('chevrolet', 'sonic', 'סוניק', 'Sonic', 'hatchback', 'city', false),
  ('ford', 'fiesta', 'פיאסטה', 'Fiesta', 'hatchback', 'city', false), ('ford', 'focus', 'פוקוס', 'Focus', 'hatchback', 'family', false),
  ('ford', 'kuga', 'קוגה', 'Kuga', 'suv', 'suv', false), ('ford', 'puma', 'פומה', 'Puma', 'crossover', 'suv', false),
  ('ford', 'mustang-mach-e', 'מוסטנג מאך-E', 'Mustang Mach-E', 'suv', 'electric', false), ('ford', 'edge', 'אדג''', 'Edge', 'suv', 'suv', false),
  ('opel', 'corsa', 'קורסה', 'Corsa', 'hatchback', 'city', false), ('opel', 'astra', 'אסטרה', 'Astra', 'hatchback', 'family', false),
  ('opel', 'mokka', 'מוקה', 'Mokka', 'crossover', 'suv', false), ('opel', 'crossland', 'קרוסלנד', 'Crossland', 'crossover', 'suv', false),
  ('opel', 'grandland', 'גרנדלנד', 'Grandland', 'suv', 'suv', false), ('opel', 'insignia', 'אינסיגניה', 'Insignia', 'sedan', 'executive', false),
  -- Peugeot / Citroën / DS / Renault / Dacia / Fiat
  ('peugeot', '208', '208', '208', 'hatchback', 'city', true), ('peugeot', '2008', '2008', '2008', 'crossover', 'suv', true),
  ('peugeot', '308', '308', '308', 'hatchback', 'family', true), ('peugeot', '3008', '3008', '3008', 'suv', 'suv', true),
  ('peugeot', '5008', '5008', '5008', 'suv', 'suv', false), ('peugeot', '108', '108', '108', 'hatchback', 'city', false),
  ('peugeot', '508', '508', '508', 'sedan', 'executive', false), ('peugeot', 'e-208', 'e-208', 'e-208', 'hatchback', 'electric', false),
  ('citroen', 'c3', 'C3', 'C3', 'hatchback', 'city', true), ('citroen', 'c3-aircross', 'C3 אירקרוס', 'C3 Aircross', 'crossover', 'suv', false),
  ('citroen', 'c4', 'C4', 'C4', 'hatchback', 'family', false), ('citroen', 'c5-aircross', 'C5 אירקרוס', 'C5 Aircross', 'suv', 'suv', false),
  ('citroen', 'c1', 'C1', 'C1', 'hatchback', 'city', false), ('citroen', 'berlingo', 'ברלינגו', 'Berlingo', 'mpv', 'mpv', false),
  ('ds', 'ds3-crossback', 'DS3 קרוסבק', 'DS 3 Crossback', 'crossover', 'suv', false), ('ds', 'ds7', 'DS7', 'DS 7', 'suv', 'suv', false),
  ('renault', 'clio', 'קליאו', 'Clio', 'hatchback', 'city', true), ('renault', 'captur', 'קפצ''ור', 'Captur', 'crossover', 'suv', true),
  ('renault', 'megane', 'מגאן', 'Mégane', 'hatchback', 'family', true), ('renault', 'kadjar', 'קדג''אר', 'Kadjar', 'suv', 'suv', false),
  ('renault', 'zoe', 'זואי', 'Zoe', 'hatchback', 'electric', false), ('renault', 'arkana', 'ארקנה', 'Arkana', 'crossover', 'suv', false),
  ('renault', 'austral', 'אוסטרל', 'Austral', 'suv', 'suv', false), ('renault', 'koleos', 'קולאוס', 'Koleos', 'suv', 'suv', false),
  ('renault', 'fluence', 'פלואנס', 'Fluence', 'sedan', 'family', false), ('renault', 'grand-scenic', 'גרנד סניק', 'Grand Scénic', 'mpv', 'mpv', false),
  ('dacia', 'sandero', 'סנדרו', 'Sandero', 'hatchback', 'city', true), ('dacia', 'duster', 'דאסטר', 'Duster', 'suv', 'suv', true),
  ('dacia', 'logan', 'לוגאן', 'Logan', 'sedan', 'city', false), ('dacia', 'jogger', 'ג''וגר', 'Jogger', 'mpv', 'mpv', false),
  ('dacia', 'spring', 'ספרינג', 'Spring', 'hatchback', 'electric', false),
  ('fiat', '500', '500', '500', 'hatchback', 'city', true), ('fiat', 'panda', 'פנדה', 'Panda', 'hatchback', 'city', false),
  ('fiat', 'tipo', 'טיפו', 'Tipo', 'hatchback', 'family', false), ('fiat', '500x', '500X', '500X', 'crossover', 'suv', false),
  ('fiat', '500e', '500e', '500e', 'hatchback', 'electric', false),
  -- Chinese & EV brands
  ('mg', 'zs', 'ZS', 'ZS', 'crossover', 'suv', true), ('mg', 'zs-ev', 'ZS EV', 'ZS EV', 'crossover', 'electric', true),
  ('mg', 'mg4', 'MG4', 'MG4', 'hatchback', 'electric', true), ('mg', 'hs', 'HS', 'HS', 'suv', 'suv', true),
  ('mg', 'mg5', 'MG5', 'MG5', 'station_wagon', 'electric', false), ('mg', 'marvel-r', 'מארוול R', 'Marvel R', 'suv', 'electric', false),
  ('mg', 'ehs', 'EHS', 'EHS', 'suv', 'suv', false), ('mg', 'mg3', 'MG3', 'MG3', 'hatchback', 'city', false),
  ('byd', 'atto-3', 'אטו 3', 'Atto 3', 'crossover', 'electric', true), ('byd', 'dolphin', 'דולפין', 'Dolphin', 'hatchback', 'electric', true),
  ('byd', 'seal', 'סיל', 'Seal', 'sedan', 'electric', true), ('byd', 'seal-u', 'סיל U', 'Seal U', 'suv', 'electric', false),
  ('byd', 'tang', 'טאנג', 'Tang', 'suv', 'electric', false), ('byd', 'han', 'האן', 'Han', 'sedan', 'electric', false),
  ('chery', 'tiggo-7-pro', 'טיגו 7 פרו', 'Tiggo 7 Pro', 'suv', 'suv', true), ('chery', 'tiggo-8-pro', 'טיגו 8 פרו', 'Tiggo 8 Pro', 'suv', 'suv', true),
  ('chery', 'tiggo-4-pro', 'טיגו 4 פרו', 'Tiggo 4 Pro', 'crossover', 'suv', false), ('chery', 'omoda-5', 'אומודה 5', 'Omoda 5', 'crossover', 'suv', false),
  ('geely', 'geometry-c', 'ג''אומטרי C', 'Geometry C', 'crossover', 'electric', true), ('geely', 'coolray', 'קולריי', 'Coolray', 'crossover', 'suv', false),
  ('tesla', 'model-3', 'מודל 3', 'Model 3', 'sedan', 'electric', true), ('tesla', 'model-y', 'מודל Y', 'Model Y', 'crossover', 'electric', true),
  ('tesla', 'model-s', 'מודל S', 'Model S', 'sedan', 'electric', false), ('tesla', 'model-x', 'מודל X', 'Model X', 'suv', 'electric', false),
  ('polestar', 'polestar-2', 'פולסטאר 2', 'Polestar 2', 'sedan', 'electric', false),
  ('xpeng', 'g3', 'G3', 'G3', 'crossover', 'electric', false), ('xpeng', 'p7', 'P7', 'P7', 'sedan', 'electric', false), ('xpeng', 'g9', 'G9', 'G9', 'suv', 'electric', false),
  ('nio', 'et5', 'ET5', 'ET5', 'sedan', 'electric', false), ('nio', 'el6', 'EL6', 'EL6', 'suv', 'electric', false),
  ('lynk-co', '01', '01', '01', 'suv', 'suv', false), ('jac', 'e-js4', 'e-JS4', 'e-JS4', 'crossover', 'electric', false),
  ('leapmotor', 'c10', 'C10', 'C10', 'suv', 'electric', false), ('leapmotor', 't03', 'T03', 'T03', 'hatchback', 'electric', false),
  ('zeekr', 'x', 'X', 'X', 'crossover', 'electric', false), ('zeekr', '001', '001', '001', 'station_wagon', 'electric', false),
  ('ora', 'funky-cat', 'פאנקי קאט', 'Funky Cat', 'hatchback', 'electric', false), ('aiways', 'u5', 'U5', 'U5', 'suv', 'electric', false),
  ('seres', 'seres-3', 'סרס 3', 'Seres 3', 'crossover', 'electric', false), ('dongfeng', 'e70', 'E70', 'E70', 'sedan', 'electric', false),
  -- Premium
  ('mercedes-benz', 'a-class', 'A-Class', 'A-Class', 'hatchback', 'luxury', true), ('mercedes-benz', 'c-class', 'C-Class', 'C-Class', 'sedan', 'luxury', true),
  ('mercedes-benz', 'e-class', 'E-Class', 'E-Class', 'sedan', 'luxury', false), ('mercedes-benz', 'cla', 'CLA', 'CLA', 'sedan', 'luxury', true),
  ('mercedes-benz', 'gla', 'GLA', 'GLA', 'crossover', 'luxury', true), ('mercedes-benz', 'glb', 'GLB', 'GLB', 'suv', 'luxury', false),
  ('mercedes-benz', 'glc', 'GLC', 'GLC', 'suv', 'luxury', true), ('mercedes-benz', 'gle', 'GLE', 'GLE', 'suv', 'luxury', false),
  ('mercedes-benz', 'eqa', 'EQA', 'EQA', 'crossover', 'electric', false), ('mercedes-benz', 'eqb', 'EQB', 'EQB', 'suv', 'electric', false),
  ('mercedes-benz', 'eqc', 'EQC', 'EQC', 'suv', 'electric', false), ('mercedes-benz', 's-class', 'S-Class', 'S-Class', 'sedan', 'luxury', false),
  ('bmw', '1-series', 'סדרה 1', '1 Series', 'hatchback', 'luxury', true), ('bmw', '2-series', 'סדרה 2', '2 Series', 'coupe', 'luxury', false),
  ('bmw', '3-series', 'סדרה 3', '3 Series', 'sedan', 'luxury', true), ('bmw', '5-series', 'סדרה 5', '5 Series', 'sedan', 'luxury', false),
  ('bmw', 'x1', 'X1', 'X1', 'crossover', 'luxury', true), ('bmw', 'x2', 'X2', 'X2', 'crossover', 'luxury', false),
  ('bmw', 'x3', 'X3', 'X3', 'suv', 'luxury', true), ('bmw', 'x5', 'X5', 'X5', 'suv', 'luxury', false),
  ('bmw', 'i3', 'i3', 'i3', 'hatchback', 'electric', false), ('bmw', 'i4', 'i4', 'i4', 'sedan', 'electric', false), ('bmw', 'ix', 'iX', 'iX', 'suv', 'electric', false),
  ('bmw', 'ix1', 'iX1', 'iX1', 'crossover', 'electric', false), ('bmw', 'ix3', 'iX3', 'iX3', 'suv', 'electric', false),
  ('audi', 'a1', 'A1', 'A1', 'hatchback', 'luxury', false), ('audi', 'a3', 'A3', 'A3', 'hatchback', 'luxury', true),
  ('audi', 'a4', 'A4', 'A4', 'sedan', 'luxury', true), ('audi', 'a6', 'A6', 'A6', 'sedan', 'luxury', false),
  ('audi', 'q2', 'Q2', 'Q2', 'crossover', 'luxury', true), ('audi', 'q3', 'Q3', 'Q3', 'suv', 'luxury', true),
  ('audi', 'q5', 'Q5', 'Q5', 'suv', 'luxury', false), ('audi', 'q7', 'Q7', 'Q7', 'suv', 'luxury', false),
  ('audi', 'e-tron', 'e-tron', 'e-tron', 'suv', 'electric', false), ('audi', 'q4-e-tron', 'Q4 e-tron', 'Q4 e-tron', 'suv', 'electric', false),
  ('volvo', 'xc40', 'XC40', 'XC40', 'crossover', 'luxury', true), ('volvo', 'xc60', 'XC60', 'XC60', 'suv', 'luxury', true),
  ('volvo', 'xc90', 'XC90', 'XC90', 'suv', 'luxury', false), ('volvo', 's60', 'S60', 'S60', 'sedan', 'luxury', false),
  ('volvo', 'v60', 'V60', 'V60', 'station_wagon', 'luxury', false), ('volvo', 'c40', 'C40', 'C40', 'crossover', 'electric', false),
  ('volvo', 'ex30', 'EX30', 'EX30', 'crossover', 'electric', false),
  ('lexus', 'ux', 'UX', 'UX', 'crossover', 'luxury', false), ('lexus', 'nx', 'NX', 'NX', 'suv', 'luxury', true),
  ('lexus', 'rx', 'RX', 'RX', 'suv', 'luxury', false), ('lexus', 'es', 'ES', 'ES', 'sedan', 'luxury', false), ('lexus', 'is', 'IS', 'IS', 'sedan', 'luxury', false),
  ('subaru', 'impreza', 'אימפרזה', 'Impreza', 'hatchback', 'family', false), ('subaru', 'xv', 'XV', 'XV', 'crossover', 'suv', true),
  ('subaru', 'forester', 'פורסטר', 'Forester', 'suv', 'suv', true), ('subaru', 'outback', 'אאוטבק', 'Outback', 'station_wagon', 'suv', false),
  ('subaru', 'b4', 'B4', 'B4', 'sedan', 'family', false), ('subaru', 'crosstrek', 'קרוסטרק', 'Crosstrek', 'crossover', 'suv', false),
  ('mini', 'cooper', 'קופר', 'Cooper', 'hatchback', 'luxury', true), ('mini', 'countryman', 'קאנטרימן', 'Countryman', 'crossover', 'luxury', false),
  ('mini', 'clubman', 'קלאבמן', 'Clubman', 'station_wagon', 'luxury', false),
  ('jeep', 'renegade', 'רנגייד', 'Renegade', 'crossover', 'suv', true), ('jeep', 'compass', 'קומפאס', 'Compass', 'suv', 'suv', true),
  ('jeep', 'cherokee', 'צ''רוקי', 'Cherokee', 'suv', 'suv', false), ('jeep', 'grand-cherokee', 'גרנד צ''רוקי', 'Grand Cherokee', 'suv', 'suv', false),
  ('jeep', 'wrangler', 'רנגלר', 'Wrangler', 'suv', 'suv', false), ('jeep', 'avenger', 'אוונג''ר', 'Avenger', 'crossover', 'suv', false),
  ('land-rover', 'range-rover-evoque', 'ריינג'' רובר אווק', 'Range Rover Evoque', 'suv', 'luxury', false), ('land-rover', 'discovery-sport', 'דיסקברי ספורט', 'Discovery Sport', 'suv', 'luxury', false),
  ('land-rover', 'range-rover-velar', 'ריינג'' רובר ולאר', 'Range Rover Velar', 'suv', 'luxury', false), ('land-rover', 'defender', 'דיפנדר', 'Defender', 'suv', 'luxury', false),
  ('jaguar', 'e-pace', 'E-Pace', 'E-Pace', 'suv', 'luxury', false), ('jaguar', 'f-pace', 'F-Pace', 'F-Pace', 'suv', 'luxury', false), ('jaguar', 'i-pace', 'I-Pace', 'I-Pace', 'suv', 'electric', false),
  ('porsche', 'macan', 'מקאן', 'Macan', 'suv', 'luxury', false), ('porsche', 'cayenne', 'קאיין', 'Cayenne', 'suv', 'luxury', false),
  ('porsche', 'taycan', 'טייקאן', 'Taycan', 'sedan', 'electric', false), ('porsche', '911', '911', '911', 'coupe', 'luxury', false),
  ('alfa-romeo', 'giulietta', 'ג''ולייטה', 'Giulietta', 'hatchback', 'luxury', false), ('alfa-romeo', 'giulia', 'ג''וליה', 'Giulia', 'sedan', 'luxury', false),
  ('alfa-romeo', 'stelvio', 'סטלביו', 'Stelvio', 'suv', 'luxury', false), ('alfa-romeo', 'tonale', 'טונאלה', 'Tonale', 'crossover', 'luxury', false),
  ('smart', 'fortwo', 'פורטו', 'Fortwo', 'hatchback', 'city', false), ('smart', 'hashtag-1', '#1', '#1', 'crossover', 'electric', false),
  ('isuzu', 'd-max', 'D-Max', 'D-Max', 'pickup', 'suv', false), ('ssangyong', 'tivoli', 'טיבולי', 'Tivoli', 'crossover', 'suv', false),
  ('ssangyong', 'korando', 'קורנדו', 'Korando', 'suv', 'suv', false), ('ssangyong', 'rexton', 'רקסטון', 'Rexton', 'suv', 'suv', false),
  ('ssangyong', 'torres', 'טורס', 'Torres', 'suv', 'suv', false),
  ('infiniti', 'q50', 'Q50', 'Q50', 'sedan', 'luxury', false), ('infiniti', 'qx50', 'QX50', 'QX50', 'suv', 'luxury', false),
  ('lancia', 'ypsilon', 'איפסילון', 'Ypsilon', 'hatchback', 'city', false), ('daihatsu', 'sirion', 'סיריון', 'Sirion', 'hatchback', 'city', false),
  ('lada', 'niva', 'ניבה', 'Niva', 'suv', 'suv', false)
) as v(make, slug, he, en, body, cat, pop)
join public.vehicle_makes m on m.slug = v.make
on conflict (make_id, slug) do nothing;

# Onyxa

**[العربية](#العربية) | [English](#english)**

---

## English

Onyxa is a lightweight, bilingual (Arabic / English, RTL-first) web app that lets you deploy websites to **GitHub Pages** straight from your browser, using your own GitHub token. No backend, no build step, no dependencies — plain HTML, CSS and vanilla JavaScript.

### Features
- Multi-account support
- Optional PIN lock with AES-GCM encryption of stored data
- Deploy wizard (create repo, upload files, enable Pages)
- File manager (add, edit, delete files and folders)
- ZIP import
- Live preview
- Build monitoring
- Restore previous versions
- Light / dark theme

### Run it
Open `index.html` in a browser, or serve the folder with any static server:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

### Host it on GitHub Pages
1. Push this repository to GitHub.
2. Go to **Settings → Pages**.
3. Under *Build and deployment*, choose **Deploy from a branch**, branch `main`, folder `/ (root)`.
4. Your app will be live at `https://<username>.github.io/<repo>/`.

### Security notes
- Everything runs locally in your browser. Your token is sent only to `api.github.com`.
- Use a **fine-grained personal access token** limited to the repositories you need (Contents and Pages read/write).
- Enable the PIN lock to encrypt the stored token on your device.
- Do not use Onyxa on a shared or untrusted computer.

### Project structure
```
index.html        # markup entry point
css/style.css     # styles
js/app.js         # application logic
assets/logo.png   # logo / favicon
```

### Contributing
Issues and pull requests are welcome.

### License
[MIT](LICENSE)

---

## العربية

**Onyxa** تطبيق ويب خفيف وثنائي اللغة (عربي / إنجليزي) لنشر مواقعك على **GitHub Pages** مباشرة من المتصفح باستخدام توكن حسابك الخاص. بدون خادم، وبدون خطوات بناء، وبدون مكتبات — HTML وCSS وJavaScript فقط.

### المميزات
- دعم عدة حسابات
- قفل PIN اختياري مع تشفير AES-GCM للبيانات المحفوظة
- معالج نشر خطوة بخطوة
- مدير ملفات
- استيراد ملفات ZIP
- معاينة مباشرة
- متابعة حالة البناء
- استرجاع النسخ السابقة
- وضع فاتح / داكن

### التشغيل
افتح `index.html` في المتصفح، أو شغّل خادمًا ثابتًا:

```bash
python3 -m http.server 8080
```

### الاستضافة على GitHub Pages
1. ارفع المشروع إلى مستودع على GitHub.
2. من **Settings → Pages** اختر **Deploy from a branch** ثم الفرع `main` والمجلد `/ (root)`.
3. سيعمل التطبيق على `https://<username>.github.io/<repo>/`.

### ملاحظات أمنية
- كل شيء يعمل محليًا في متصفحك، ويُرسل التوكن إلى `api.github.com` فقط.
- استخدم توكنًا **Fine-grained** محدود الصلاحيات (Contents وPages).
- فعّل قفل PIN لتشفير التوكن على جهازك.
- لا تستخدم التطبيق على جهاز مشترك أو غير موثوق.

### الترخيص
[MIT](LICENSE)

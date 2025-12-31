# دليل نشر المشروع على خادم خارجي (VPS)

## المتطلبات

- **Node.js** v20 أو أحدث
- **PostgreSQL** v14 أو أحدث
- **npm** أو **yarn**

## خطوات التثبيت

### 1. نقل الملفات

انسخ جميع ملفات المشروع إلى الخادم:
```bash
scp -r ./* user@your-server:/var/www/signage-app/
```

أو استخدم Git:
```bash
git clone your-repo-url /var/www/signage-app
cd /var/www/signage-app
```

### 2. تثبيت الاعتماديات

```bash
cd /var/www/signage-app
npm install
```

### 3. إعداد قاعدة البيانات

أنشئ قاعدة بيانات PostgreSQL:
```bash
sudo -u postgres psql
CREATE DATABASE signage_db;
CREATE USER signage_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE signage_db TO signage_user;
\q
```

### 4. إعداد متغيرات البيئة

أنشئ ملف `.env` في جذر المشروع:
```bash
DATABASE_URL=postgresql://signage_user:your_secure_password@localhost:5432/signage_db
SESSION_SECRET=your_random_session_secret_here_min_32_chars
NODE_ENV=production
PORT=5000
```

لإنشاء SESSION_SECRET عشوائي:
```bash
openssl rand -hex 32
```

### 5. تشغيل migrations قاعدة البيانات

```bash
npm run db:push
```

### 6. بناء المشروع

```bash
npm run build
```

### 7. تشغيل المشروع

للتشغيل المباشر:
```bash
npm run start
```

### 8. إعداد PM2 (موصى به للإنتاج)

تثبيت PM2:
```bash
npm install -g pm2
```

تشغيل التطبيق:
```bash
pm2 start dist/index.cjs --name "signage-app"
pm2 save
pm2 startup
```

### 9. إعداد Nginx كـ Reverse Proxy

أنشئ ملف تكوين Nginx:
```bash
sudo nano /etc/nginx/sites-available/signage-app
```

أضف المحتوى التالي:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 100M;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /uploads {
        alias /var/www/signage-app/public/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

تفعيل الموقع:
```bash
sudo ln -s /etc/nginx/sites-available/signage-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 10. إعداد SSL (HTTPS)

باستخدام Certbot:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## الملفات المهمة

- `dist/` - ملفات الإنتاج بعد البناء
- `public/uploads/` - ملفات الوسائط المرفوعة
- `.env` - متغيرات البيئة (لا ترفعه لـ Git)

## أوامر مفيدة

```bash
# عرض حالة التطبيق
pm2 status

# عرض السجلات
pm2 logs signage-app

# إعادة تشغيل التطبيق
pm2 restart signage-app

# إيقاف التطبيق
pm2 stop signage-app
```

## النسخ الاحتياطي

### نسخ قاعدة البيانات
```bash
pg_dump -U signage_user signage_db > backup_$(date +%Y%m%d).sql
```

### نسخ ملفات الوسائط
```bash
tar -czvf uploads_backup_$(date +%Y%m%d).tar.gz public/uploads/
```

## استكشاف الأخطاء

1. **خطأ في الاتصال بقاعدة البيانات**: تأكد من صحة DATABASE_URL
2. **خطأ في الجلسات**: تأكد من وجود SESSION_SECRET
3. **الملفات لا تُرفع**: تأكد من صلاحيات مجلد uploads
   ```bash
   chmod -R 755 public/uploads
   ```

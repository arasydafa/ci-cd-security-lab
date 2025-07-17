# 🛡️ CI/CD Security Lab: Simulasi Malicious Pull Request Injection

Repositori ini adalah lab hands-on untuk memahami bagaimana **pull request berbahaya (malicious PR)** dapat mengeksploitasi pipeline CI/CD yang tidak aman. Skenario disusun seperti serangan *APT-style* dengan 5 tahap: recon, credential theft, persistence, supply chain injection, dan exfiltration.

---

## 📁 Struktur Direktori

```bash
.
├── .github
│   └── workflows
│       ├── secure-deploy.yml          # pipeline aman (produk siap rilis)
│       ├── insecure-deploy.yml        # pipeline tidak aman (simulasi buruk)
│       ├── malicious-pr.yml           # workflow serangan PR jahat (APT-style)
│       └── pr-scan.yml                # workflow keamanan untuk PR masuk
├── .env.example                       # template env file (jangan commit asli)
├── src
│   └── index.js                       # file utama, target injeksi malicious PR
├── package.json
├── package-lock.json
└── README.md                          # dokumentasi lab
```

---

## 🔥 malicious-pr.yml — Simulasi Serangan APT

Workflow ini otomatis jalan saat ada pull request ke `main`. Berisi 5 tahap serangan:

1. **Initial Recon**
   Enumerasi environment, list file di repo, lihat konfigurasi pipeline.
2. **Credential Harvesting**
   Mencoba mencari AWS Key, `.env`, `.npmrc`, `.ssh`, hardcoded secret.
3. **Persistence & Backdoor**
   Membuat direktori tersembunyi dan skrip cron untuk persistensi.
4. **Supply Chain Attack**
   Menyuntik kode berbahaya ke `src/index.js`.
5. **Advanced Persistent Threat**
   Mengirim hasil payload ke server eksternal (exfiltration).

---

## ✅ secure-deploy.yml — Pipeline Aman

Praktik terbaik di pipeline ini:

* Menggunakan `secrets` dari GitHub, bukan hardcoded.
* Membagi job `build` dan `deploy`.
* Menggunakan `upload-artifact` dan `download-artifact` alih-alih langsung deploy.
* Membatasi `permissions` (`id-token: write`, bukan full write).
* Tidak berjalan pada PR tanpa persetujuan.

---

## 🚨 insecure-deploy.yml — Pipeline Tidak Aman

Contoh pipeline yang **rentan**:

* Hardcoded secrets (`AWS_ACCESS_KEY_ID` langsung di file).
* Tidak membatasi permission (`permissions: write-all`).
* Tidak ada pengecekan siapa yang trigger PR atau push.
* Tidak ada pemisahan build/deploy (semuanya dalam satu job).

---

## 🔐 pr-scan.yml — PR Workflow Aman

Workflow ini hanya berjalan untuk *memeriksa* PR (tidak menjalankan build/deploy):

* Membaca metadata PR (author, judul).
* Menggunakan `codeql` untuk analisa kode PR.
* Tidak punya akses ke secrets atau environment sensitif.
* Ditujukan sebagai pertahanan terhadap supply chain attack via PR.

---

## 🧺 .env

Contoh isi file `.env` **(tidak disertakan ke GitHub)**:

```env
AWS_ACCESS_KEY_ID=your_production_key
AWS_SECRET_ACCESS_KEY=your_secret_key
API_TOKEN=your_token
```

Penting:

* File `.env` **tidak boleh di-commit**.
* Gunakan `.gitignore` untuk memastikan file ini tidak bocor.
* Hanya gunakan saat development/testing lokal.

---

## ✅ Checklist Simulasi Lab

| Langkah                                                                | Status |
| ---------------------------------------------------------------------- | ------ |
| 🔲 Fork repositori ini ke akun pribadi                                 |        |
| 🔲 Pastikan workflow `malicious-pr.yml` **tidak aktif otomatis**       |        |
| 🔲 Simulasikan pull request dari attacker branch                       |        |
| 🔲 Review output tiap tahap (recon, creds, backdoor, injection, exfil) |        |
| 🔲 Bandingkan dengan secure workflow (`secure-deploy.yml`)             |        |
| 🔲 Cek log PR scan dari `pr-scan.yml`                                  |        |
| 🔲 Pastikan tidak ada hardcoded secret di repo                         |        |
| 🔲 Terapkan secrets hanya via GitHub Secrets                           |        |
| 🔲 Simulasikan review PR oleh maintainer sebelum merge                 |        |
| 🔲 Implementasikan approval branch protection untuk `main`             |        |

---

## 🧠 Pembelajaran Utama

* Serangan supply chain bisa masuk lewat PR jika pipeline tidak aman.
* Rahasia (secrets) harus disimpan di tempat aman (GitHub Secrets, HSM).
* Jangan biarkan PR otomatis menjalankan kode tanpa review.
* Minimal permissions = prinsip `least privilege`.
* Pisahkan `build`, `scan`, `deploy` = harden pipeline.

---

## 🛠️ Tools Terkait (opsional)

* `CodeQL`: analisis statis PR
* `actions/upload-artifact`: simpan hasil build
* `dotenv`: untuk handle .env lokal (jangan di CI!)
* `act`: jalankan GitHub Actions secara lokal

---

## 📌 Referensi

* [GitHub Actions Security Best Practices](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
* [OWASP Top 10 CI/CD Security Risks](https://owasp.org/www-project-cicd-security/)
* [Secure Workflows using Environment Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

---

Created by [@arasydafa](https://github.com/arasydafa) — for educational purposes only 🧪🛡️

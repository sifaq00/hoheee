# Bullseye — Brief Konsep

**Versi:** Draft 1
**Untuk:** Developer
**Status:** Konsep, belum mulai build

---

## 1. Ringkasan Satu Paragraf

Bullseye adalah alat riset token Solana yang menjalankan "tim analis AI" untuk satu token. Alih-alih memberi satu skor cepat, sistem menjalankan beberapa agent dengan peran berbeda — analis on-chain, analis sentimen, analis teknikal, analis berita — yang hasilnya diperdebatkan oleh dua pihak (sisi optimis dan sisi skeptis), lalu ditinjau tim risiko sebelum keluar kesimpulan akhir. Outputnya bukan sinyal beli-jual satu baris, tapi laporan riset yang bisa dibaca, disimpan, dan dibagikan.

---

## 2. Masalah yang Dipecahkan

Alat riset token yang ada sekarang terbagi dua, dan keduanya punya lubang:

- **Scanner cepat** memberi skor merah/hijau dalam hitungan detik. Cepat, tapi dangkal — tidak menjelaskan *kenapa*, dan tidak mempertimbangkan konteks pasar atau sentimen.
- **Riset manual** mendalam, tapi makan waktu berjam-jam dan butuh keahlian yang tidak semua orang punya.

Bullseye mengisi ruang di tengah: riset yang cukup dalam untuk dipercaya sebelum entry besar, tapi selesai dalam hitungan menit.

---

## 3. Siapa Penggunanya

Orang yang akan menaruh uang dalam jumlah yang bikin dia mikir dua kali. Bukan pemain scalping yang buka-tutup posisi puluhan kali sehari — mereka butuh kecepatan, bukan kedalaman.

Ciri pengguna target:
- Sudah paham dasar crypto, tapi tidak punya waktu atau alat untuk riset menyeluruh
- Melakukan riset sebelum entry, bukan setelah
- Menghargai argumen dua sisi, bukan cuma konfirmasi

---

## 4. Cara Kerja dari Sisi Pengguna

Alurnya sederhana:

1. Pengguna menghubungkan wallet
2. Pengguna memasukkan alamat kontrak token
3. Sistem mulai bekerja — pengguna melihat prosesnya berjalan, bukan layar loading
4. Selesai dalam beberapa menit, muncul laporan lengkap
5. Laporan tersimpan permanen dan punya link yang bisa dibagikan

**Proses yang terlihat adalah bagian dari produknya.** Pengguna harus bisa melihat tiap analis "berbicara" satu per satu, lalu melihat perdebatan antara sisi optimis dan skeptis berlangsung. Ini yang membuat orang mau menunggu, dan ini yang membuat hasilnya terasa bisa dipercaya — karena mereka melihat argumennya, bukan cuma kesimpulannya.

---

## 5. Struktur Tim Agent

Sistemnya meniru cara firma trading sungguhan bekerja. Ada empat lapis:

**Lapis 1 — Tim Analis.** Empat agent bekerja paralel, masing-masing dari sudut berbeda:
- *Analis on-chain* — melihat sebaran holder, konsentrasi wallet besar, status likuiditas, kewenangan kontrak, umur token
- *Analis teknikal* — pola harga, volume, momentum
- *Analis sentimen* — pembicaraan di media sosial, tingkat hype, apakah organik atau dibayar
- *Analis berita* — pengumuman listing, aktivitas tim, kejadian terkait

**Lapis 2 — Perdebatan.** Dua agent membaca semua laporan analis, lalu berdebat beberapa ronde. Satu membangun argumen kenapa ini peluang bagus, satu lagi membongkar kelemahannya. Keduanya harus merujuk data dari lapis 1, tidak boleh berargumen kosong.

**Lapis 3 — Tim Risiko.** Meninjau hasil debat khusus dari sisi risiko: seberapa tipis likuiditasnya, seberapa besar slippage kalau keluar, seberapa cepat harga bisa runtuh, apakah ada jalur rug yang belum tertutup.

**Lapis 4 — Keputusan Akhir.** Satu agent menyimpulkan semuanya jadi rekomendasi dengan tingkat keyakinan dan alasan yang jelas.

---

## 6. Bentuk Output

Yang dilihat pengguna di akhir:

- **Kesimpulan** — rekomendasi, tingkat keyakinan, dan ringkasan alasan
- **Peringatan risiko utama** — hal-hal yang paling perlu diwaspadai, ditaruh di atas
- **Laporan tiap analis** — bisa dibuka satu per satu
- **Transkrip perdebatan** — argumen kedua sisi, ronde per ronde
- **Catatan tim risiko**

Semua laporan tersimpan di riwayat pengguna dan punya halaman sendiri yang bisa dibagikan.

---

## 7. Yang Membedakan dari Alat Lain

- **Argumen dua sisi.** Hampir semua alat crypto bias ke satu arah. Bullseye secara struktural memaksa ada pihak yang mencari kelemahan.
- **Prosesnya terbuka.** Pengguna melihat cara sistem sampai ke kesimpulan, bukan cuma hasil dari kotak hitam.
- **Hasilnya jadi konten.** Setiap laporan adalah halaman yang layak dibagikan. Ini sekaligus jalur pertumbuhan produknya.
- **Dibangun khusus untuk Solana**, bukan alat saham yang dipaksa dipakai untuk crypto.

---

## 8. Prinsip Desain

- **Kepercayaan datang dari transparansi.** Kalau sistem bilang sesuatu berisiko, harus jelas terlihat data mana yang jadi dasarnya.
- **Jangan berpura-pura pasti.** Output harus menyampaikan tingkat keyakinan secara jujur, termasuk saat datanya tidak cukup.
- **Menunggu harus terasa berharga.** Kalau pengguna menunggu beberapa menit, tiap detiknya harus ada sesuatu yang bergerak dan menarik dibaca.
- **Ini alat riset, bukan nasihat keuangan.** Bahasa produk harus konsisten memposisikannya sebagai alat bantu analisis.

---

## 9. Batasan yang Disadari Sejak Awal

Ini bukan kelemahan yang harus ditutupi, tapi harus dikomunikasikan jelas ke pengguna:

- Satu analisis butuh beberapa menit — ini bukan alat untuk keputusan detik-detikan
- Setiap analisis punya biaya nyata, jadi tidak bisa dipakai tanpa batas
- Kualitas analisis bergantung pada kualitas data yang tersedia; token yang sangat baru punya jejak data tipis
- Sistem bisa salah, dan produknya harus jujur soal itu

---

## 10. Tahapan Pengembangan

**Tahap 1 — Buktikan analisisnya bagus.** Sebelum menyentuh tampilan, pastikan sistem menghasilkan analisis yang benar-benar berguna untuk token Solana. Diuji secara internal dulu, tanpa antarmuka.

**Tahap 2 — Bangun antarmuka web.** Setelah analisisnya terbukti, baru bangun tampilan dengan fokus utama pada pengalaman melihat proses berjalan.

**Tahap 3 — Sistem akses dan berbagi.** Wallet login, sistem kredit, halaman laporan publik.

Urutan ini penting. Antarmuka bagus di atas analisis yang lemah akan gagal; analisis kuat dengan antarmuka sederhana masih bisa dipakai orang.

---

## 11. Ukuran Keberhasilan Awal

- Apakah pengguna membaca laporannya sampai selesai, atau cuma lihat kesimpulan lalu pergi?
- Apakah ada yang membagikan halaman laporan tanpa diminta?
- Apakah pengguna yang sama kembali untuk token kedua?

Kalau ketiganya jawabannya ya, produknya berjalan.

---

## Catatan Lisensi

Fondasi sistem ini dibangun di atas riset multi-agent trading yang bersifat open source dengan lisensi terbuka. Boleh dikembangkan dan dikomersialkan, dengan syarat atribusi ke karya aslinya tetap dicantumkan.

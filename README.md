# PharmTracker - Monitorizare Prețuri Farmacii

Aplicație web pentru monitorizarea și compararea prețurilor produselor farmaceutice din România.

## Funcționalități

- 📊 **Dashboard** - Tabel comparativ cu prețurile de la toate farmaciile
- 📦 **Gestiune Produse** - Adaugă/editează produse și URL-uri
- 🏪 **Gestiune Retaileri** - Adaugă/editează farmacii
- 📈 **Istoric Prețuri** - Grafice cu evoluția prețurilor în timp
- 📥 **Export Excel** - Descarcă datele în format Excel
- ⏰ **Scraping Automat** - Rulare zilnică la ora 23:00

## Cerințe

- Node.js 18+
- Cont Supabase (gratuit)
- Cont Vercel (gratuit)

## Instalare Locală

### 1. Clonează proiectul

```bash
git clone https://github.com/YOUR_USERNAME/pharmacy-tracker.git
cd pharmacy-tracker
```

### 2. Instalează dependențele

```bash
npm install
```

### 3. Configurează variabilele de mediu

Copiază fișierul `.env.example` în `.env.local`:

```bash
cp .env.example .env.local
```

Editează `.env.local` și completează valorile:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CRON_SECRET=your-secret-key
```

### 4. Pornește serverul de dezvoltare

```bash
npm run dev
```

Deschide [http://localhost:3000](http://localhost:3000) în browser.

## Deploy pe Vercel

### 1. Creează repository pe GitHub

1. Mergi pe [github.com/new](https://github.com/new)
2. Nume: `pharmacy-tracker`
3. Click "Create repository"

### 2. Încarcă codul pe GitHub

```bash
cd pharmacy-tracker
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/pharmacy-tracker.git
git push -u origin main
```

### 3. Deploy pe Vercel

1. Mergi pe [vercel.com/new](https://vercel.com/new)
2. Importă repository-ul `pharmacy-tracker`
3. Adaugă variabilele de mediu:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CRON_SECRET`
4. Click "Deploy"

### 4. Activează Cron Job

Cron job-ul este configurat în `vercel.json` să ruleze zilnic la 21:00 UTC (23:00 ora României).

## Utilizare

### Adăugare Retailer

1. Mergi la pagina "Retaileri"
2. Click "Adaugă Retailer"
3. Completează numele și website-ul

### Adăugare Produs

1. Mergi la pagina "Produse"
2. Click "Adaugă Produs"
3. Completează numele și EAN-ul (opțional)
4. După salvare, click pe iconița de link pentru a adăuga URL-uri

### Adăugare URL Produs

1. Pe pagina "Produse", găsește produsul
2. Click pe iconița de link (🔗)
3. Selectează retailerul și lipește URL-ul produsului
4. Repetă pentru fiecare farmacie

### Rulare Manuală Scraper

1. Mergi la pagina "Loguri & Erori"
2. Click "Rulează Scraper Manual"

## Structura Proiectului

```
pharmacy-tracker/
├── src/
│   ├── app/                    # Pagini Next.js
│   │   ├── api/                # API Routes
│   │   ├── products/           # Pagina Produse
│   │   ├── retailers/          # Pagina Retaileri
│   │   ├── history/            # Pagina Istoric
│   │   └── logs/               # Pagina Loguri
│   ├── components/             # Componente React
│   │   ├── ui/                 # Componente de bază
│   │   ├── layout/             # Layout (Sidebar, Header)
│   │   └── dashboard/          # Componente Dashboard
│   ├── lib/
│   │   ├── supabase/           # Client Supabase
│   │   └── scraper/            # Logica de scraping
│   └── types/                  # TypeScript types
├── vercel.json                 # Configurare Cron
└── .env.local                  # Variabile de mediu
```

## Troubleshooting

### Eroare "Cannot find module"
```bash
npm install
```

### Eroare la conectare Supabase
- Verifică că variabilele de mediu sunt corecte
- Verifică că tabelele sunt create în baza de date

### Scraper-ul nu găsește prețuri
- Verifică că URL-ul produsului este corect
- Verifică selectoarele CSS în parser
- Unele site-uri pot bloca scraping-ul

## Licență

MIT

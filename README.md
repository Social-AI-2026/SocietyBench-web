# SocietyBench — Project Page

Static landing page for **SocietyBench**, a benchmark for forecasting counterfactual social-world evolution.

🌐 **Live site:** https://zhenran-wang.github.io/societybench-web/

## Stack

Plain HTML / CSS / vanilla JS. No build step.

```
site/
├── index.html              # Main page
├── styles.css              # Brutalist sky-blue theme
├── app.js                  # Routing + interactive demo
├── network-animation.js    # Background floating-node network
├── crowd-animation.js      # Walking crowd at the page bottom
├── figures/                # Paper figures + crowd PNGs
└── *.json                  # Leaderboard / demo data
```

## Local preview

```bash
cd site/
python3 -m http.server 8000
# open http://localhost:8000
```

## License

- **Code:** MIT
- **Data / figures:** CC-BY-NC 4.0
